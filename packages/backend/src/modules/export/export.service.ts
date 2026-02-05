import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface ExportData {
  version: string;
  exportedAt: string;
  data: {
    accounts: any[];
    categories: any[];
    transactions: any[];
    recurringRules: any[];
    budgets: any[];
    tags: any[];
    payees: any[];
    goals: any[];
    settings: any;
  };
}

export interface ImportSummary {
  imported: {
    accounts: number;
    categories: number;
    transactions: number;
    recurringRules: number;
    budgets: number;
    tags: number;
    payees: number;
    goals: number;
  };
}

export type ImportMode = 'replace' | 'merge';

const SUPPORTED_VERSIONS = ['1.0'];

@Injectable()
export class ExportService {
  constructor(private prisma: PrismaService) {}

  async exportJson(): Promise<ExportData> {
    const [
      accounts,
      categories,
      transactions,
      recurringRules,
      budgets,
      tags,
      payees,
      goals,
      settings,
    ] = await Promise.all([
      this.prisma.account.findMany({ where: { deletedAt: null } }),
      this.prisma.category.findMany({ where: { deletedAt: null } }),
      this.prisma.transaction.findMany({
        where: { deletedAt: null },
        include: {
          account: true,
          category: true,
          payee: true,
          tags: { include: { tag: true } },
        },
      }),
      this.prisma.recurringRule.findMany({
        where: { deletedAt: null },
        include: { account: true, category: true, payee: true },
      }),
      this.prisma.budget.findMany({
        where: { deletedAt: null },
        include: { category: true },
      }),
      this.prisma.tag.findMany({ where: { deletedAt: null } }),
      this.prisma.payee.findMany({ where: { deletedAt: null } }),
      this.prisma.savingsGoal.findMany({ where: { deletedAt: null } }),
      this.prisma.appSettings.findUnique({ where: { id: 1 } }),
    ]);

    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      data: {
        accounts,
        categories,
        transactions,
        recurringRules,
        budgets,
        tags,
        payees,
        goals,
        settings,
      },
    };
  }

  async exportTransactionsCsv(): Promise<string> {
    const transactions = await this.prisma.transaction.findMany({
      where: { deletedAt: null },
      include: { account: true, category: true, payee: true },
      orderBy: { date: 'desc' },
    });

    const headers = ['date', 'amount', 'type', 'account', 'category', 'payee', 'notes'];
    const rows = transactions.map((t) => {
      const date = t.date instanceof Date
        ? t.date.toISOString().split('T')[0]
        : String(t.date).split('T')[0];

      return [
        date,
        String(t.amount),
        t.type,
        t.account?.name || '',
        t.category?.name || '',
        t.payee?.name || '',
        t.notes || '',
      ].map(this.escapeCsvField).join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  private escapeCsvField(field: string): string {
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  }

  async importJson(data: ExportData, mode: ImportMode): Promise<ImportSummary> {
    this.validateImportData(data);

    if (mode !== 'replace' && mode !== 'merge') {
      throw new BadRequestException(`Invalid import mode: ${mode}. Must be 'replace' or 'merge'.`);
    }

    return this.prisma.$transaction(async (tx) => {
      const summary: ImportSummary = {
        imported: {
          accounts: 0,
          categories: 0,
          transactions: 0,
          recurringRules: 0,
          budgets: 0,
          tags: 0,
          payees: 0,
          goals: 0,
        },
      };

      if (mode === 'replace') {
        // Soft-delete all existing records in reverse dependency order
        const now = new Date();
        await tx.transactionTag.deleteMany({});
        await tx.transaction.updateMany({ where: { deletedAt: null }, data: { deletedAt: now } });
        await tx.recurringRule.updateMany({ where: { deletedAt: null }, data: { deletedAt: now } });
        await tx.budget.updateMany({ where: { deletedAt: null }, data: { deletedAt: now } });
        await tx.savingsGoal.updateMany({ where: { deletedAt: null }, data: { deletedAt: now } });
        await tx.tag.updateMany({ where: { deletedAt: null }, data: { deletedAt: now } });
        await tx.payee.updateMany({ where: { deletedAt: null }, data: { deletedAt: now } });
        await tx.category.updateMany({ where: { deletedAt: null }, data: { deletedAt: now } });
        await tx.account.updateMany({ where: { deletedAt: null }, data: { deletedAt: now } });
      }

      // Create ID mappings for replace mode
      const accountIdMap = new Map<number, number>();
      const categoryIdMap = new Map<number, number>();
      const tagIdMap = new Map<number, number>();
      const payeeIdMap = new Map<number, number>();

      // Import accounts
      for (const account of data.data.accounts || []) {
        const created = await tx.account.create({
          data: {
            name: account.name,
            type: account.type || 'CHECKING',
            initialBalance: account.initialBalance || 0,
            archived: account.archived || false,
          },
        });
        accountIdMap.set(account.id, created.id);
        summary.imported.accounts++;
      }

      // Import categories
      for (const category of data.data.categories || []) {
        const created = await tx.category.create({
          data: {
            name: category.name,
            kind: category.kind,
            fixedCost: category.fixedCost || false,
          },
        });
        categoryIdMap.set(category.id, created.id);
        summary.imported.categories++;
      }

      // Import tags
      for (const tag of data.data.tags || []) {
        const created = await tx.tag.create({
          data: {
            name: tag.name,
            color: tag.color,
          },
        });
        tagIdMap.set(tag.id, created.id);
        summary.imported.tags++;
      }

      // Import payees
      for (const payee of data.data.payees || []) {
        const created = await tx.payee.create({
          data: {
            name: payee.name,
            notes: payee.notes,
          },
        });
        payeeIdMap.set(payee.id, created.id);
        summary.imported.payees++;
      }

      // Import transactions with mapped IDs
      for (const transaction of data.data.transactions || []) {
        const accountId = accountIdMap.get(transaction.accountId) || transaction.accountId;
        const categoryId = transaction.categoryId
          ? (categoryIdMap.get(transaction.categoryId) || transaction.categoryId)
          : null;
        const payeeId = transaction.payeeId
          ? (payeeIdMap.get(transaction.payeeId) || transaction.payeeId)
          : null;

        await tx.transaction.create({
          data: {
            date: new Date(transaction.date),
            amount: transaction.amount,
            type: transaction.type,
            notes: transaction.notes,
            accountId,
            categoryId,
            payeeId,
          },
        });
        summary.imported.transactions++;
      }

      // Import recurring rules with mapped IDs
      for (const rule of data.data.recurringRules || []) {
        const accountId = accountIdMap.get(rule.accountId) || rule.accountId;
        const categoryId = rule.categoryId
          ? (categoryIdMap.get(rule.categoryId) || rule.categoryId)
          : null;
        const payeeId = rule.payeeId
          ? (payeeIdMap.get(rule.payeeId) || rule.payeeId)
          : null;

        await tx.recurringRule.create({
          data: {
            amount: rule.amount,
            direction: rule.direction,
            period: rule.period,
            startDate: new Date(rule.startDate),
            endDate: rule.endDate ? new Date(rule.endDate) : null,
            nextOccurrence: new Date(rule.nextOccurrence),
            autoPost: rule.autoPost ?? true,
            note: rule.note,
            accountId,
            categoryId,
            payeeId,
          },
        });
        summary.imported.recurringRules++;
      }

      // Import budgets with mapped IDs
      for (const budget of data.data.budgets || []) {
        const categoryId = categoryIdMap.get(budget.categoryId) || budget.categoryId;

        await tx.budget.create({
          data: {
            amount: budget.amount,
            period: budget.period || 'MONTHLY',
            effectiveFrom: new Date(budget.effectiveFrom),
            effectiveTo: budget.effectiveTo ? new Date(budget.effectiveTo) : null,
            categoryId,
          },
        });
        summary.imported.budgets++;
      }

      // Import goals
      for (const goal of data.data.goals || []) {
        await tx.savingsGoal.create({
          data: {
            name: goal.name,
            targetAmount: goal.targetAmount,
            currentAmount: goal.currentAmount || 0,
            targetDate: goal.targetDate ? new Date(goal.targetDate) : null,
            color: goal.color,
          },
        });
        summary.imported.goals++;
      }

      // Import settings
      if (data.data.settings) {
        await tx.appSettings.upsert({
          where: { id: 1 },
          update: {
            currencyCode: data.data.settings.currencyCode,
            firstDayOfMonth: data.data.settings.firstDayOfMonth,
            firstDayOfWeek: data.data.settings.firstDayOfWeek,
          },
          create: {
            id: 1,
            currencyCode: data.data.settings.currencyCode,
            firstDayOfMonth: data.data.settings.firstDayOfMonth,
            firstDayOfWeek: data.data.settings.firstDayOfWeek,
          },
        });
      }

      return summary;
    });
  }

  private validateImportData(data: any): void {
    if (!data || typeof data !== 'object') {
      throw new BadRequestException('Invalid import data: expected an object');
    }

    if (!data.version) {
      throw new BadRequestException('Invalid import data: missing version');
    }

    if (!SUPPORTED_VERSIONS.includes(data.version)) {
      throw new BadRequestException(
        `Unsupported version: ${data.version}. Supported versions: ${SUPPORTED_VERSIONS.join(', ')}`,
      );
    }

    if (!data.data || typeof data.data !== 'object') {
      throw new BadRequestException('Invalid import data: missing data object');
    }
  }
}
