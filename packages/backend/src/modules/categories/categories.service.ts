import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import {
  EntityNotFoundException,
  EntityInUseException,
} from '../../common/exceptions/business.exceptions';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.category.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: number) {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });
    if (!category || category.deletedAt) {
      throw new EntityNotFoundException('Category', id);
    }
    return category;
  }

  async create(dto: CreateCategoryDto) {
    return this.prisma.category.create({
      data: dto,
    });
  }

  async update(id: number, dto: UpdateCategoryDto) {
    await this.findOne(id);
    return this.prisma.category.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    const transactionCount = await this.prisma.transaction.count({
      where: { categoryId: id, deletedAt: null },
    });
    if (transactionCount > 0) {
      throw new EntityInUseException('category', 'transactions');
    }

    const ruleCount = await this.prisma.recurringRule.count({
      where: { categoryId: id, deletedAt: null },
    });
    if (ruleCount > 0) {
      throw new EntityInUseException('category', 'recurring rules');
    }

    const budgetCount = await this.prisma.budget.count({
      where: { categoryId: id, deletedAt: null },
    });
    if (budgetCount > 0) {
      throw new EntityInUseException('category', 'budgets');
    }

    return this.prisma.category.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
