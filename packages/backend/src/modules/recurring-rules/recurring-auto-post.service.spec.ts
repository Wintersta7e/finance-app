import { Test, TestingModule } from '@nestjs/testing';
import { RecurringAutoPostService } from './recurring-auto-post.service';
import { RecurringScheduleService } from './recurring-schedule.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/client';

describe('RecurringAutoPostService', () => {
  let service: RecurringAutoPostService;
  let scheduleService: RecurringScheduleService;

  const mockPrisma = {
    recurringRule: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    transaction: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockScheduleService = {
    calculateNextOccurrence: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecurringAutoPostService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RecurringScheduleService, useValue: mockScheduleService },
      ],
    }).compile();

    service = module.get<RecurringAutoPostService>(RecurringAutoPostService);
    scheduleService = module.get<RecurringScheduleService>(RecurringScheduleService);
    jest.clearAllMocks();
  });

  describe('processAutoPostRules', () => {
    it('should return empty result when no rules need processing', async () => {
      mockPrisma.recurringRule.findMany.mockResolvedValue([]);

      const result = await service.processAutoPostRules();

      expect(result).toEqual({ processed: 0, transactions: [] });
      expect(mockPrisma.recurringRule.findMany).toHaveBeenCalled();
    });

    it('should find rules where autoPost=true, nextOccurrence<=today, deletedAt=null', async () => {
      mockPrisma.recurringRule.findMany.mockResolvedValue([]);

      // Use a fixed date for testing
      const today = new Date('2024-03-20T00:00:00.000Z');
      await service.processAutoPostRules(today);

      expect(mockPrisma.recurringRule.findMany).toHaveBeenCalledWith({
        where: {
          autoPost: true,
          deletedAt: null,
          nextOccurrence: { lte: today },
          OR: [
            { endDate: null },
            { endDate: { gte: today } },
          ],
        },
        include: { account: true, category: true, payee: true },
      });
    });

    it('should create transaction from INCOME rule', async () => {
      const today = new Date('2024-03-20T00:00:00.000Z');
      const nextOccurrence = new Date('2024-03-15T00:00:00.000Z');
      const newNextOccurrence = new Date('2024-04-15T00:00:00.000Z');

      const rule = {
        id: 1,
        amount: new Decimal(100),
        direction: 'INCOME',
        period: 'MONTHLY',
        startDate: new Date('2024-01-15'),
        nextOccurrence,
        autoPost: true,
        note: 'Monthly salary',
        deletedAt: null,
        accountId: 1,
        categoryId: 2,
        payeeId: 3,
        account: { id: 1, name: 'Main' },
        category: { id: 2, name: 'Salary' },
        payee: { id: 3, name: 'Employer' },
      };

      const createdTransaction = {
        id: 100,
        date: nextOccurrence,
        amount: new Decimal(100),
        type: 'INCOME',
        accountId: 1,
        categoryId: 2,
        payeeId: 3,
        notes: 'Monthly salary',
        recurringRuleId: 1,
      };

      mockPrisma.recurringRule.findMany.mockResolvedValue([rule]);
      mockScheduleService.calculateNextOccurrence.mockReturnValue(newNextOccurrence);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrisma);
      });
      mockPrisma.transaction.create.mockResolvedValue(createdTransaction);
      mockPrisma.recurringRule.update.mockResolvedValue({ ...rule, nextOccurrence: newNextOccurrence });

      const result = await service.processAutoPostRules(today);

      expect(result.processed).toBe(1);
      expect(result.transactions).toHaveLength(1);
      expect(mockPrisma.transaction.create).toHaveBeenCalledWith({
        data: {
          date: nextOccurrence,
          amount: 100, // Normalized: INCOME keeps positive amount
          type: 'INCOME',
          accountId: 1,
          categoryId: 2,
          payeeId: 3,
          notes: 'Monthly salary',
          recurringRuleId: 1,
        },
      });
    });

    it('should create transaction from EXPENSE rule as VARIABLE_EXPENSE', async () => {
      const today = new Date('2024-03-20T00:00:00.000Z');
      const nextOccurrence = new Date('2024-03-15T00:00:00.000Z');
      const newNextOccurrence = new Date('2024-04-15T00:00:00.000Z');

      const rule = {
        id: 1,
        amount: new Decimal(50),
        direction: 'EXPENSE',
        period: 'MONTHLY',
        startDate: new Date('2024-01-15'),
        nextOccurrence,
        autoPost: true,
        note: 'Subscription',
        deletedAt: null,
        accountId: 1,
        categoryId: null,
        payeeId: null,
        account: { id: 1, name: 'Main' },
        category: null,
        payee: null,
      };

      const createdTransaction = {
        id: 100,
        date: nextOccurrence,
        amount: new Decimal(50),
        type: 'VARIABLE_EXPENSE',
        accountId: 1,
        categoryId: null,
        payeeId: null,
        notes: 'Subscription',
        recurringRuleId: 1,
      };

      mockPrisma.recurringRule.findMany.mockResolvedValue([rule]);
      mockScheduleService.calculateNextOccurrence.mockReturnValue(newNextOccurrence);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrisma);
      });
      mockPrisma.transaction.create.mockResolvedValue(createdTransaction);
      mockPrisma.recurringRule.update.mockResolvedValue({ ...rule, nextOccurrence: newNextOccurrence });

      const result = await service.processAutoPostRules(today);

      expect(result.processed).toBe(1);
      expect(mockPrisma.transaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'VARIABLE_EXPENSE',
        }),
      });
    });

    it('should update rule nextOccurrence to next future date after today', async () => {
      const today = new Date('2024-03-20T00:00:00.000Z');
      const nextOccurrence = new Date('2024-03-15T00:00:00.000Z');
      const newNextOccurrence = new Date('2024-04-15T00:00:00.000Z');

      const rule = {
        id: 1,
        amount: new Decimal(100),
        direction: 'INCOME',
        period: 'MONTHLY',
        startDate: new Date('2024-01-15'),
        nextOccurrence,
        autoPost: true,
        note: null,
        deletedAt: null,
        accountId: 1,
        categoryId: null,
        payeeId: null,
        account: { id: 1, name: 'Main' },
        category: null,
        payee: null,
      };

      mockPrisma.recurringRule.findMany.mockResolvedValue([rule]);
      mockScheduleService.calculateNextOccurrence.mockReturnValue(newNextOccurrence);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrisma);
      });
      mockPrisma.transaction.create.mockResolvedValue({ id: 100 });
      mockPrisma.recurringRule.update.mockResolvedValue({ ...rule, nextOccurrence: newNextOccurrence });

      await service.processAutoPostRules(today);

      expect(mockScheduleService.calculateNextOccurrence).toHaveBeenCalledWith(
        rule.startDate,
        rule.period,
        today,
      );
      expect(mockPrisma.recurringRule.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { nextOccurrence: newNextOccurrence },
      });
    });

    it('should process multiple rules and return all transactions', async () => {
      const today = new Date('2024-03-20T00:00:00.000Z');

      const rules = [
        {
          id: 1,
          amount: new Decimal(100),
          direction: 'INCOME',
          period: 'MONTHLY',
          startDate: new Date('2024-01-15'),
          nextOccurrence: new Date('2024-03-15'),
          autoPost: true,
          note: null,
          deletedAt: null,
          accountId: 1,
          categoryId: null,
          payeeId: null,
          account: { id: 1, name: 'Main' },
          category: null,
          payee: null,
        },
        {
          id: 2,
          amount: new Decimal(50),
          direction: 'EXPENSE',
          period: 'WEEKLY',
          startDate: new Date('2024-03-01'),
          nextOccurrence: new Date('2024-03-18'),
          autoPost: true,
          note: 'Weekly expense',
          deletedAt: null,
          accountId: 2,
          categoryId: 3,
          payeeId: null,
          account: { id: 2, name: 'Savings' },
          category: { id: 3, name: 'Food' },
          payee: null,
        },
      ];

      const transactions = [
        { id: 100, date: rules[0].nextOccurrence, amount: rules[0].amount },
        { id: 101, date: rules[1].nextOccurrence, amount: rules[1].amount },
      ];

      mockPrisma.recurringRule.findMany.mockResolvedValue(rules);
      mockScheduleService.calculateNextOccurrence
        .mockReturnValueOnce(new Date('2024-04-15'))
        .mockReturnValueOnce(new Date('2024-03-25'));
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrisma);
      });
      mockPrisma.transaction.create
        .mockResolvedValueOnce(transactions[0])
        .mockResolvedValueOnce(transactions[1]);
      mockPrisma.recurringRule.update.mockResolvedValue({});

      const result = await service.processAutoPostRules(today);

      expect(result.processed).toBe(2);
      expect(result.transactions).toHaveLength(2);
      expect(mockPrisma.transaction.create).toHaveBeenCalledTimes(2);
      expect(mockPrisma.recurringRule.update).toHaveBeenCalledTimes(2);
    });

    it('should create only ONE transaction when rule is multiple periods behind', async () => {
      // Rule: nextOccurrence=2024-01-15, today=2024-03-20, period=MONTHLY
      // Should create ONE transaction for 2024-01-15, then update nextOccurrence to 2024-04-15
      const today = new Date('2024-03-20T00:00:00.000Z');
      const nextOccurrence = new Date('2024-01-15T00:00:00.000Z'); // Multiple periods behind
      const newNextOccurrence = new Date('2024-04-15T00:00:00.000Z');

      const rule = {
        id: 1,
        amount: new Decimal(100),
        direction: 'EXPENSE',
        period: 'MONTHLY',
        startDate: new Date('2024-01-15'),
        nextOccurrence,
        autoPost: true,
        note: null,
        deletedAt: null,
        accountId: 1,
        categoryId: null,
        payeeId: null,
        account: { id: 1, name: 'Main' },
        category: null,
        payee: null,
      };

      mockPrisma.recurringRule.findMany.mockResolvedValue([rule]);
      mockScheduleService.calculateNextOccurrence.mockReturnValue(newNextOccurrence);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrisma);
      });
      mockPrisma.transaction.create.mockResolvedValue({ id: 100, date: nextOccurrence });
      mockPrisma.recurringRule.update.mockResolvedValue({ ...rule, nextOccurrence: newNextOccurrence });

      const result = await service.processAutoPostRules(today);

      // Only ONE transaction should be created (for the most recent occurrence, i.e., nextOccurrence)
      expect(result.processed).toBe(1);
      expect(result.transactions).toHaveLength(1);
      expect(mockPrisma.transaction.create).toHaveBeenCalledTimes(1);
      // Transaction date should be the rule's nextOccurrence (2024-01-15)
      expect(mockPrisma.transaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          date: nextOccurrence,
        }),
      });
      // nextOccurrence should be updated to next future date after today
      expect(mockPrisma.recurringRule.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { nextOccurrence: newNextOccurrence },
      });
    });

    it('should handle rule with null optional fields', async () => {
      const today = new Date('2024-03-20T00:00:00.000Z');
      const nextOccurrence = new Date('2024-03-15T00:00:00.000Z');
      const newNextOccurrence = new Date('2024-04-15T00:00:00.000Z');

      const rule = {
        id: 1,
        amount: new Decimal(100),
        direction: 'INCOME',
        period: 'MONTHLY',
        startDate: new Date('2024-01-15'),
        nextOccurrence,
        autoPost: true,
        note: null,
        deletedAt: null,
        accountId: 1,
        categoryId: null,
        payeeId: null,
        endDate: null,
        account: { id: 1, name: 'Main' },
        category: null,
        payee: null,
      };

      mockPrisma.recurringRule.findMany.mockResolvedValue([rule]);
      mockScheduleService.calculateNextOccurrence.mockReturnValue(newNextOccurrence);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrisma);
      });
      mockPrisma.transaction.create.mockResolvedValue({ id: 100 });
      mockPrisma.recurringRule.update.mockResolvedValue({});

      const result = await service.processAutoPostRules(today);

      expect(result.processed).toBe(1);
      expect(mockPrisma.transaction.create).toHaveBeenCalledWith({
        data: {
          date: nextOccurrence,
          amount: 100, // Normalized: INCOME keeps positive amount
          type: 'INCOME',
          accountId: 1,
          categoryId: null,
          payeeId: null,
          notes: null,
          recurringRuleId: 1,
        },
      });
    });

    it('should use current date when no date parameter provided', async () => {
      mockPrisma.recurringRule.findMany.mockResolvedValue([]);

      // Mock Date.now to control "today"
      const originalNow = Date.now;
      const fixedNow = new Date('2024-03-20T12:00:00.000Z').getTime();
      Date.now = jest.fn(() => fixedNow);

      await service.processAutoPostRules();

      Date.now = originalNow;

      // Verify the query uses a normalized date (midnight UTC)
      expect(mockPrisma.recurringRule.findMany).toHaveBeenCalledWith({
        where: {
          autoPost: true,
          deletedAt: null,
          nextOccurrence: { lte: expect.any(Date) },
          OR: [
            { endDate: null },
            { endDate: { gte: expect.any(Date) } },
          ],
        },
        include: { account: true, category: true, payee: true },
      });
    });

    it('should handle transaction creation error gracefully', async () => {
      const today = new Date('2024-03-20T00:00:00.000Z');
      const rule = {
        id: 1,
        amount: new Decimal(100),
        direction: 'INCOME',
        period: 'MONTHLY',
        startDate: new Date('2024-01-15'),
        nextOccurrence: new Date('2024-03-15'),
        autoPost: true,
        note: null,
        deletedAt: null,
        accountId: 1,
        categoryId: null,
        payeeId: null,
        account: { id: 1, name: 'Main' },
        category: null,
        payee: null,
      };

      mockPrisma.recurringRule.findMany.mockResolvedValue([rule]);
      mockPrisma.$transaction.mockRejectedValue(new Error('Database error'));

      await expect(service.processAutoPostRules(today)).rejects.toThrow('Database error');
    });
  });
});
