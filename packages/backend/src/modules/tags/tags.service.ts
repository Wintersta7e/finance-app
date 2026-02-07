import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import {
  EntityNotFoundException,
  EntityInUseException,
} from '../../common/exceptions/business.exceptions';

@Injectable()
export class TagsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.tag.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: number) {
    const tag = await this.prisma.tag.findUnique({
      where: { id },
    });
    if (!tag || tag.deletedAt) {
      throw new EntityNotFoundException('Tag', id);
    }
    return tag;
  }

  async create(dto: CreateTagDto) {
    try {
      return await this.prisma.tag.create({
        data: dto,
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException(`Tag with name '${dto.name}' already exists`);
      }
      throw error;
    }
  }

  async update(id: number, dto: UpdateTagDto) {
    await this.findOne(id);
    try {
      return await this.prisma.tag.update({
        where: { id },
        data: dto,
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException(`Tag with name '${dto.name}' already exists`);
      }
      throw error;
    }
  }

  async remove(id: number) {
    await this.findOne(id);

    const transactionTagCount = await this.prisma.transactionTag.count({
      where: { tagId: id },
    });
    if (transactionTagCount > 0) {
      throw new EntityInUseException('tag', 'transactions');
    }

    return this.prisma.tag.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
