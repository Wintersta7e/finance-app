import { Injectable, BadRequestException } from '@nestjs/common';
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
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 1) - 1);

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
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 1) - 1);

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
    if (to < from) {
      throw new BadRequestException('to must be on or after from');
    }

    // Limit date range to prevent excessive queries
    const daysDiff = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const effectiveDays = Math.min(daysDiff, AnalyticsService.MAX_NET_WORTH_DAYS);

    // If range exceeds max, sample dates evenly
    const step = daysDiff > AnalyticsService.MAX_NET_WORTH_DAYS
      ? daysDiff / AnalyticsService.MAX_NET_WORTH_DAYS
      : 1;

    // Build the list of sample dates
    const sampleDates: Date[] = [];
    for (let i = 0; i < effectiveDays; i++) {
      const dayOffset = Math.floor(i * step);
      const date = new Date(from);
      date.setUTCDate(date.getUTCDate() + dayOffset);
      date.setUTCHours(23, 59, 59, 999);
      sampleDates.push(date);
    }

    if (sampleDates.length === 0) {
      return [];
    }

    // 1. Fetch initial balance sum once (all non-deleted accounts)
    const accounts = await this.prisma.account.findMany({
      where: { deletedAt: null },
    });
    let initialTotal = 0;
    for (const account of accounts) {
      initialTotal += this.toNumber(account.initialBalance);
    }

    // 2. Fetch the cumulative transaction sum up to the day before the first sample date
    const firstDate = sampleDates[0];
    const dayBeforeFirst = new Date(firstDate);
    dayBeforeFirst.setUTCDate(dayBeforeFirst.getUTCDate() - 1);
    dayBeforeFirst.setUTCHours(23, 59, 59, 999);

    const priorResult = await this.prisma.transaction.aggregate({
      where: {
        deletedAt: null,
        type: { not: 'TRANSFER' },
        date: { lte: dayBeforeFirst },
      },
      _sum: { amount: true },
    });
    let runningBalance = initialTotal + (priorResult._sum.amount ? this.toNumber(priorResult._sum.amount) : 0);

    // 3. Single query: all transactions in the full sample range, ordered by date
    const lastDate = sampleDates[sampleDates.length - 1];
    const rangeTransactions = await this.prisma.transaction.findMany({
      where: {
        deletedAt: null,
        type: { not: 'TRANSFER' },
        date: { gt: dayBeforeFirst, lte: lastDate },
      },
      select: { date: true, amount: true },
      orderBy: { date: 'asc' },
    });

    // 4. Walk sample dates and transactions together, accumulating balance
    const points: NetWorthPointDto[] = [];
    let txIdx = 0;

    for (const sampleDate of sampleDates) {
      // Add all transactions up to and including this sample date
      while (txIdx < rangeTransactions.length && rangeTransactions[txIdx].date <= sampleDate) {
        runningBalance += this.toNumber(rangeTransactions[txIdx].amount);
        txIdx++;
      }

      points.push({
        date: this.formatDate(sampleDate),
        balance: runningBalance,
      });
    }

    return points;
  }

  async getBudgetVsActual(year: number, month: number): Promise<BudgetVsActualDto[]> {
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 1) - 1);

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
      categoryName: budget.category?.name ?? 'Unknown',
      budgeted: this.toNumber(budget.amount),
      actual: spendingByCategory.get(budget.categoryId) || 0,
    }));
  }

  async getRecurringCostSummary(): Promise<RecurringCostSummaryDto> {
    // Use month boundaries like Java implementation
    const today = new Date();
    const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
    const monthEnd = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1) - 1);

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
    const accountAgg = await this.prisma.account.aggregate({
      where: { deletedAt: null },
      _sum: { initialBalance: true },
    });
    const initialTotal = accountAgg._sum.initialBalance
      ? this.toNumber(accountAgg._sum.initialBalance)
      : 0;

    // Get sum of all non-transfer transactions up to date
    const result = await this.prisma.transaction.aggregate({
      where: {
        deletedAt: null,
        type: { not: 'TRANSFER' },
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
