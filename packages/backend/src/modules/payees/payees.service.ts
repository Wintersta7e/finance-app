import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePayeeDto } from './dto/create-payee.dto';
import { UpdatePayeeDto } from './dto/update-payee.dto';
import {
  EntityNotFoundException,
  EntityInUseException,
} from '../../common/exceptions/business.exceptions';

@Injectable()
export class PayeesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.payee.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: number) {
    const payee = await this.prisma.payee.findUnique({
      where: { id },
    });
    if (!payee || payee.deletedAt) {
      throw new EntityNotFoundException('Payee', id);
    }
    return payee;
  }

  async create(dto: CreatePayeeDto) {
    try {
      return await this.prisma.payee.create({
        data: dto,
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException(`Payee with name '${dto.name}' already exists`);
      }
      throw error;
    }
  }

  async update(id: number, dto: UpdatePayeeDto) {
    await this.findOne(id);
    try {
      return await this.prisma.payee.update({
        where: { id },
        data: dto,
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException(`Payee with name '${dto.name}' already exists`);
      }
      throw error;
    }
  }

  async remove(id: number) {
    await this.findOne(id);

    const transactionCount = await this.prisma.transaction.count({
      where: { payeeId: id, deletedAt: null },
    });
    if (transactionCount > 0) {
      throw new EntityInUseException('payee', 'transactions');
    }

    const recurringRuleCount = await this.prisma.recurringRule.count({
      where: { payeeId: id, deletedAt: null },
    });
    if (recurringRuleCount > 0) {
      throw new EntityInUseException('payee', 'recurring rules');
    }

    return this.prisma.payee.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
