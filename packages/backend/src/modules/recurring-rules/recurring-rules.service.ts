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

    let data: any = { ...dto };

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

  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.recurringRule.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
