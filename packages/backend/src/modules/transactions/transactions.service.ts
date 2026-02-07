import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { TransactionQueryDto } from './dto/transaction-query.dto';
import { EntityNotFoundException } from '../../common/exceptions/business.exceptions';

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: TransactionQueryDto): Promise<PaginatedResult<any>> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };

    if (query.accountId) {
      where.accountId = query.accountId;
    }
    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }
    if (query.type) {
      where.type = query.type;
    }
    if (query.startDate || query.endDate) {
      where.date = {};
      if (query.startDate) {
        where.date.gte = query.startDate;
      }
      if (query.endDate) {
        where.date.lte = query.endDate;
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        include: { account: true, category: true, payee: true },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
      include: { account: true, category: true, payee: true },
    });

    if (!transaction || transaction.deletedAt) {
      throw new EntityNotFoundException('Transaction', id);
    }

    return transaction;
  }

  async create(dto: CreateTransactionDto) {
    return this.prisma.transaction.create({
      data: dto,
      include: { account: true, category: true, payee: true },
    });
  }

  async update(id: number, dto: UpdateTransactionDto) {
    await this.findOne(id);

    return this.prisma.transaction.update({
      where: { id },
      data: dto,
      include: { account: true, category: true, payee: true },
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.transaction.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
