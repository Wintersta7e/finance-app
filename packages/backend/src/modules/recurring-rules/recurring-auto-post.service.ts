import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RecurringScheduleService } from './recurring-schedule.service';

type Transaction = Awaited<ReturnType<PrismaService['transaction']['create']>>;

export interface AutoPostResult {
  processed: number;
  transactions: Transaction[];
}

@Injectable()
export class RecurringAutoPostService {
  constructor(
    private prisma: PrismaService,
    private scheduleService: RecurringScheduleService,
  ) {}

  /**
   * Process all recurring rules that are due for auto-posting.
   *
   * For each rule where:
   * - autoPost = true
   * - nextOccurrence <= today
   * - deletedAt = null
   * - endDate is null OR endDate >= today
   *
   * Creates a transaction and updates the rule's nextOccurrence.
   *
   * Edge case: If a rule is multiple periods behind, only ONE transaction
   * is created for the most recent occurrence, and nextOccurrence is
   * updated to the next future date after today.
   *
   * @param today - The reference date for processing (defaults to current date)
   * @returns Summary of processed rules and created transactions
   */
  async processAutoPostRules(today?: Date): Promise<AutoPostResult> {
    const referenceDate = this.normalizeToUtcDate(today ?? new Date());

    // Find all rules due for auto-posting
    const rules = await this.prisma.recurringRule.findMany({
      where: {
        autoPost: true,
        deletedAt: null,
        nextOccurrence: { lte: referenceDate },
        OR: [
          { endDate: null },
          { endDate: { gte: referenceDate } },
        ],
      },
      include: { account: true, category: true, payee: true },
    });

    if (rules.length === 0) {
      return { processed: 0, transactions: [] };
    }

    // Process each rule in its own transaction — rules are independent,
    // so one failure should not prevent others from posting
    const transactions: Transaction[] = [];

    for (const rule of rules) {
      const transaction = await this.prisma.$transaction(async (tx) => {
        const newTransaction = await tx.transaction.create({
          data: {
            date: rule.nextOccurrence,
            amount: this.normalizeAmount(rule.amount, rule.direction),
            type: this.mapDirectionToType(rule.direction),
            accountId: rule.accountId,
            categoryId: rule.categoryId,
            payeeId: rule.payeeId,
            notes: rule.note,
            recurringRuleId: rule.id,
          },
        });

        const newNextOccurrence = this.scheduleService.calculateNextOccurrence(
          rule.startDate,
          rule.period,
          referenceDate,
        );

        await tx.recurringRule.update({
          where: { id: rule.id },
          data: { nextOccurrence: newNextOccurrence },
        });

        return newTransaction;
      });

      transactions.push(transaction);
    }

    return {
      processed: transactions.length,
      transactions,
    };
  }

  /**
   * Map recurring rule direction to transaction type.
   * INCOME -> INCOME
   * EXPENSE -> VARIABLE_EXPENSE
   */
  private mapDirectionToType(direction: string): string {
    return direction === 'INCOME' ? 'INCOME' : 'VARIABLE_EXPENSE';
  }

  /**
   * Normalize amount based on direction.
   * INCOME -> positive amount
   * EXPENSE -> negative amount
   */
  private normalizeAmount(amount: unknown, direction: string): number {
    const absAmount = Math.abs(Number(amount));
    return direction === 'EXPENSE' ? -absAmount : absAmount;
  }

  /**
   * Normalize a date to UTC midnight.
   * E.g., "2024-03-15T14:30:00-05:00" becomes "2024-03-15T00:00:00.000Z"
   */
  private normalizeToUtcDate(date: Date): Date {
    const d = new Date(date);
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  }
}
