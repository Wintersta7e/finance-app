import { Test, TestingModule } from '@nestjs/testing';
import { ExportService, ExportData, ImportSummary } from './export.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';

describe('ExportService', () => {
  let service: ExportService;

  const createMockPrisma = () => ({
    account: { findMany: jest.fn(), updateMany: jest.fn(), createMany: jest.fn(), create: jest.fn() },
    category: { findMany: jest.fn(), updateMany: jest.fn(), createMany: jest.fn(), create: jest.fn() },
    transaction: { findMany: jest.fn(), updateMany: jest.fn(), createMany: jest.fn(), create: jest.fn() },
    recurringRule: { findMany: jest.fn(), updateMany: jest.fn(), createMany: jest.fn(), create: jest.fn() },
    budget: { findMany: jest.fn(), updateMany: jest.fn(), createMany: jest.fn(), create: jest.fn() },
    tag: { findMany: jest.fn(), updateMany: jest.fn(), createMany: jest.fn(), create: jest.fn() },
    payee: { findMany: jest.fn(), updateMany: jest.fn(), createMany: jest.fn(), create: jest.fn() },
    savingsGoal: { findMany: jest.fn(), updateMany: jest.fn(), createMany: jest.fn(), create: jest.fn() },
    appSettings: { findUnique: jest.fn(), upsert: jest.fn() },
    transactionTag: { deleteMany: jest.fn(), createMany: jest.fn() },
    $transaction: jest.fn(),
  });

  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(async () => {
    mockPrisma = createMockPrisma();
    mockPrisma.$transaction.mockImplementation(async (callback: (tx: typeof mockPrisma) => Promise<unknown>) => {
      return callback(mockPrisma);
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExportService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ExportService>(ExportService);
    jest.clearAllMocks();
  });

  describe('exportJson', () => {
    it('should export all data excluding soft-deleted records', async () => {
      const mockAccounts = [
        { id: 1, name: 'Checking', type: 'CHECKING', initialBalance: 1000, archived: false, deletedAt: null },
      ];
      const mockCategories = [
        { id: 1, name: 'Groceries', kind: 'EXPENSE', fixedCost: false, deletedAt: null },
      ];
      const mockTransactions = [
        {
          id: 1,
          date: new Date('2024-03-15'),
          amount: -50,
          type: 'VARIABLE_EXPENSE',
          accountId: 1,
          categoryId: 1,
          notes: 'Weekly groceries',
          deletedAt: null,
          account: { name: 'Checking' },
          category: { name: 'Groceries' },
          payee: null,
          tags: [] as unknown[],
        },
      ];
      const mockRecurringRules: unknown[] = [];
      const mockBudgets: unknown[] = [];
      const mockTags: unknown[] = [];
      const mockPayees: unknown[] = [];
      const mockGoals: unknown[] = [];
      const mockSettings = { id: 1, currencyCode: 'EUR', firstDayOfMonth: 1, firstDayOfWeek: 1 };

      mockPrisma.account.findMany.mockResolvedValue(mockAccounts);
      mockPrisma.category.findMany.mockResolvedValue(mockCategories);
      mockPrisma.transaction.findMany.mockResolvedValue(mockTransactions);
      mockPrisma.recurringRule.findMany.mockResolvedValue(mockRecurringRules);
      mockPrisma.budget.findMany.mockResolvedValue(mockBudgets);
      mockPrisma.tag.findMany.mockResolvedValue(mockTags);
      mockPrisma.payee.findMany.mockResolvedValue(mockPayees);
      mockPrisma.savingsGoal.findMany.mockResolvedValue(mockGoals);
      mockPrisma.appSettings.findUnique.mockResolvedValue(mockSettings);

      const result = await service.exportJson();

      expect(result.version).toBe('1.0');
      expect(result.exportedAt).toBeDefined();
      expect(result.data.accounts).toEqual(mockAccounts);
      expect(result.data.categories).toEqual(mockCategories);
      expect(result.data.transactions).toEqual(mockTransactions);
      expect(result.data.settings).toEqual(mockSettings);

      // Verify soft-deleted records are excluded
      expect(mockPrisma.account.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
      });
      expect(mockPrisma.category.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
      });
      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        include: { account: true, category: true, payee: true, tags: { include: { tag: true } } },
      });
    });

    it('should include relations in transaction export', async () => {
      const mockTransactions = [
        {
          id: 1,
          date: new Date('2024-03-15'),
          amount: -50,
          type: 'VARIABLE_EXPENSE',
          accountId: 1,
          categoryId: 1,
          payeeId: 1,
          notes: 'Test',
          deletedAt: null,
          account: { id: 1, name: 'Checking' },
          category: { id: 1, name: 'Groceries' },
          payee: { id: 1, name: 'Walmart' },
          tags: [{ tag: { id: 1, name: 'essential' } }],
        },
      ];

      mockPrisma.account.findMany.mockResolvedValue([]);
      mockPrisma.category.findMany.mockResolvedValue([]);
      mockPrisma.transaction.findMany.mockResolvedValue(mockTransactions);
      mockPrisma.recurringRule.findMany.mockResolvedValue([]);
      mockPrisma.budget.findMany.mockResolvedValue([]);
      mockPrisma.tag.findMany.mockResolvedValue([]);
      mockPrisma.payee.findMany.mockResolvedValue([]);
      mockPrisma.savingsGoal.findMany.mockResolvedValue([]);
      mockPrisma.appSettings.findUnique.mockResolvedValue(null);

      const result = await service.exportJson();

      expect(result.data.transactions[0].account).toEqual({ id: 1, name: 'Checking' });
      expect(result.data.transactions[0].category).toEqual({ id: 1, name: 'Groceries' });
      expect(result.data.transactions[0].payee).toEqual({ id: 1, name: 'Walmart' });
    });

    it('should handle dates in ISO 8601 format', async () => {
      const testDate = new Date('2024-03-15T10:30:00.000Z');
      const mockTransactions = [
        {
          id: 1,
          date: testDate,
          amount: -50,
          type: 'VARIABLE_EXPENSE',
          accountId: 1,
          deletedAt: null,
          account: { name: 'Checking' },
          category: null,
          payee: null,
          tags: [] as unknown[],
        },
      ];

      mockPrisma.account.findMany.mockResolvedValue([]);
      mockPrisma.category.findMany.mockResolvedValue([]);
      mockPrisma.transaction.findMany.mockResolvedValue(mockTransactions);
      mockPrisma.recurringRule.findMany.mockResolvedValue([]);
      mockPrisma.budget.findMany.mockResolvedValue([]);
      mockPrisma.tag.findMany.mockResolvedValue([]);
      mockPrisma.payee.findMany.mockResolvedValue([]);
      mockPrisma.savingsGoal.findMany.mockResolvedValue([]);
      mockPrisma.appSettings.findUnique.mockResolvedValue(null);

      const result = await service.exportJson();

      // exportedAt should be an ISO string
      expect(typeof result.exportedAt).toBe('string');
      expect(result.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('exportTransactionsCsv', () => {
    it('should export transactions as CSV with headers', async () => {
      const mockTransactions = [
        {
          id: 1,
          date: new Date('2024-03-15'),
          amount: -50,
          type: 'VARIABLE_EXPENSE',
          accountId: 1,
          categoryId: 1,
          payeeId: 1,
          notes: 'Weekly groceries',
          deletedAt: null,
          account: { name: 'Checking' },
          category: { name: 'Groceries' },
          payee: { name: 'Walmart' },
        },
      ];

      mockPrisma.transaction.findMany.mockResolvedValue(mockTransactions);

      const result = await service.exportTransactionsCsv();

      expect(result).toContain('date,amount,type,account,category,payee,notes');
      expect(result).toContain('2024-03-15,-50,VARIABLE_EXPENSE,Checking,Groceries,Walmart,Weekly groceries');
    });

    it('should handle null relations in CSV', async () => {
      const mockTransactions = [
        {
          id: 1,
          date: new Date('2024-03-15'),
          amount: 1000,
          type: 'INCOME',
          accountId: 1,
          categoryId: null,
          payeeId: null,
          notes: null,
          deletedAt: null,
          account: { name: 'Checking' },
          category: null,
          payee: null,
        },
      ];

      mockPrisma.transaction.findMany.mockResolvedValue(mockTransactions);

      const result = await service.exportTransactionsCsv();

      expect(result).toContain('2024-03-15,1000,INCOME,Checking,,,');
    });

    it('should escape CSV special characters', async () => {
      const mockTransactions = [
        {
          id: 1,
          date: new Date('2024-03-15'),
          amount: -50,
          type: 'VARIABLE_EXPENSE',
          accountId: 1,
          notes: 'Notes with, comma and "quotes"',
          deletedAt: null,
          account: { name: 'My "Checking" Account' },
          category: null,
          payee: null,
        },
      ];

      mockPrisma.transaction.findMany.mockResolvedValue(mockTransactions);

      const result = await service.exportTransactionsCsv();

      // Values with commas or quotes should be properly escaped
      expect(result).toContain('"My ""Checking"" Account"');
      expect(result).toContain('"Notes with, comma and ""quotes"""');
    });

    it('should exclude soft-deleted transactions from CSV', async () => {
      mockPrisma.transaction.findMany.mockResolvedValue([]);

      await service.exportTransactionsCsv();

      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        include: { account: true, category: true, payee: true },
        orderBy: { date: 'desc' },
      });
    });
  });

  describe('importJson - replace mode', () => {
    const validImportData: ExportData = {
      version: '1.0',
      exportedAt: '2024-03-20T12:00:00Z',
      data: {
        accounts: [{ id: 1, name: 'Checking', type: 'CHECKING', initialBalance: 1000, archived: false }],
        categories: [{ id: 1, name: 'Groceries', kind: 'EXPENSE', fixedCost: false }],
        transactions: [],
        recurringRules: [],
        budgets: [],
        tags: [],
        payees: [],
        goals: [],
        settings: { currencyCode: 'EUR', firstDayOfMonth: 1, firstDayOfWeek: 1 },
      },
    };

    it('should soft-delete existing data and create new records in replace mode', async () => {
      mockPrisma.account.create.mockResolvedValue({ id: 10 });
      mockPrisma.category.create.mockResolvedValue({ id: 10 });

      const result = await service.importJson(validImportData, 'replace');

      // Should soft-delete existing records
      expect(mockPrisma.transaction.updateMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        data: { deletedAt: expect.any(Date) },
      });
      expect(mockPrisma.account.updateMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        data: { deletedAt: expect.any(Date) },
      });

      expect(result.imported.accounts).toBe(1);
      expect(result.imported.categories).toBe(1);
    });

    it('should return import summary with counts', async () => {
      const importData: ExportData = {
        version: '1.0',
        exportedAt: '2024-03-20T12:00:00Z',
        data: {
          accounts: [
            { id: 1, name: 'Checking', type: 'CHECKING', initialBalance: 1000, archived: false },
            { id: 2, name: 'Savings', type: 'SAVINGS', initialBalance: 5000, archived: false },
          ],
          categories: [
            { id: 1, name: 'Groceries', kind: 'EXPENSE', fixedCost: false },
          ],
          transactions: [
            { id: 1, date: '2024-03-15', amount: -50, type: 'VARIABLE_EXPENSE', accountId: 1, categoryId: 1 },
            { id: 2, date: '2024-03-16', amount: 1000, type: 'INCOME', accountId: 1 },
          ],
          recurringRules: [],
          budgets: [],
          tags: [{ id: 1, name: 'essential', color: '#ff0000' }],
          payees: [],
          goals: [],
          settings: { currencyCode: 'EUR', firstDayOfMonth: 1, firstDayOfWeek: 1 },
        },
      };

      mockPrisma.account.create.mockResolvedValueOnce({ id: 10 }).mockResolvedValueOnce({ id: 11 });
      mockPrisma.category.create.mockResolvedValue({ id: 10 });
      mockPrisma.tag.create.mockResolvedValue({ id: 10 });
      mockPrisma.transaction.create.mockResolvedValue({ id: 10 });

      const result = await service.importJson(importData, 'replace');

      expect(result.imported.accounts).toBe(2);
      expect(result.imported.categories).toBe(1);
      expect(result.imported.transactions).toBe(2);
      expect(result.imported.tags).toBe(1);
    });
  });

  describe('importJson - merge mode', () => {
    it('should update existing records by ID and create new ones in merge mode', async () => {
      const importData: ExportData = {
        version: '1.0',
        exportedAt: '2024-03-20T12:00:00Z',
        data: {
          accounts: [
            { id: 1, name: 'Updated Checking', type: 'CHECKING', initialBalance: 2000, archived: false },
            { id: 99, name: 'New Account', type: 'SAVINGS', initialBalance: 0, archived: false },
          ],
          categories: [],
          transactions: [],
          recurringRules: [],
          budgets: [],
          tags: [],
          payees: [],
          goals: [],
          settings: null,
        },
      };

      mockPrisma.account.create.mockResolvedValue({ id: 10 });

      const result = await service.importJson(importData, 'merge');

      expect(result.imported.accounts).toBe(2);
    });
  });

  describe('importJson - validation', () => {
    it('should reject import data without version', async () => {
      const invalidData = {
        exportedAt: '2024-03-20T12:00:00Z',
        data: {
          accounts: [],
          categories: [],
          transactions: [],
          recurringRules: [],
          budgets: [],
          tags: [],
          payees: [],
          goals: [],
          settings: null,
        },
      } as unknown as ExportData;

      await expect(service.importJson(invalidData, 'replace')).rejects.toThrow(BadRequestException);
    });

    it('should reject import data without data object', async () => {
      const invalidData = {
        version: '1.0',
        exportedAt: '2024-03-20T12:00:00Z',
      } as unknown as ExportData;

      await expect(service.importJson(invalidData, 'replace')).rejects.toThrow(BadRequestException);
    });

    it('should reject unsupported version', async () => {
      const invalidData: ExportData = {
        version: '2.0',
        exportedAt: '2024-03-20T12:00:00Z',
        data: {
          accounts: [],
          categories: [],
          transactions: [],
          recurringRules: [],
          budgets: [],
          tags: [],
          payees: [],
          goals: [],
          settings: null,
        },
      };

      await expect(service.importJson(invalidData, 'replace')).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid import mode', async () => {
      const validData: ExportData = {
        version: '1.0',
        exportedAt: '2024-03-20T12:00:00Z',
        data: {
          accounts: [],
          categories: [],
          transactions: [],
          recurringRules: [],
          budgets: [],
          tags: [],
          payees: [],
          goals: [],
          settings: null,
        },
      };

      await expect(service.importJson(validData, 'invalid' as 'replace')).rejects.toThrow(BadRequestException);
    });
  });
});
