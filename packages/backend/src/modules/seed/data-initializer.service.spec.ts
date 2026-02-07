import { Test, TestingModule } from '@nestjs/testing';
import { DataInitializerService } from './data-initializer.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('DataInitializerService', () => {
  let service: DataInitializerService;

  const mockPrisma = {
    appSettings: {
      count: jest.fn(),
      create: jest.fn(),
    },
    account: {
      count: jest.fn(),
      create: jest.fn(),
    },
    category: {
      count: jest.fn(),
      createMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataInitializerService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<DataInitializerService>(DataInitializerService);
    jest.clearAllMocks();
  });

  describe('seedSettings', () => {
    it('should seed default settings when table is empty', async () => {
      mockPrisma.appSettings.count.mockResolvedValue(0);
      mockPrisma.appSettings.create.mockResolvedValue({
        id: 1,
        currencyCode: 'EUR',
        firstDayOfMonth: 1,
        firstDayOfWeek: 1,
      });

      await service.onModuleInit();

      expect(mockPrisma.appSettings.count).toHaveBeenCalled();
      expect(mockPrisma.appSettings.create).toHaveBeenCalledWith({
        data: {
          id: 1,
          currencyCode: 'EUR',
          firstDayOfMonth: 1,
          firstDayOfWeek: 1,
        },
      });
    });

    it('should NOT seed settings when table has data', async () => {
      mockPrisma.appSettings.count.mockResolvedValue(1);
      mockPrisma.account.count.mockResolvedValue(0);
      mockPrisma.account.create.mockResolvedValue({});
      mockPrisma.category.count.mockResolvedValue(0);
      mockPrisma.category.createMany.mockResolvedValue({ count: 8 });

      await service.onModuleInit();

      expect(mockPrisma.appSettings.count).toHaveBeenCalled();
      expect(mockPrisma.appSettings.create).not.toHaveBeenCalled();
    });
  });

  describe('seedDefaultAccount', () => {
    it('should seed default account when table is empty', async () => {
      mockPrisma.appSettings.count.mockResolvedValue(0);
      mockPrisma.appSettings.create.mockResolvedValue({});
      mockPrisma.account.count.mockResolvedValue(0);
      mockPrisma.account.create.mockResolvedValue({
        id: 1,
        name: 'Main Account',
        type: 'CHECKING',
        initialBalance: 0,
        archived: false,
      });
      mockPrisma.category.count.mockResolvedValue(0);
      mockPrisma.category.createMany.mockResolvedValue({ count: 8 });

      await service.onModuleInit();

      expect(mockPrisma.account.count).toHaveBeenCalled();
      expect(mockPrisma.account.create).toHaveBeenCalledWith({
        data: {
          name: 'Main Account',
          type: 'CHECKING',
          initialBalance: 0,
          archived: false,
        },
      });
    });

    it('should NOT seed account when table has data', async () => {
      mockPrisma.appSettings.count.mockResolvedValue(0);
      mockPrisma.appSettings.create.mockResolvedValue({});
      mockPrisma.account.count.mockResolvedValue(1);
      mockPrisma.category.count.mockResolvedValue(0);
      mockPrisma.category.createMany.mockResolvedValue({ count: 8 });

      await service.onModuleInit();

      expect(mockPrisma.account.count).toHaveBeenCalled();
      expect(mockPrisma.account.create).not.toHaveBeenCalled();
    });
  });

  describe('seedCategories', () => {
    it('should seed all 8 default categories when table is empty', async () => {
      mockPrisma.appSettings.count.mockResolvedValue(0);
      mockPrisma.appSettings.create.mockResolvedValue({});
      mockPrisma.account.count.mockResolvedValue(0);
      mockPrisma.account.create.mockResolvedValue({});
      mockPrisma.category.count.mockResolvedValue(0);
      mockPrisma.category.createMany.mockResolvedValue({ count: 8 });

      await service.onModuleInit();

      expect(mockPrisma.category.count).toHaveBeenCalled();
      expect(mockPrisma.category.createMany).toHaveBeenCalledWith({
        data: [
          { name: 'Salary', kind: 'INCOME', fixedCost: false },
          { name: 'Other income', kind: 'INCOME', fixedCost: false },
          { name: 'Rent', kind: 'EXPENSE', fixedCost: true },
          { name: 'Utilities', kind: 'EXPENSE', fixedCost: true },
          { name: 'Insurance', kind: 'EXPENSE', fixedCost: true },
          { name: 'Groceries', kind: 'EXPENSE', fixedCost: false },
          { name: 'Transport', kind: 'EXPENSE', fixedCost: false },
          { name: 'Entertainment', kind: 'EXPENSE', fixedCost: false },
        ],
      });
    });

    it('should NOT seed categories when table has data', async () => {
      mockPrisma.appSettings.count.mockResolvedValue(0);
      mockPrisma.appSettings.create.mockResolvedValue({});
      mockPrisma.account.count.mockResolvedValue(0);
      mockPrisma.account.create.mockResolvedValue({});
      mockPrisma.category.count.mockResolvedValue(5);

      await service.onModuleInit();

      expect(mockPrisma.category.count).toHaveBeenCalled();
      expect(mockPrisma.category.createMany).not.toHaveBeenCalled();
    });
  });

  describe('idempotency', () => {
    it('should not duplicate data when onModuleInit is called multiple times', async () => {
      // First call: tables are empty, seed everything
      mockPrisma.appSettings.count.mockResolvedValue(0);
      mockPrisma.appSettings.create.mockResolvedValue({});
      mockPrisma.account.count.mockResolvedValue(0);
      mockPrisma.account.create.mockResolvedValue({});
      mockPrisma.category.count.mockResolvedValue(0);
      mockPrisma.category.createMany.mockResolvedValue({ count: 8 });

      await service.onModuleInit();

      expect(mockPrisma.appSettings.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.account.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.category.createMany).toHaveBeenCalledTimes(1);

      // Second call: tables now have data, should NOT seed again
      mockPrisma.appSettings.count.mockResolvedValue(1);
      mockPrisma.account.count.mockResolvedValue(1);
      mockPrisma.category.count.mockResolvedValue(8);

      await service.onModuleInit();

      // Still only called once total (from first call)
      expect(mockPrisma.appSettings.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.account.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.category.createMany).toHaveBeenCalledTimes(1);
    });
  });
});
