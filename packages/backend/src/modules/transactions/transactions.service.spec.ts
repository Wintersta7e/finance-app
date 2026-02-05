import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsService } from './transactions.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EntityNotFoundException } from '../../common';

describe('TransactionsService', () => {
  let service: TransactionsService;

  const mockPrisma = {
    transaction: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated transactions excluding soft-deleted', async () => {
      const mockTransactions = [
        {
          id: 1,
          date: new Date('2024-01-15'),
          amount: 100,
          type: 'INCOME',
          accountId: 1,
          deletedAt: null,
          account: { id: 1, name: 'Main' },
          category: null,
          payee: null,
        },
      ];
      mockPrisma.transaction.findMany.mockResolvedValue(mockTransactions);
      mockPrisma.transaction.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        include: { account: true, category: true, payee: true },
        orderBy: { date: 'desc' },
        skip: 0,
        take: 20,
      });
      expect(result.data).toEqual(mockTransactions);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
      expect(result.meta.totalPages).toBe(1);
    });

    it('should filter by accountId', async () => {
      mockPrisma.transaction.findMany.mockResolvedValue([]);
      mockPrisma.transaction.count.mockResolvedValue(0);

      await service.findAll({ page: 1, limit: 20, accountId: 5 });

      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deletedAt: null, accountId: 5 },
        }),
      );
    });

    it('should filter by categoryId', async () => {
      mockPrisma.transaction.findMany.mockResolvedValue([]);
      mockPrisma.transaction.count.mockResolvedValue(0);

      await service.findAll({ page: 1, limit: 20, categoryId: 3 });

      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deletedAt: null, categoryId: 3 },
        }),
      );
    });

    it('should filter by type', async () => {
      mockPrisma.transaction.findMany.mockResolvedValue([]);
      mockPrisma.transaction.count.mockResolvedValue(0);

      await service.findAll({ page: 1, limit: 20, type: 'INCOME' });

      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deletedAt: null, type: 'INCOME' },
        }),
      );
    });

    it('should filter by date range (inclusive)', async () => {
      mockPrisma.transaction.findMany.mockResolvedValue([]);
      mockPrisma.transaction.count.mockResolvedValue(0);

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      await service.findAll({ page: 1, limit: 20, startDate, endDate });

      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            deletedAt: null,
            date: {
              gte: startDate,
              lte: endDate,
            },
          },
        }),
      );
    });

    it('should calculate pagination correctly', async () => {
      mockPrisma.transaction.findMany.mockResolvedValue([]);
      mockPrisma.transaction.count.mockResolvedValue(55);

      const result = await service.findAll({ page: 2, limit: 20 });

      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 20,
        }),
      );
      expect(result.meta.totalPages).toBe(3);
    });
  });

  describe('findOne', () => {
    it('should return transaction with relations if found', async () => {
      const mockTransaction = {
        id: 1,
        date: new Date(),
        amount: 100,
        type: 'INCOME',
        accountId: 1,
        deletedAt: null,
        account: { id: 1, name: 'Main' },
        category: null,
        payee: null,
      };
      mockPrisma.transaction.findUnique.mockResolvedValue(mockTransaction);

      const result = await service.findOne(1);

      expect(mockPrisma.transaction.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: { account: true, category: true, payee: true },
      });
      expect(result).toEqual(mockTransaction);
    });

    it('should throw EntityNotFoundException if not found', async () => {
      mockPrisma.transaction.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(EntityNotFoundException);
    });

    it('should throw EntityNotFoundException if soft-deleted', async () => {
      mockPrisma.transaction.findUnique.mockResolvedValue({
        id: 1,
        deletedAt: new Date(),
      });

      await expect(service.findOne(1)).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('create', () => {
    it('should create and return new transaction with relations', async () => {
      const dto = {
        date: new Date('2024-01-15'),
        amount: 100,
        type: 'INCOME' as const,
        accountId: 1,
        categoryId: 2,
        notes: 'Test note',
      };
      const created = {
        id: 1,
        ...dto,
        deletedAt: null,
        account: { id: 1, name: 'Main' },
        category: { id: 2, name: 'Salary' },
        payee: null,
      };
      mockPrisma.transaction.create.mockResolvedValue(created);

      const result = await service.create(dto);

      expect(mockPrisma.transaction.create).toHaveBeenCalledWith({
        data: dto,
        include: { account: true, category: true, payee: true },
      });
      expect(result).toEqual(created);
    });
  });

  describe('update', () => {
    it('should update and return transaction with relations', async () => {
      const existing = {
        id: 1,
        date: new Date(),
        amount: 100,
        type: 'INCOME',
        accountId: 1,
        deletedAt: null,
      };
      const dto = { amount: 200, notes: 'Updated' };
      const updated = {
        ...existing,
        ...dto,
        account: { id: 1, name: 'Main' },
        category: null,
        payee: null,
      };

      mockPrisma.transaction.findUnique.mockResolvedValue(existing);
      mockPrisma.transaction.update.mockResolvedValue(updated);

      const result = await service.update(1, dto);

      expect(mockPrisma.transaction.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: dto,
        include: { account: true, category: true, payee: true },
      });
      expect(result).toEqual(updated);
    });

    it('should throw EntityNotFoundException if not found', async () => {
      mockPrisma.transaction.findUnique.mockResolvedValue(null);

      await expect(service.update(999, { amount: 100 })).rejects.toThrow(
        EntityNotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should soft-delete transaction', async () => {
      const existing = {
        id: 1,
        date: new Date(),
        amount: 100,
        type: 'INCOME',
        accountId: 1,
        deletedAt: null,
      };
      mockPrisma.transaction.findUnique.mockResolvedValue(existing);
      mockPrisma.transaction.update.mockResolvedValue({
        ...existing,
        deletedAt: new Date(),
      });

      await service.remove(1);

      expect(mockPrisma.transaction.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('should throw EntityNotFoundException if not found', async () => {
      mockPrisma.transaction.findUnique.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(EntityNotFoundException);
    });
  });
});
