import { Test, TestingModule } from '@nestjs/testing';
import { GoalsService, GoalWithProgress } from './goals.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EntityNotFoundException } from '../../common';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { ContributeDto } from './dto/contribute.dto';
import { Decimal } from '@prisma/client/runtime/library';

describe('GoalsService', () => {
  let service: GoalsService;
  let prisma: PrismaService;

  const mockPrisma = {
    savingsGoal: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockGoal = {
    id: 1,
    name: 'Emergency Fund',
    targetAmount: new Decimal(10000),
    currentAmount: new Decimal(2500),
    targetDate: new Date('2025-12-31'),
    color: '#4CAF50',
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoalsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<GoalsService>(GoalsService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return goals excluding soft-deleted with progress calculation', async () => {
      const mockGoals = [
        {
          id: 1,
          name: 'Emergency Fund',
          targetAmount: new Decimal(10000),
          currentAmount: new Decimal(2500),
          targetDate: new Date('2025-12-31'),
          color: '#4CAF50',
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          name: 'Vacation',
          targetAmount: new Decimal(5000),
          currentAmount: new Decimal(1000),
          targetDate: null,
          color: null,
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      mockPrisma.savingsGoal.findMany.mockResolvedValue(mockGoals);

      const result = await service.findAll();

      expect(mockPrisma.savingsGoal.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        orderBy: [
          { targetDate: { sort: 'asc', nulls: 'last' } },
          { name: 'asc' },
        ],
      });
      expect(result).toHaveLength(2);
      expect(result[0].progress).toBe(25); // 2500/10000 * 100
      expect(result[1].progress).toBe(20); // 1000/5000 * 100
    });

    it('should handle goals with zero target amount gracefully', async () => {
      const mockGoals = [
        {
          id: 1,
          name: 'Zero Target',
          targetAmount: new Decimal(0),
          currentAmount: new Decimal(0),
          targetDate: null,
          color: null,
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      mockPrisma.savingsGoal.findMany.mockResolvedValue(mockGoals);

      const result = await service.findAll();

      expect(result[0].progress).toBe(0);
    });

    it('should cap progress at 100 when current exceeds target', async () => {
      const mockGoals = [
        {
          id: 1,
          name: 'Over-funded',
          targetAmount: new Decimal(1000),
          currentAmount: new Decimal(1500),
          targetDate: null,
          color: null,
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      mockPrisma.savingsGoal.findMany.mockResolvedValue(mockGoals);

      const result = await service.findAll();

      expect(result[0].progress).toBe(100);
    });
  });

  describe('findOne', () => {
    it('should return goal with progress if found', async () => {
      mockPrisma.savingsGoal.findUnique.mockResolvedValue(mockGoal);

      const result = await service.findOne(1);

      expect(mockPrisma.savingsGoal.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result.id).toBe(1);
      expect(result.progress).toBe(25); // 2500/10000 * 100
    });

    it('should throw EntityNotFoundException if not found', async () => {
      mockPrisma.savingsGoal.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(EntityNotFoundException);
    });

    it('should throw EntityNotFoundException if soft-deleted', async () => {
      mockPrisma.savingsGoal.findUnique.mockResolvedValue({
        ...mockGoal,
        deletedAt: new Date(),
      });

      await expect(service.findOne(1)).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('create', () => {
    it('should create and return new goal with progress', async () => {
      const dto: CreateGoalDto = {
        name: 'Emergency Fund',
        targetAmount: 10000,
        targetDate: new Date('2025-12-31'),
      };
      const created = {
        id: 1,
        name: dto.name,
        targetAmount: new Decimal(dto.targetAmount),
        currentAmount: new Decimal(0),
        targetDate: dto.targetDate,
        color: null,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.savingsGoal.create.mockResolvedValue(created);

      const result = await service.create(dto);

      expect(mockPrisma.savingsGoal.create).toHaveBeenCalledWith({
        data: {
          name: dto.name,
          targetAmount: dto.targetAmount,
          currentAmount: 0,
          targetDate: dto.targetDate,
          color: undefined,
        },
      });
      expect(result.progress).toBe(0);
    });

    it('should create goal with initial currentAmount', async () => {
      const dto: CreateGoalDto = {
        name: 'Emergency Fund',
        targetAmount: 10000,
        currentAmount: 5000,
      };
      const created = {
        id: 1,
        name: dto.name,
        targetAmount: new Decimal(dto.targetAmount),
        currentAmount: new Decimal(5000),
        targetDate: null,
        color: null,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.savingsGoal.create.mockResolvedValue(created);

      const result = await service.create(dto);

      expect(mockPrisma.savingsGoal.create).toHaveBeenCalledWith({
        data: {
          name: dto.name,
          targetAmount: dto.targetAmount,
          currentAmount: 5000,
          targetDate: undefined,
          color: undefined,
        },
      });
      expect(result.progress).toBe(50);
    });

    it('should create goal with color', async () => {
      const dto: CreateGoalDto = {
        name: 'Vacation',
        targetAmount: 5000,
        color: '#FF5722',
      };
      const created = {
        id: 1,
        name: dto.name,
        targetAmount: new Decimal(dto.targetAmount),
        currentAmount: new Decimal(0),
        targetDate: null,
        color: '#FF5722',
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.savingsGoal.create.mockResolvedValue(created);

      const result = await service.create(dto);

      expect(mockPrisma.savingsGoal.create).toHaveBeenCalledWith({
        data: {
          name: dto.name,
          targetAmount: dto.targetAmount,
          currentAmount: 0,
          targetDate: undefined,
          color: '#FF5722',
        },
      });
    });
  });

  describe('update', () => {
    it('should update and return goal with progress', async () => {
      const dto: UpdateGoalDto = { name: 'Updated Emergency Fund' };
      mockPrisma.savingsGoal.findUnique.mockResolvedValue(mockGoal);
      mockPrisma.savingsGoal.update.mockResolvedValue({
        ...mockGoal,
        name: 'Updated Emergency Fund',
      });

      const result = await service.update(1, dto);

      expect(mockPrisma.savingsGoal.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: dto,
      });
      expect(result.name).toBe('Updated Emergency Fund');
      expect(result.progress).toBe(25);
    });

    it('should throw EntityNotFoundException if goal not found', async () => {
      mockPrisma.savingsGoal.findUnique.mockResolvedValue(null);

      await expect(service.update(999, { name: 'Test' })).rejects.toThrow(
        EntityNotFoundException,
      );
    });

    it('should update multiple fields', async () => {
      const dto: UpdateGoalDto = {
        name: 'Updated Fund',
        targetAmount: 15000,
        targetDate: new Date('2026-06-30'),
      };
      mockPrisma.savingsGoal.findUnique.mockResolvedValue(mockGoal);
      mockPrisma.savingsGoal.update.mockResolvedValue({
        ...mockGoal,
        ...dto,
        targetAmount: new Decimal(15000),
      });

      const result = await service.update(1, dto);

      expect(mockPrisma.savingsGoal.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: dto,
      });
    });
  });

  describe('remove', () => {
    it('should soft-delete goal', async () => {
      mockPrisma.savingsGoal.findUnique.mockResolvedValue(mockGoal);
      mockPrisma.savingsGoal.update.mockResolvedValue({
        ...mockGoal,
        deletedAt: new Date(),
      });

      await service.remove(1);

      expect(mockPrisma.savingsGoal.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('should throw EntityNotFoundException if goal not found', async () => {
      mockPrisma.savingsGoal.findUnique.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(EntityNotFoundException);
    });

    it('should throw EntityNotFoundException if goal already soft-deleted', async () => {
      mockPrisma.savingsGoal.findUnique.mockResolvedValue({
        ...mockGoal,
        deletedAt: new Date(),
      });

      await expect(service.remove(1)).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('contribute', () => {
    it('should add contribution amount to currentAmount', async () => {
      const dto: ContributeDto = { amount: 500 };
      mockPrisma.savingsGoal.findUnique.mockResolvedValue(mockGoal);
      mockPrisma.savingsGoal.update.mockResolvedValue({
        ...mockGoal,
        currentAmount: new Decimal(3000), // 2500 + 500
      });

      const result = await service.contribute(1, dto);

      expect(mockPrisma.savingsGoal.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { currentAmount: { increment: 500 } },
      });
      expect(result.currentAmount).toEqual(new Decimal(3000));
      expect(result.progress).toBe(30); // 3000/10000 * 100
    });

    it('should throw EntityNotFoundException if goal not found', async () => {
      mockPrisma.savingsGoal.findUnique.mockResolvedValue(null);

      await expect(service.contribute(999, { amount: 100 })).rejects.toThrow(
        EntityNotFoundException,
      );
    });

    it('should throw EntityNotFoundException if goal soft-deleted', async () => {
      mockPrisma.savingsGoal.findUnique.mockResolvedValue({
        ...mockGoal,
        deletedAt: new Date(),
      });

      await expect(service.contribute(1, { amount: 100 })).rejects.toThrow(
        EntityNotFoundException,
      );
    });

    it('should allow contributing to already completed goal', async () => {
      const completedGoal = {
        ...mockGoal,
        currentAmount: new Decimal(10000),
      };
      mockPrisma.savingsGoal.findUnique.mockResolvedValue(completedGoal);
      mockPrisma.savingsGoal.update.mockResolvedValue({
        ...completedGoal,
        currentAmount: new Decimal(10500),
      });

      const result = await service.contribute(1, { amount: 500 });

      expect(result.currentAmount).toEqual(new Decimal(10500));
      expect(result.progress).toBe(100); // capped at 100
    });
  });
});
