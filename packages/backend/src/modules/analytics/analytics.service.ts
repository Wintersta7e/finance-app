import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import {
  MonthSummaryDto,
  CategoryBreakdownDto,
  NetWorthPointDto,
  BudgetVsActualDto,
  RecurringCostSummaryDto,
} from './dto';

@Injectable()
export class AnalyticsService {
  private static readonly MAX_NET_WORTH_DAYS = 365;

  constructor(private prisma: PrismaService) {}

  async getMonthSummary(year: number, month: number): Promise<MonthSummaryDto> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const transactions = await this.prisma.transaction.findMany({
      where: {
        deletedAt: null,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    let totalIncome = 0;
    let fixedCosts = 0;
    let variableExpenses = 0;

    for (const tx of transactions) {
      const amount = this.toNumber(tx.amount);
      switch (tx.type) {
        case 'INCOME':
          totalIncome += amount;
          break;
        case 'FIXED_COST':
          fixedCosts += Math.abs(amount);
          break;
        case 'VARIABLE_EXPENSE':
          variableExpenses += Math.abs(amount);
          break;
        // TRANSFER transactions are ignored in summary
      }
    }

    const savings = totalIncome - fixedCosts - variableExpenses;
    const endBalance = await this.calculateBalanceUpTo(endDate);

    return {
      totalIncome,
      fixedCosts,
      variableExpenses,
      savings,
      endBalance,
    };
  }

  async getCategoryBreakdown(year: number, month: number): Promise<CategoryBreakdownDto[]> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const transactions = await this.prisma.transaction.findMany({
      where: {
        deletedAt: null,
        date: {
          gte: startDate,
          lte: endDate,
        },
        amount: {
          lt: 0, // Only expenses (negative amounts)
        },
      },
      include: {
        category: true,
      },
    });

    // Group by category (skip uncategorized - matches Java behavior)
    const categoryMap = new Map<number, { name: string; amount: number }>();

    for (const tx of transactions) {
      // Skip transactions without a category (matches Java behavior)
      if (!tx.categoryId || !tx.category) {
        continue;
      }

      const categoryId = tx.categoryId;
      const categoryName = tx.category.name;
      const amount = Math.abs(this.toNumber(tx.amount));

      if (categoryMap.has(categoryId)) {
        categoryMap.get(categoryId)!.amount += amount;
      } else {
        categoryMap.set(categoryId, { name: categoryName, amount });
      }
    }

    return Array.from(categoryMap.entries()).map(([categoryId, { name, amount }]) => ({
      categoryId,
      categoryName: name,
      amount,
    }));
  }

  async getNetWorthTrend(from: Date, to: Date): Promise<NetWorthPointDto[]> {
    // Limit date range to prevent excessive queries
    const daysDiff = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const effectiveDays = Math.min(daysDiff, AnalyticsService.MAX_NET_WORTH_DAYS);

    // If range exceeds max, sample dates evenly
    const points: NetWorthPointDto[] = [];
    const step = daysDiff > AnalyticsService.MAX_NET_WORTH_DAYS
      ? daysDiff / AnalyticsService.MAX_NET_WORTH_DAYS
      : 1;

    for (let i = 0; i < effectiveDays; i++) {
      const dayOffset = Math.floor(i * step);
      const date = new Date(from);
      date.setDate(date.getDate() + dayOffset);
      date.setHours(23, 59, 59, 999);

      const balance = await this.calculateBalanceUpTo(date);
      points.push({
        date: this.formatDate(date),
        balance,
      });
    }

    return points;
  }

  async getBudgetVsActual(year: number, month: number): Promise<BudgetVsActualDto[]> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // Get transactions for the month (expenses only)
    const transactions = await this.prisma.transaction.findMany({
      where: {
        deletedAt: null,
        date: {
          gte: startDate,
          lte: endDate,
        },
        amount: {
          lt: 0,
        },
      },
      include: {
        category: true,
      },
    });

    // Get active budgets for this month
    // Active if: effectiveFrom <= endDate AND (effectiveTo is null OR effectiveTo >= startDate)
    const budgets = await this.prisma.budget.findMany({
      where: {
        deletedAt: null,
        effectiveFrom: {
          lte: endDate,
        },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: startDate } },
        ],
      },
      include: {
        category: true,
      },
    });

    // Sum spending by category
    const spendingByCategory = new Map<number, number>();
    for (const tx of transactions) {
      if (tx.categoryId) {
        const current = spendingByCategory.get(tx.categoryId) || 0;
        spendingByCategory.set(tx.categoryId, current + Math.abs(this.toNumber(tx.amount)));
      }
    }

    // Build result: only include categories that have budgets
    return budgets.map((budget) => ({
      categoryId: budget.categoryId,
      categoryName: budget.category.name,
      budgeted: this.toNumber(budget.amount),
      actual: spendingByCategory.get(budget.categoryId) || 0,
    }));
  }

  async getRecurringCostSummary(): Promise<RecurringCostSummaryDto> {
    // Use month boundaries like Java implementation
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

    // Get active EXPENSE recurring rules for current month
    // Active if: startDate <= monthEnd AND (endDate is null OR endDate >= monthStart)
    const rules = await this.prisma.recurringRule.findMany({
      where: {
        deletedAt: null,
        direction: 'EXPENSE',
        startDate: {
          lte: monthEnd,
        },
        OR: [
          { endDate: null },
          { endDate: { gte: monthStart } },
        ],
      },
    });

    let monthlyTotal = 0;

    for (const rule of rules) {
      const amount = this.toNumber(rule.amount);
      switch (rule.period) {
        case 'DAILY':
          monthlyTotal += amount * 30;
          break;
        case 'WEEKLY':
          monthlyTotal += amount * 4;
          break;
        case 'MONTHLY':
          monthlyTotal += amount;
          break;
        case 'YEARLY':
          monthlyTotal += amount / 12;
          break;
      }
    }

    return { monthlyTotal };
  }

  async calculateBalanceUpTo(date: Date): Promise<number> {
    // Get sum of all initial balances (non-deleted accounts)
    const accounts = await this.prisma.account.findMany({
      where: { deletedAt: null },
    });

    let initialTotal = 0;
    for (const account of accounts) {
      initialTotal += this.toNumber(account.initialBalance);
    }

    // Get sum of all transactions up to date
    const result = await this.prisma.transaction.aggregate({
      where: {
        deletedAt: null,
        date: {
          lte: date,
        },
      },
      _sum: {
        amount: true,
      },
    });

    const transactionSum = result._sum.amount ? this.toNumber(result._sum.amount) : 0;

    return initialTotal + transactionSum;
  }

  private toNumber(value: Decimal | number | null): number {
    if (value === null) return 0;
    if (typeof value === 'number') return value;
    return value.toNumber();
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}
