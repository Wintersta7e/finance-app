import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesService } from './categories.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EntityNotFoundException, EntityInUseException } from '../../common';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let prisma: PrismaService;

  const mockPrisma = {
    category: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    transaction: {
      count: jest.fn(),
    },
    recurringRule: {
      count: jest.fn(),
    },
    budget: {
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return categories excluding soft-deleted', async () => {
      const mockCategories = [
        { id: 1, name: 'Groceries', kind: 'EXPENSE', fixedCost: false, deletedAt: null },
        { id: 2, name: 'Salary', kind: 'INCOME', fixedCost: false, deletedAt: null },
      ];
      mockPrisma.category.findMany.mockResolvedValue(mockCategories);

      const result = await service.findAll();

      expect(mockPrisma.category.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        orderBy: { name: 'asc' },
      });
      expect(result).toEqual(mockCategories);
    });
  });

  describe('findOne', () => {
    it('should return category if found', async () => {
      const mockCategory = { id: 1, name: 'Groceries', kind: 'EXPENSE', fixedCost: false, deletedAt: null };
      mockPrisma.category.findUnique.mockResolvedValue(mockCategory);

      const result = await service.findOne(1);

      expect(mockPrisma.category.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toEqual(mockCategory);
    });

    it('should throw EntityNotFoundException if not found', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(EntityNotFoundException);
    });

    it('should throw EntityNotFoundException if soft-deleted', async () => {
      mockPrisma.category.findUnique.mockResolvedValue({ id: 1, deletedAt: new Date() });

      await expect(service.findOne(1)).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('create', () => {
    it('should create and return new category', async () => {
      const dto = { name: 'Groceries', kind: 'EXPENSE' };
      const created = { id: 1, ...dto, fixedCost: false, deletedAt: null };
      mockPrisma.category.create.mockResolvedValue(created);

      const result = await service.create(dto);

      expect(mockPrisma.category.create).toHaveBeenCalledWith({ data: dto });
      expect(result).toEqual(created);
    });

    it('should create category with fixedCost', async () => {
      const dto = { name: 'Rent', kind: 'EXPENSE', fixedCost: true };
      const created = { id: 1, ...dto, deletedAt: null };
      mockPrisma.category.create.mockResolvedValue(created);

      const result = await service.create(dto);

      expect(mockPrisma.category.create).toHaveBeenCalledWith({ data: dto });
      expect(result).toEqual(created);
    });
  });

  describe('update', () => {
    it('should update and return category', async () => {
      const dto = { name: 'Food & Groceries' };
      mockPrisma.category.findUnique.mockResolvedValue({ id: 1, name: 'Groceries', kind: 'EXPENSE', deletedAt: null });
      mockPrisma.category.update.mockResolvedValue({ id: 1, name: 'Food & Groceries', kind: 'EXPENSE', deletedAt: null });

      const result = await service.update(1, dto);

      expect(mockPrisma.category.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: dto,
      });
    });

    it('should throw EntityNotFoundException if category not found', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(null);

      await expect(service.update(999, { name: 'New Name' })).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('remove', () => {
    it('should soft-delete category if no dependencies', async () => {
      mockPrisma.category.findUnique.mockResolvedValue({ id: 1, deletedAt: null });
      mockPrisma.transaction.count.mockResolvedValue(0);
      mockPrisma.recurringRule.count.mockResolvedValue(0);
      mockPrisma.budget.count.mockResolvedValue(0);
      mockPrisma.category.update.mockResolvedValue({ id: 1, deletedAt: new Date() });

      await service.remove(1);

      expect(mockPrisma.category.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('should throw EntityInUseException if has transactions', async () => {
      mockPrisma.category.findUnique.mockResolvedValue({ id: 1, deletedAt: null });
      mockPrisma.transaction.count.mockResolvedValue(5);

      await expect(service.remove(1)).rejects.toThrow(EntityInUseException);
    });

    it('should throw EntityInUseException if has recurring rules', async () => {
      mockPrisma.category.findUnique.mockResolvedValue({ id: 1, deletedAt: null });
      mockPrisma.transaction.count.mockResolvedValue(0);
      mockPrisma.recurringRule.count.mockResolvedValue(2);

      await expect(service.remove(1)).rejects.toThrow(EntityInUseException);
    });

    it('should throw EntityInUseException if has budgets', async () => {
      mockPrisma.category.findUnique.mockResolvedValue({ id: 1, deletedAt: null });
      mockPrisma.transaction.count.mockResolvedValue(0);
      mockPrisma.recurringRule.count.mockResolvedValue(0);
      mockPrisma.budget.count.mockResolvedValue(3);

      await expect(service.remove(1)).rejects.toThrow(EntityInUseException);
    });

    it('should throw EntityNotFoundException if category not found', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(EntityNotFoundException);
    });
  });
});
