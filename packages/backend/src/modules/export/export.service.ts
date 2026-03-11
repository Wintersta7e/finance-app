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
    const rows = transactions.map((t: any) => {
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
      ].map((f) => this.escapeCsvField(f)).join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  private escapeCsvField(field: string): string {
    // Prevent CSV formula injection: prefix dangerous leading characters with a single quote.
    // Skip numeric values (e.g. -50, +100) which are safe.
    const formulaChars = ['=', '+', '-', '@', '\t'];
    if (field.length > 0 && formulaChars.includes(field[0]) && isNaN(Number(field))) {
      field = "'" + field;
    }
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

    return this.prisma.$transaction(async (tx: any) => {
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
        const accountId = this.resolveId(accountIdMap, transaction.accountId, 'account', mode);
        const categoryId = transaction.categoryId
          ? this.resolveId(categoryIdMap, transaction.categoryId, 'category', mode)
          : null;
        const payeeId = transaction.payeeId
          ? this.resolveId(payeeIdMap, transaction.payeeId, 'payee', mode)
          : null;

        const createdTx = await tx.transaction.create({
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

        // Restore tag associations from exported data
        if (Array.isArray(transaction.tags)) {
          for (const tt of transaction.tags) {
            const mappedTagId = mode === 'replace'
              ? tagIdMap.get(tt.tagId)
              : (tagIdMap.get(tt.tagId) ?? tt.tagId);
            if (mappedTagId !== undefined) {
              await tx.transactionTag.create({
                data: {
                  transactionId: createdTx.id,
                  tagId: mappedTagId,
                },
              });
            }
          }
        }

        summary.imported.transactions++;
      }

      // Import recurring rules with mapped IDs
      for (const rule of data.data.recurringRules || []) {
        const accountId = this.resolveId(accountIdMap, rule.accountId, 'account', mode);
        const categoryId = rule.categoryId
          ? this.resolveId(categoryIdMap, rule.categoryId, 'category', mode)
          : null;
        const payeeId = rule.payeeId
          ? this.resolveId(payeeIdMap, rule.payeeId, 'payee', mode)
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
        const categoryId = this.resolveId(categoryIdMap, budget.categoryId, 'category', mode);

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

  /**
   * Resolve an old ID to a new ID using the mapping.
   * In 'replace' mode, throws if the ID is not found in the map.
   * In 'merge' mode, falls back to the original ID.
   */
  private resolveId(
    idMap: Map<number, number>,
    oldId: number,
    entityName: string,
    mode: ImportMode,
  ): number {
    const mapped = idMap.get(oldId);
    if (mapped !== undefined) {
      return mapped;
    }
    if (mode === 'replace') {
      throw new BadRequestException(
        `Import failed: ${entityName} with original ID ${oldId} was not found in the import data`,
      );
    }
    return oldId;
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

    // Validate transaction fields
    if (Array.isArray(data.data.transactions)) {
      for (let i = 0; i < data.data.transactions.length; i++) {
        const t = data.data.transactions[i];
        if (typeof t.amount !== 'number' || !Number.isFinite(t.amount)) {
          throw new BadRequestException(
            `Invalid transaction at index ${i}: amount must be a finite number`,
          );
        }
        if (!t.date || isNaN(new Date(t.date).getTime())) {
          throw new BadRequestException(
            `Invalid transaction at index ${i}: date must be a valid date string`,
          );
        }
        if (typeof t.accountId !== 'number' || !Number.isInteger(t.accountId)) {
          throw new BadRequestException(
            `Invalid transaction at index ${i}: accountId must be an integer`,
          );
        }
      }
    }

    // Validate account fields
    if (Array.isArray(data.data.accounts)) {
      for (let i = 0; i < data.data.accounts.length; i++) {
        const a = data.data.accounts[i];
        if (typeof a.name !== 'string' || a.name.trim().length === 0) {
          throw new BadRequestException(
            `Invalid account at index ${i}: name must be a non-empty string`,
          );
        }
        if (
          a.initialBalance !== undefined &&
          (typeof a.initialBalance !== 'number' || !Number.isFinite(a.initialBalance))
        ) {
          throw new BadRequestException(
            `Invalid account at index ${i}: initialBalance must be a finite number`,
          );
        }
      }
    }

    // Validate recurring rule fields
    if (Array.isArray(data.data.recurringRules)) {
      for (let i = 0; i < data.data.recurringRules.length; i++) {
        const r = data.data.recurringRules[i];
        if (typeof r.amount !== 'number' || !Number.isFinite(r.amount)) {
          throw new BadRequestException(
            `Invalid recurring rule at index ${i}: amount must be a finite number`,
          );
        }
        if (!r.startDate || isNaN(new Date(r.startDate).getTime())) {
          throw new BadRequestException(
            `Invalid recurring rule at index ${i}: startDate must be a valid date string`,
          );
        }
        if (typeof r.accountId !== 'number' || !Number.isInteger(r.accountId)) {
          throw new BadRequestException(
            `Invalid recurring rule at index ${i}: accountId must be an integer`,
          );
        }
      }
    }

    // Validate budget fields
    if (Array.isArray(data.data.budgets)) {
      for (let i = 0; i < data.data.budgets.length; i++) {
        const b = data.data.budgets[i];
        if (typeof b.amount !== 'number' || !Number.isFinite(b.amount)) {
          throw new BadRequestException(
            `Invalid budget at index ${i}: amount must be a finite number`,
          );
        }
      }
    }

    // Validate goal fields
    if (Array.isArray(data.data.goals)) {
      for (let i = 0; i < data.data.goals.length; i++) {
        const g = data.data.goals[i];
        if (typeof g.targetAmount !== 'number' || !Number.isFinite(g.targetAmount)) {
          throw new BadRequestException(
            `Invalid goal at index ${i}: targetAmount must be a finite number`,
          );
        }
      }
    }
  }
}
