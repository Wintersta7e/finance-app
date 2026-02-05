import { Test, TestingModule } from '@nestjs/testing';
import { BudgetsService } from './budgets.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EntityNotFoundException } from '../../common';
import { CreateBudgetDto, BudgetPeriod } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';

describe('BudgetsService', () => {
  let service: BudgetsService;
  let prisma: PrismaService;

  const mockPrisma = {
    budget: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockCategory = {
    id: 1,
    name: 'Groceries',
    kind: 'EXPENSE',
    fixedCost: false,
    deletedAt: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BudgetsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<BudgetsService>(BudgetsService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return budgets excluding soft-deleted with category relation', async () => {
      const mockBudgets = [
        {
          id: 1,
          amount: 500,
          period: 'MONTHLY',
          effectiveFrom: new Date('2024-01-01'),
          effectiveTo: null,
          categoryId: 1,
          deletedAt: null,
          category: mockCategory,
        },
        {
          id: 2,
          amount: 200,
          period: 'MONTHLY',
          effectiveFrom: new Date('2024-02-01'),
          effectiveTo: null,
          categoryId: 1,
          deletedAt: null,
          category: mockCategory,
        },
      ];
      mockPrisma.budget.findMany.mockResolvedValue(mockBudgets);

      const result = await service.findAll();

      expect(mockPrisma.budget.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        include: { category: true },
        orderBy: [{ effectiveFrom: 'desc' }, { id: 'desc' }],
      });
      expect(result).toEqual(mockBudgets);
    });
  });

  describe('findOne', () => {
    it('should return budget with category if found', async () => {
      const mockBudget = {
        id: 1,
        amount: 500,
        period: 'MONTHLY',
        effectiveFrom: new Date('2024-01-01'),
        effectiveTo: null,
        categoryId: 1,
        deletedAt: null,
        category: mockCategory,
      };
      mockPrisma.budget.findUnique.mockResolvedValue(mockBudget);

      const result = await service.findOne(1);

      expect(mockPrisma.budget.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: { category: true },
      });
      expect(result).toEqual(mockBudget);
    });

    it('should throw EntityNotFoundException if not found', async () => {
      mockPrisma.budget.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(EntityNotFoundException);
    });

    it('should throw EntityNotFoundException if soft-deleted', async () => {
      mockPrisma.budget.findUnique.mockResolvedValue({
        id: 1,
        deletedAt: new Date(),
      });

      await expect(service.findOne(1)).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('create', () => {
    it('should create and return new budget with category relation', async () => {
      const dto: CreateBudgetDto = {
        amount: 500,
        period: 'MONTHLY' as BudgetPeriod,
        effectiveFrom: new Date('2024-01-01'),
        categoryId: 1,
      };
      const created = {
        id: 1,
        ...dto,
        effectiveTo: null,
        deletedAt: null,
        category: mockCategory,
      };
      mockPrisma.budget.create.mockResolvedValue(created);

      const result = await service.create(dto);

      expect(mockPrisma.budget.create).toHaveBeenCalledWith({
        data: dto,
        include: { category: true },
      });
      expect(result).toEqual(created);
    });

    it('should create budget with effectiveTo', async () => {
      const dto: CreateBudgetDto = {
        amount: 500,
        period: 'MONTHLY' as BudgetPeriod,
        effectiveFrom: new Date('2024-01-01'),
        effectiveTo: new Date('2024-12-31'),
        categoryId: 1,
      };
      const created = {
        id: 1,
        ...dto,
        deletedAt: null,
        category: mockCategory,
      };
      mockPrisma.budget.create.mockResolvedValue(created);

      const result = await service.create(dto);

      expect(mockPrisma.budget.create).toHaveBeenCalledWith({
        data: dto,
        include: { category: true },
      });
      expect(result).toEqual(created);
    });

    it('should default period to MONTHLY if not specified', async () => {
      const dto: Omit<CreateBudgetDto, 'period'> = {
        amount: 500,
        effectiveFrom: new Date('2024-01-01'),
        categoryId: 1,
      };
      const created = {
        id: 1,
        ...dto,
        period: 'MONTHLY',
        effectiveTo: null,
        deletedAt: null,
        category: mockCategory,
      };
      mockPrisma.budget.create.mockResolvedValue(created);

      const result = await service.create(dto as CreateBudgetDto);

      expect(mockPrisma.budget.create).toHaveBeenCalledWith({
        data: dto,
        include: { category: true },
      });
    });
  });

  describe('update', () => {
    it('should update and return budget with category', async () => {
      const dto = { amount: 600 };
      const existing = {
        id: 1,
        amount: 500,
        period: 'MONTHLY',
        effectiveFrom: new Date('2024-01-01'),
        effectiveTo: null,
        categoryId: 1,
        deletedAt: null,
        category: mockCategory,
      };
      mockPrisma.budget.findUnique.mockResolvedValue(existing);
      mockPrisma.budget.update.mockResolvedValue({
        ...existing,
        amount: 600,
      });

      const result = await service.update(1, dto);

      expect(mockPrisma.budget.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: dto,
        include: { category: true },
      });
    });

    it('should throw EntityNotFoundException if budget not found', async () => {
      mockPrisma.budget.findUnique.mockResolvedValue(null);

      await expect(service.update(999, { amount: 600 })).rejects.toThrow(
        EntityNotFoundException,
      );
    });

    it('should update multiple fields', async () => {
      const dto: UpdateBudgetDto = { amount: 600, period: 'WEEKLY' as BudgetPeriod, effectiveTo: new Date('2024-06-30') };
      const existing = {
        id: 1,
        amount: 500,
        period: 'MONTHLY',
        effectiveFrom: new Date('2024-01-01'),
        effectiveTo: null,
        categoryId: 1,
        deletedAt: null,
        category: mockCategory,
      };
      mockPrisma.budget.findUnique.mockResolvedValue(existing);
      mockPrisma.budget.update.mockResolvedValue({
        ...existing,
        ...dto,
      });

      const result = await service.update(1, dto);

      expect(mockPrisma.budget.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: dto,
        include: { category: true },
      });
    });
  });

  describe('remove', () => {
    it('should soft-delete budget', async () => {
      const existing = {
        id: 1,
        amount: 500,
        period: 'MONTHLY',
        effectiveFrom: new Date('2024-01-01'),
        effectiveTo: null,
        categoryId: 1,
        deletedAt: null,
        category: mockCategory,
      };
      mockPrisma.budget.findUnique.mockResolvedValue(existing);
      mockPrisma.budget.update.mockResolvedValue({
        ...existing,
        deletedAt: new Date(),
      });

      await service.remove(1);

      expect(mockPrisma.budget.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('should throw EntityNotFoundException if budget not found', async () => {
      mockPrisma.budget.findUnique.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(EntityNotFoundException);
    });

    it('should throw EntityNotFoundException if budget already soft-deleted', async () => {
      mockPrisma.budget.findUnique.mockResolvedValue({
        id: 1,
        deletedAt: new Date(),
      });

      await expect(service.remove(1)).rejects.toThrow(EntityNotFoundException);
    });
  });
});
