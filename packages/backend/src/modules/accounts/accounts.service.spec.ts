import { Test, TestingModule } from '@nestjs/testing';
import { AccountsService } from './accounts.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EntityNotFoundException, EntityInUseException } from '../../common';

describe('AccountsService', () => {
  let service: AccountsService;
  let prisma: PrismaService;

  const mockPrisma = {
    account: {
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
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AccountsService>(AccountsService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return accounts excluding soft-deleted', async () => {
      const mockAccounts = [{ id: 1, name: 'Main', deletedAt: null }];
      mockPrisma.account.findMany.mockResolvedValue(mockAccounts);

      const result = await service.findAll();

      expect(mockPrisma.account.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        orderBy: { name: 'asc' },
      });
      expect(result).toEqual(mockAccounts);
    });
  });

  describe('findOne', () => {
    it('should return account if found', async () => {
      const mockAccount = { id: 1, name: 'Main', deletedAt: null };
      mockPrisma.account.findUnique.mockResolvedValue(mockAccount);

      const result = await service.findOne(1);

      expect(result).toEqual(mockAccount);
    });

    it('should throw EntityNotFoundException if not found', async () => {
      mockPrisma.account.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(EntityNotFoundException);
    });

    it('should throw EntityNotFoundException if soft-deleted', async () => {
      mockPrisma.account.findUnique.mockResolvedValue({ id: 1, deletedAt: new Date() });

      await expect(service.findOne(1)).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('create', () => {
    it('should create and return new account', async () => {
      const dto = { name: 'New Account' };
      const created = { id: 1, ...dto, type: 'CHECKING', initialBalance: 0 };
      mockPrisma.account.create.mockResolvedValue(created);

      const result = await service.create(dto);

      expect(mockPrisma.account.create).toHaveBeenCalledWith({ data: dto });
      expect(result).toEqual(created);
    });
  });

  describe('remove', () => {
    it('should soft-delete account if no dependencies', async () => {
      mockPrisma.account.findUnique.mockResolvedValue({ id: 1, deletedAt: null });
      mockPrisma.transaction.count.mockResolvedValue(0);
      mockPrisma.recurringRule.count.mockResolvedValue(0);
      mockPrisma.account.update.mockResolvedValue({ id: 1, deletedAt: new Date() });

      await service.remove(1);

      expect(mockPrisma.account.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('should throw EntityInUseException if has transactions', async () => {
      mockPrisma.account.findUnique.mockResolvedValue({ id: 1, deletedAt: null });
      mockPrisma.transaction.count.mockResolvedValue(5);

      await expect(service.remove(1)).rejects.toThrow(EntityInUseException);
    });

    it('should throw EntityInUseException if has recurring rules', async () => {
      mockPrisma.account.findUnique.mockResolvedValue({ id: 1, deletedAt: null });
      mockPrisma.transaction.count.mockResolvedValue(0);
      mockPrisma.recurringRule.count.mockResolvedValue(2);

      await expect(service.remove(1)).rejects.toThrow(EntityInUseException);
    });
  });
});
