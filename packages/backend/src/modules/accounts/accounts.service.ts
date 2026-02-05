import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import {
  EntityNotFoundException,
  EntityInUseException,
} from '../../common/exceptions/business.exceptions';

@Injectable()
export class AccountsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.account.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: number) {
    const account = await this.prisma.account.findUnique({
      where: { id },
    });
    if (!account || account.deletedAt) {
      throw new EntityNotFoundException('Account', id);
    }
    return account;
  }

  async create(dto: CreateAccountDto) {
    return this.prisma.account.create({
      data: dto,
    });
  }

  async update(id: number, dto: UpdateAccountDto) {
    await this.findOne(id);
    return this.prisma.account.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    const transactionCount = await this.prisma.transaction.count({
      where: { accountId: id, deletedAt: null },
    });
    if (transactionCount > 0) {
      throw new EntityInUseException('account', 'transactions');
    }

    const ruleCount = await this.prisma.recurringRule.count({
      where: { accountId: id, deletedAt: null },
    });
    if (ruleCount > 0) {
      throw new EntityInUseException('account', 'recurring rules');
    }

    return this.prisma.account.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
