import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RecurringScheduleService } from './recurring-schedule.service';
import { CreateRecurringRuleDto } from './dto/create-recurring-rule.dto';
import { UpdateRecurringRuleDto } from './dto/update-recurring-rule.dto';
import { EntityNotFoundException } from '../../common/exceptions/business.exceptions';

@Injectable()
export class RecurringRulesService {
  constructor(
    private prisma: PrismaService,
    private scheduleService: RecurringScheduleService,
  ) {}

  async findAll() {
    return this.prisma.recurringRule.findMany({
      where: { deletedAt: null },
      include: { account: true, category: true, payee: true },
      orderBy: { nextOccurrence: 'asc' },
    });
  }

  async findOne(id: number) {
    const rule = await this.prisma.recurringRule.findUnique({
      where: { id },
      include: { account: true, category: true, payee: true },
    });

    if (!rule || rule.deletedAt) {
      throw new EntityNotFoundException('RecurringRule', id);
    }

    return rule;
  }

  async create(dto: CreateRecurringRuleDto) {
    const nextOccurrence = this.scheduleService.calculateNextOccurrence(
      dto.startDate,
      dto.period,
    );

    return this.prisma.recurringRule.create({
      data: {
        ...dto,
        autoPost: dto.autoPost ?? true,
        nextOccurrence,
      },
      include: { account: true, category: true, payee: true },
    });
  }

  async update(id: number, dto: UpdateRecurringRuleDto) {
    const existing = await this.findOne(id);

    // Determine if we need to recalculate nextOccurrence
    const startDateChanged = dto.startDate !== undefined;
    const periodChanged = dto.period !== undefined;

    const data: any = { ...dto };

    if (startDateChanged || periodChanged) {
      const startDate = dto.startDate ?? existing.startDate;
      const period = dto.period ?? existing.period;
      const nextOccurrence = this.scheduleService.calculateNextOccurrence(
        startDate,
        period,
      );
      data.nextOccurrence = nextOccurrence;
    }

    return this.prisma.recurringRule.update({
      where: { id },
      data,
      include: { account: true, category: true, payee: true },
    });
  }

  async generateNext(id: number) {
    const rule = await this.findOne(id);

    // Create a transaction from the rule
    const transaction = await this.prisma.transaction.create({
      data: {
        date: rule.nextOccurrence,
        amount: this.normalizeAmount(rule.amount, rule.direction),
        type: rule.direction === 'INCOME' ? 'INCOME' : 'VARIABLE_EXPENSE',
        accountId: rule.accountId,
        categoryId: rule.categoryId,
        payeeId: rule.payeeId,
        notes: rule.note,
        recurringRuleId: rule.id,
      },
    });

    // Calculate and update nextOccurrence
    const newNext = this.scheduleService.calculateNextOccurrence(
      rule.startDate,
      rule.period,
      rule.nextOccurrence,
    );

    await this.prisma.recurringRule.update({
      where: { id },
      data: { nextOccurrence: newNext },
    });

    return transaction;
  }

  private normalizeAmount(amount: unknown, direction: string): number {
    const abs = Math.abs(Number(amount));
    return direction === 'EXPENSE' ? -abs : abs;
  }

  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.recurringRule.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
