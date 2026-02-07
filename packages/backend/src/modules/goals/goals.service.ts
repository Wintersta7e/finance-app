import { Injectable } from '@nestjs/common';
import { SavingsGoal } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { ContributeDto } from './dto/contribute.dto';
import { EntityNotFoundException } from '../../common/exceptions/business.exceptions';

export interface GoalWithProgress extends SavingsGoal {
  progress: number;
}

@Injectable()
export class GoalsService {
  constructor(private prisma: PrismaService) {}

  private calculateProgress(goal: SavingsGoal): number {
    const target = Number(goal.targetAmount);
    const current = Number(goal.currentAmount);

    if (target === 0) {
      return 0;
    }

    const progress = (current / target) * 100;
    return Math.min(progress, 100);
  }

  private withProgress(goal: SavingsGoal): GoalWithProgress {
    return {
      ...goal,
      progress: this.calculateProgress(goal),
    };
  }

  async findAll(): Promise<GoalWithProgress[]> {
    const goals = await this.prisma.savingsGoal.findMany({
      where: { deletedAt: null },
      orderBy: [
        { targetDate: { sort: 'asc', nulls: 'last' } },
        { name: 'asc' },
      ],
    });

    return goals.map((goal) => this.withProgress(goal));
  }

  async findOne(id: number): Promise<GoalWithProgress> {
    const goal = await this.prisma.savingsGoal.findUnique({
      where: { id },
    });

    if (!goal || goal.deletedAt) {
      throw new EntityNotFoundException('SavingsGoal', id);
    }

    return this.withProgress(goal);
  }

  async create(dto: CreateGoalDto): Promise<GoalWithProgress> {
    const goal = await this.prisma.savingsGoal.create({
      data: {
        name: dto.name,
        targetAmount: dto.targetAmount,
        currentAmount: dto.currentAmount ?? 0,
        targetDate: dto.targetDate,
        color: dto.color,
      },
    });

    return this.withProgress(goal);
  }

  async update(id: number, dto: UpdateGoalDto): Promise<GoalWithProgress> {
    await this.findOne(id);

    const goal = await this.prisma.savingsGoal.update({
      where: { id },
      data: dto,
    });

    return this.withProgress(goal);
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);

    await this.prisma.savingsGoal.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async contribute(id: number, dto: ContributeDto): Promise<GoalWithProgress> {
    await this.findOne(id);

    const goal = await this.prisma.savingsGoal.update({
      where: { id },
      data: { currentAmount: { increment: dto.amount } },
    });

    return this.withProgress(goal);
  }
}
