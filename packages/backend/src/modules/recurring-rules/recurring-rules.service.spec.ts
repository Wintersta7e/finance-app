import { Test, TestingModule } from '@nestjs/testing';
import { RecurringRulesService } from './recurring-rules.service';
import { RecurringScheduleService } from './recurring-schedule.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EntityNotFoundException } from '../../common/exceptions/business.exceptions';

describe('RecurringRulesService', () => {
  let service: RecurringRulesService;
  let scheduleService: RecurringScheduleService;

  const mockPrisma = {
    recurringRule: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockScheduleService = {
    calculateNextOccurrence: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecurringRulesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RecurringScheduleService, useValue: mockScheduleService },
      ],
    }).compile();

    service = module.get<RecurringRulesService>(RecurringRulesService);
    scheduleService = module.get<RecurringScheduleService>(RecurringScheduleService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all non-deleted recurring rules ordered by nextOccurrence ASC', async () => {
      const mockRules = [
        {
          id: 1,
          amount: 100,
          direction: 'INCOME',
          period: 'MONTHLY',
          startDate: new Date('2024-01-01'),
          nextOccurrence: new Date('2024-04-01'),
          autoPost: true,
          deletedAt: null,
          account: { id: 1, name: 'Main' },
          category: null,
          payee: null,
        },
        {
          id: 2,
          amount: 50,
          direction: 'EXPENSE',
          period: 'WEEKLY',
          startDate: new Date('2024-03-01'),
          nextOccurrence: new Date('2024-04-05'),
          autoPost: true,
          deletedAt: null,
          account: { id: 1, name: 'Main' },
          category: { id: 1, name: 'Utilities' },
          payee: null,
        },
      ];
      mockPrisma.recurringRule.findMany.mockResolvedValue(mockRules);

      const result = await service.findAll();

      expect(mockPrisma.recurringRule.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        include: { account: true, category: true, payee: true },
        orderBy: { nextOccurrence: 'asc' },
      });
      expect(result).toEqual(mockRules);
    });
  });

  describe('findOne', () => {
    it('should return recurring rule with relations if found', async () => {
      const mockRule = {
        id: 1,
        amount: 100,
        direction: 'INCOME',
        period: 'MONTHLY',
        startDate: new Date('2024-01-01'),
        nextOccurrence: new Date('2024-04-01'),
        autoPost: true,
        deletedAt: null,
        account: { id: 1, name: 'Main' },
        category: null,
        payee: null,
      };
      mockPrisma.recurringRule.findUnique.mockResolvedValue(mockRule);

      const result = await service.findOne(1);

      expect(mockPrisma.recurringRule.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: { account: true, category: true, payee: true },
      });
      expect(result).toEqual(mockRule);
    });

    it('should throw EntityNotFoundException if not found', async () => {
      mockPrisma.recurringRule.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(EntityNotFoundException);
    });

    it('should throw EntityNotFoundException if soft-deleted', async () => {
      mockPrisma.recurringRule.findUnique.mockResolvedValue({
        id: 1,
        deletedAt: new Date(),
      });

      await expect(service.findOne(1)).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('create', () => {
    it('should create recurring rule with auto-calculated nextOccurrence', async () => {
      const dto = {
        amount: 100,
        direction: 'INCOME' as const,
        period: 'MONTHLY' as const,
        startDate: new Date('2024-01-15'),
        accountId: 1,
        autoPost: true,
      };
      const calculatedNext = new Date('2024-04-15');
      const created = {
        id: 1,
        ...dto,
        nextOccurrence: calculatedNext,
        deletedAt: null,
        account: { id: 1, name: 'Main' },
        category: null,
        payee: null,
      };

      mockScheduleService.calculateNextOccurrence.mockReturnValue(calculatedNext);
      mockPrisma.recurringRule.create.mockResolvedValue(created);

      const result = await service.create(dto);

      expect(mockScheduleService.calculateNextOccurrence).toHaveBeenCalledWith(
        dto.startDate,
        dto.period,
      );
      expect(mockPrisma.recurringRule.create).toHaveBeenCalledWith({
        data: {
          ...dto,
          nextOccurrence: calculatedNext,
        },
        include: { account: true, category: true, payee: true },
      });
      expect(result).toEqual(created);
    });

    it('should use default autoPost=true when not provided', async () => {
      const dto = {
        amount: 100,
        direction: 'INCOME' as const,
        period: 'MONTHLY' as const,
        startDate: new Date('2024-01-15'),
        accountId: 1,
      };
      const calculatedNext = new Date('2024-04-15');

      mockScheduleService.calculateNextOccurrence.mockReturnValue(calculatedNext);
      mockPrisma.recurringRule.create.mockResolvedValue({
        id: 1,
        ...dto,
        autoPost: true,
        nextOccurrence: calculatedNext,
      });

      await service.create(dto);

      expect(mockPrisma.recurringRule.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          autoPost: true,
        }),
        include: { account: true, category: true, payee: true },
      });
    });
  });

  describe('update', () => {
    const existingRule = {
      id: 1,
      amount: 100,
      direction: 'INCOME',
      period: 'MONTHLY',
      startDate: new Date('2024-01-15'),
      nextOccurrence: new Date('2024-04-15'),
      autoPost: true,
      deletedAt: null,
      account: { id: 1, name: 'Main' },
      category: null,
      payee: null,
    };

    it('should update without recalculating nextOccurrence when startDate/period unchanged', async () => {
      const dto = { amount: 200, note: 'Updated' };
      const updated = { ...existingRule, ...dto };

      mockPrisma.recurringRule.findUnique.mockResolvedValue(existingRule);
      mockPrisma.recurringRule.update.mockResolvedValue(updated);

      const result = await service.update(1, dto);

      expect(mockScheduleService.calculateNextOccurrence).not.toHaveBeenCalled();
      expect(mockPrisma.recurringRule.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: dto,
        include: { account: true, category: true, payee: true },
      });
      expect(result).toEqual(updated);
    });

    it('should recalculate nextOccurrence when startDate changes', async () => {
      const newStartDate = new Date('2024-02-01');
      const dto = { startDate: newStartDate };
      const newNextOccurrence = new Date('2024-05-01');
      const updated = { ...existingRule, ...dto, nextOccurrence: newNextOccurrence };

      mockPrisma.recurringRule.findUnique.mockResolvedValue(existingRule);
      mockScheduleService.calculateNextOccurrence.mockReturnValue(newNextOccurrence);
      mockPrisma.recurringRule.update.mockResolvedValue(updated);

      const result = await service.update(1, dto);

      expect(mockScheduleService.calculateNextOccurrence).toHaveBeenCalledWith(
        newStartDate,
        existingRule.period,
      );
      expect(mockPrisma.recurringRule.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { ...dto, nextOccurrence: newNextOccurrence },
        include: { account: true, category: true, payee: true },
      });
      expect(result).toEqual(updated);
    });

    it('should recalculate nextOccurrence when period changes', async () => {
      const dto = { period: 'WEEKLY' as const };
      const newNextOccurrence = new Date('2024-03-29');
      const updated = { ...existingRule, ...dto, nextOccurrence: newNextOccurrence };

      mockPrisma.recurringRule.findUnique.mockResolvedValue(existingRule);
      mockScheduleService.calculateNextOccurrence.mockReturnValue(newNextOccurrence);
      mockPrisma.recurringRule.update.mockResolvedValue(updated);

      const result = await service.update(1, dto);

      expect(mockScheduleService.calculateNextOccurrence).toHaveBeenCalledWith(
        existingRule.startDate,
        dto.period,
      );
      expect(mockPrisma.recurringRule.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { ...dto, nextOccurrence: newNextOccurrence },
        include: { account: true, category: true, payee: true },
      });
      expect(result).toEqual(updated);
    });

    it('should recalculate nextOccurrence when both startDate and period change', async () => {
      const newStartDate = new Date('2024-02-01');
      const dto = { startDate: newStartDate, period: 'WEEKLY' as const };
      const newNextOccurrence = new Date('2024-03-29');
      const updated = { ...existingRule, ...dto, nextOccurrence: newNextOccurrence };

      mockPrisma.recurringRule.findUnique.mockResolvedValue(existingRule);
      mockScheduleService.calculateNextOccurrence.mockReturnValue(newNextOccurrence);
      mockPrisma.recurringRule.update.mockResolvedValue(updated);

      const result = await service.update(1, dto);

      expect(mockScheduleService.calculateNextOccurrence).toHaveBeenCalledWith(
        newStartDate,
        dto.period,
      );
      expect(result).toEqual(updated);
    });

    it('should throw EntityNotFoundException if not found', async () => {
      mockPrisma.recurringRule.findUnique.mockResolvedValue(null);

      await expect(service.update(999, { amount: 100 })).rejects.toThrow(
        EntityNotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should soft-delete recurring rule', async () => {
      const existing = {
        id: 1,
        amount: 100,
        direction: 'INCOME',
        period: 'MONTHLY',
        deletedAt: null,
      };
      mockPrisma.recurringRule.findUnique.mockResolvedValue(existing);
      mockPrisma.recurringRule.update.mockResolvedValue({
        ...existing,
        deletedAt: new Date(),
      });

      await service.remove(1);

      expect(mockPrisma.recurringRule.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('should throw EntityNotFoundException if not found', async () => {
      mockPrisma.recurringRule.findUnique.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(EntityNotFoundException);
    });
  });
});
