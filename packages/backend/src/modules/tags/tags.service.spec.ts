import { Test, TestingModule } from '@nestjs/testing';
import { TagsService } from './tags.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EntityNotFoundException, EntityInUseException } from '../../common';
import { ConflictException } from '@nestjs/common';

describe('TagsService', () => {
  let service: TagsService;
  let prisma: PrismaService;

  const mockPrisma = {
    tag: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    transactionTag: {
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TagsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<TagsService>(TagsService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return tags excluding soft-deleted, ordered by name', async () => {
      const mockTags = [
        { id: 1, name: 'Business', color: '#FF5733', deletedAt: null },
        { id: 2, name: 'Personal', color: '#33FF57', deletedAt: null },
      ];
      mockPrisma.tag.findMany.mockResolvedValue(mockTags);

      const result = await service.findAll();

      expect(mockPrisma.tag.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        orderBy: { name: 'asc' },
      });
      expect(result).toEqual(mockTags);
    });

    it('should return empty array when no tags exist', async () => {
      mockPrisma.tag.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return tag if found', async () => {
      const mockTag = { id: 1, name: 'Business', color: '#FF5733', deletedAt: null };
      mockPrisma.tag.findUnique.mockResolvedValue(mockTag);

      const result = await service.findOne(1);

      expect(mockPrisma.tag.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toEqual(mockTag);
    });

    it('should throw EntityNotFoundException if not found', async () => {
      mockPrisma.tag.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(EntityNotFoundException);
    });

    it('should throw EntityNotFoundException if soft-deleted', async () => {
      mockPrisma.tag.findUnique.mockResolvedValue({ id: 1, deletedAt: new Date() });

      await expect(service.findOne(1)).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('create', () => {
    it('should create and return new tag', async () => {
      const dto = { name: 'Business', color: '#FF5733' };
      const created = { id: 1, ...dto, deletedAt: null, createdAt: new Date(), updatedAt: new Date() };
      mockPrisma.tag.create.mockResolvedValue(created);

      const result = await service.create(dto);

      expect(mockPrisma.tag.create).toHaveBeenCalledWith({ data: dto });
      expect(result).toEqual(created);
    });

    it('should create tag without color', async () => {
      const dto = { name: 'Simple' };
      const created = { id: 1, name: 'Simple', color: null, deletedAt: null };
      mockPrisma.tag.create.mockResolvedValue(created);

      const result = await service.create(dto);

      expect(mockPrisma.tag.create).toHaveBeenCalledWith({ data: dto });
      expect(result).toEqual(created);
    });

    it('should throw ConflictException for duplicate name', async () => {
      const dto = { name: 'Existing' };
      const prismaError = new Error('Unique constraint failed');
      (prismaError as any).code = 'P2002';
      mockPrisma.tag.create.mockRejectedValue(prismaError);

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('should update and return tag', async () => {
      const dto = { name: 'Updated Business' };
      mockPrisma.tag.findUnique.mockResolvedValue({ id: 1, name: 'Business', color: '#FF5733', deletedAt: null });
      mockPrisma.tag.update.mockResolvedValue({ id: 1, name: 'Updated Business', color: '#FF5733', deletedAt: null });

      const result = await service.update(1, dto);

      expect(mockPrisma.tag.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: dto,
      });
      expect(result.name).toBe('Updated Business');
    });

    it('should update only color', async () => {
      const dto = { color: '#000000' };
      mockPrisma.tag.findUnique.mockResolvedValue({ id: 1, name: 'Business', color: '#FF5733', deletedAt: null });
      mockPrisma.tag.update.mockResolvedValue({ id: 1, name: 'Business', color: '#000000', deletedAt: null });

      const result = await service.update(1, dto);

      expect(mockPrisma.tag.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: dto,
      });
      expect(result.color).toBe('#000000');
    });

    it('should throw EntityNotFoundException if tag not found', async () => {
      mockPrisma.tag.findUnique.mockResolvedValue(null);

      await expect(service.update(999, { name: 'New Name' })).rejects.toThrow(EntityNotFoundException);
    });

    it('should throw ConflictException for duplicate name on update', async () => {
      const dto = { name: 'Existing' };
      mockPrisma.tag.findUnique.mockResolvedValue({ id: 1, name: 'Business', color: '#FF5733', deletedAt: null });
      const prismaError = new Error('Unique constraint failed');
      (prismaError as any).code = 'P2002';
      mockPrisma.tag.update.mockRejectedValue(prismaError);

      await expect(service.update(1, dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('should soft-delete tag if no associated transactions', async () => {
      mockPrisma.tag.findUnique.mockResolvedValue({ id: 1, name: 'Business', deletedAt: null });
      mockPrisma.transactionTag.count.mockResolvedValue(0);
      mockPrisma.tag.update.mockResolvedValue({ id: 1, name: 'Business', deletedAt: new Date() });

      await service.remove(1);

      expect(mockPrisma.tag.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('should throw EntityInUseException if has associated transactions', async () => {
      mockPrisma.tag.findUnique.mockResolvedValue({ id: 1, name: 'Business', deletedAt: null });
      mockPrisma.transactionTag.count.mockResolvedValue(5);

      await expect(service.remove(1)).rejects.toThrow(EntityInUseException);
    });

    it('should throw EntityNotFoundException if tag not found', async () => {
      mockPrisma.tag.findUnique.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(EntityNotFoundException);
    });

    it('should throw EntityNotFoundException if tag already soft-deleted', async () => {
      mockPrisma.tag.findUnique.mockResolvedValue({ id: 1, deletedAt: new Date() });

      await expect(service.remove(1)).rejects.toThrow(EntityNotFoundException);
    });
  });
});
