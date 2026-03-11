import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let prisma: PrismaService;

  const mockPrisma = {
    transaction: {
      findMany: jest.fn(),
      aggregate: jest.fn(),
      groupBy: jest.fn(),
    },
    account: {
      findMany: jest.fn(),
      aggregate: jest.fn(),
    },
    budget: {
      findMany: jest.fn(),
    },
    recurringRule: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('getMonthSummary', () => {
    it('should calculate month summary with income, costs, and savings', async () => {
      const transactions = [
        { id: 1, type: 'INCOME', amount: new Decimal(5000) },
        { id: 2, type: 'FIXED_COST', amount: new Decimal(-1000) },
        { id: 3, type: 'FIXED_COST', amount: new Decimal(-500) },
        { id: 4, type: 'VARIABLE_EXPENSE', amount: new Decimal(-800) },
        { id: 5, type: 'VARIABLE_EXPENSE', amount: new Decimal(-200) },
      ];
      mockPrisma.transaction.findMany.mockResolvedValue(transactions);
      mockPrisma.account.findMany.mockResolvedValue([
        { id: 1, initialBalance: new Decimal(1000) },
      ]);
      // For endBalance calculation
      mockPrisma.transaction.aggregate.mockResolvedValue({
        _sum: { amount: new Decimal(2500) }, // 5000 - 1000 - 500 - 800 - 200
      });

      const result = await service.getMonthSummary(2024, 3);

      expect(result.totalIncome).toBe(5000);
      expect(result.fixedCosts).toBe(1500);
      expect(result.variableExpenses).toBe(1000);
      expect(result.savings).toBe(2500); // 5000 - 1500 - 1000
      expect(result.endBalance).toBe(3500); // 1000 (initial) + 2500 (sum)
    });

    it('should handle empty transactions', async () => {
      mockPrisma.transaction.findMany.mockResolvedValue([]);
      mockPrisma.account.findMany.mockResolvedValue([
        { id: 1, initialBalance: new Decimal(1000) },
      ]);
      mockPrisma.transaction.aggregate.mockResolvedValue({ _sum: { amount: null } });

      const result = await service.getMonthSummary(2024, 3);

      expect(result.totalIncome).toBe(0);
      expect(result.fixedCosts).toBe(0);
      expect(result.variableExpenses).toBe(0);
      expect(result.savings).toBe(0);
      expect(result.endBalance).toBe(1000);
    });
  });

  describe('getCategoryBreakdown', () => {
    it('should group expenses by category and skip uncategorized', async () => {
      const transactions = [
        { categoryId: 1, category: { id: 1, name: 'Groceries' }, amount: new Decimal(-500) },
        { categoryId: 1, category: { id: 1, name: 'Groceries' }, amount: new Decimal(-300) },
        { categoryId: 2, category: { id: 2, name: 'Transport' }, amount: new Decimal(-200) },
        { categoryId: null, category: null, amount: new Decimal(-100) }, // Should be skipped
      ];
      mockPrisma.transaction.findMany.mockResolvedValue(transactions);

      const result = await service.getCategoryBreakdown(2024, 3);

      // Only 2 categories - uncategorized transactions are skipped (Java compatibility)
      expect(result).toHaveLength(2);
      expect(result).toContainEqual({ categoryId: 1, categoryName: 'Groceries', amount: 800 });
      expect(result).toContainEqual({ categoryId: 2, categoryName: 'Transport', amount: 200 });
    });

    it('should return empty array when no expenses', async () => {
      mockPrisma.transaction.findMany.mockResolvedValue([]);

      const result = await service.getCategoryBreakdown(2024, 3);

      expect(result).toEqual([]);
    });
  });

  describe('getNetWorthTrend', () => {
    it('should calculate daily balance points', async () => {
      mockPrisma.account.findMany.mockResolvedValue([
        { id: 1, initialBalance: new Decimal(1000), deletedAt: null },
      ]);

      // Prior balance aggregate (sum of transactions before the first sample date)
      mockPrisma.transaction.aggregate.mockResolvedValueOnce({
        _sum: { amount: new Decimal(500) },
      });

      // Transactions in the sample range, ordered by date
      mockPrisma.transaction.findMany.mockResolvedValue([
        { date: new Date('2024-03-01T12:00:00Z'), amount: new Decimal(0) },   // no change on day 1
        { date: new Date('2024-03-02T10:00:00Z'), amount: new Decimal(200) },  // +200 on day 2
        { date: new Date('2024-03-03T08:00:00Z'), amount: new Decimal(-100) }, // -100 on day 3
      ]);

      const from = new Date('2024-03-01');
      const to = new Date('2024-03-03');

      const result = await service.getNetWorthTrend(from, to);

      expect(result).toHaveLength(3);
      // Day 1: 1000 (initial) + 500 (prior) + 0 = 1500
      expect(result[0]).toEqual({ date: '2024-03-01', balance: 1500 });
      // Day 2: 1500 + 200 = 1700
      expect(result[1]).toEqual({ date: '2024-03-02', balance: 1700 });
      // Day 3: 1700 - 100 = 1600
      expect(result[2]).toEqual({ date: '2024-03-03', balance: 1600 });
    });

    it('should limit date range to prevent excessive queries', async () => {
      mockPrisma.account.findMany.mockResolvedValue([
        { id: 1, initialBalance: new Decimal(1000), deletedAt: null },
      ]);
      mockPrisma.transaction.aggregate.mockResolvedValue({ _sum: { amount: null } });
      mockPrisma.transaction.findMany.mockResolvedValue([]);

      const from = new Date('2020-01-01');
      const to = new Date('2024-12-31'); // ~5 years = 1800+ days

      const result = await service.getNetWorthTrend(from, to);

      // Should be limited to 365 points max
      expect(result.length).toBeLessThanOrEqual(365);
    });
  });

  describe('getBudgetVsActual', () => {
    it('should compare budgets to actual spending', async () => {
      const transactions = [
        { categoryId: 1, category: { id: 1, name: 'Groceries' }, amount: new Decimal(-450) },
        { categoryId: 1, category: { id: 1, name: 'Groceries' }, amount: new Decimal(-50) },
        { categoryId: 2, category: { id: 2, name: 'Transport' }, amount: new Decimal(-150) },
      ];
      const budgets = [
        { categoryId: 1, category: { id: 1, name: 'Groceries' }, amount: new Decimal(500) },
        { categoryId: 2, category: { id: 2, name: 'Transport' }, amount: new Decimal(200) },
        { categoryId: 3, category: { id: 3, name: 'Entertainment' }, amount: new Decimal(100) },
      ];

      mockPrisma.transaction.findMany.mockResolvedValue(transactions);
      mockPrisma.budget.findMany.mockResolvedValue(budgets);

      const result = await service.getBudgetVsActual(2024, 3);

      expect(result).toHaveLength(3);
      expect(result).toContainEqual({ categoryId: 1, categoryName: 'Groceries', budgeted: 500, actual: 500 });
      expect(result).toContainEqual({ categoryId: 2, categoryName: 'Transport', budgeted: 200, actual: 150 });
      expect(result).toContainEqual({ categoryId: 3, categoryName: 'Entertainment', budgeted: 100, actual: 0 });
    });

    it('should handle categories with spending but no budget', async () => {
      const transactions = [
        { categoryId: 1, category: { id: 1, name: 'Groceries' }, amount: new Decimal(-200) },
      ];
      mockPrisma.transaction.findMany.mockResolvedValue(transactions);
      mockPrisma.budget.findMany.mockResolvedValue([]);

      const result = await service.getBudgetVsActual(2024, 3);

      // Categories without budgets should not appear in results
      expect(result).toEqual([]);
    });
  });

  describe('getRecurringCostSummary', () => {
    it('should calculate monthly equivalent of recurring expenses', async () => {
      const rules = [
        { id: 1, amount: new Decimal(100), direction: 'EXPENSE', period: 'DAILY' },
        { id: 2, amount: new Decimal(50), direction: 'EXPENSE', period: 'WEEKLY' },
        { id: 3, amount: new Decimal(500), direction: 'EXPENSE', period: 'MONTHLY' },
        { id: 4, amount: new Decimal(1200), direction: 'EXPENSE', period: 'YEARLY' },
      ];
      mockPrisma.recurringRule.findMany.mockResolvedValue(rules);

      const result = await service.getRecurringCostSummary();

      // DAILY: 100 * 30 = 3000
      // WEEKLY: 50 * 4 = 200
      // MONTHLY: 500 * 1 = 500
      // YEARLY: 1200 / 12 = 100
      // Total: 3800
      expect(result.monthlyTotal).toBe(3800);
    });

    it('should only query for expense rules', async () => {
      // Service filters by direction: 'EXPENSE' in the query,
      // so only expense rules should be returned by Prisma
      const rules = [
        { id: 1, amount: new Decimal(100), direction: 'EXPENSE', period: 'MONTHLY' },
      ];
      mockPrisma.recurringRule.findMany.mockResolvedValue(rules);

      const result = await service.getRecurringCostSummary();

      expect(result.monthlyTotal).toBe(100);
      expect(mockPrisma.recurringRule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            direction: 'EXPENSE',
          }),
        }),
      );
    });

    it('should return zero when no recurring expenses', async () => {
      mockPrisma.recurringRule.findMany.mockResolvedValue([]);

      const result = await service.getRecurringCostSummary();

      expect(result.monthlyTotal).toBe(0);
    });
  });

  describe('calculateBalanceUpTo', () => {
    it('should sum initial balances and non-transfer transactions up to date', async () => {
      mockPrisma.account.findMany.mockResolvedValue([
        { id: 1, initialBalance: new Decimal(1000), deletedAt: null },
        { id: 2, initialBalance: new Decimal(500), deletedAt: null },
      ]);
      mockPrisma.transaction.aggregate.mockResolvedValue({
        _sum: { amount: new Decimal(200) },
      });

      const testDate = new Date('2024-03-15');
      const result = await service.calculateBalanceUpTo(testDate);

      expect(result).toBe(1700); // 1000 + 500 + 200
      expect(mockPrisma.transaction.aggregate).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          type: { not: 'TRANSFER' },
          date: { lte: testDate },
        },
        _sum: { amount: true },
      });
    });

    it('should exclude soft-deleted accounts', async () => {
      mockPrisma.account.findMany.mockResolvedValue([
        { id: 1, initialBalance: new Decimal(1000), deletedAt: null },
      ]);
      mockPrisma.transaction.aggregate.mockResolvedValue({
        _sum: { amount: null },
      });

      const result = await service.calculateBalanceUpTo(new Date('2024-03-15'));

      expect(result).toBe(1000);
      expect(mockPrisma.account.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
      });
    });
  });
});
