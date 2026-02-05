import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { EntityNotFoundException } from '../../common/exceptions/business.exceptions';

@Injectable()
export class BudgetsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.budget.findMany({
      where: { deletedAt: null },
      include: { category: true },
      orderBy: [{ effectiveFrom: 'desc' }, { id: 'desc' }],
    });
  }

  async findOne(id: number) {
    const budget = await this.prisma.budget.findUnique({
      where: { id },
      include: { category: true },
    });

    if (!budget || budget.deletedAt) {
      throw new EntityNotFoundException('Budget', id);
    }

    return budget;
  }

  async create(dto: CreateBudgetDto) {
    return this.prisma.budget.create({
      data: dto,
      include: { category: true },
    });
  }

  async update(id: number, dto: UpdateBudgetDto) {
    await this.findOne(id);

    return this.prisma.budget.update({
      where: { id },
      data: dto,
      include: { category: true },
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.budget.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
