import { Test, TestingModule } from '@nestjs/testing';
import { PayeesService } from './payees.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EntityNotFoundException, EntityInUseException } from '../../common';
import { ConflictException } from '@nestjs/common';

describe('PayeesService', () => {
  let service: PayeesService;
  let prisma: PrismaService;

  const mockPrisma = {
    payee: {
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
        PayeesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PayeesService>(PayeesService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return payees excluding soft-deleted, ordered by name', async () => {
      const mockPayees = [
        { id: 1, name: 'Amazon', notes: 'Online shopping', deletedAt: null },
        { id: 2, name: 'Walmart', notes: null, deletedAt: null },
      ];
      mockPrisma.payee.findMany.mockResolvedValue(mockPayees);

      const result = await service.findAll();

      expect(mockPrisma.payee.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        orderBy: { name: 'asc' },
      });
      expect(result).toEqual(mockPayees);
    });

    it('should return empty array when no payees exist', async () => {
      mockPrisma.payee.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return payee if found', async () => {
      const mockPayee = { id: 1, name: 'Amazon', notes: 'Online shopping', deletedAt: null };
      mockPrisma.payee.findUnique.mockResolvedValue(mockPayee);

      const result = await service.findOne(1);

      expect(mockPrisma.payee.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toEqual(mockPayee);
    });

    it('should throw EntityNotFoundException if not found', async () => {
      mockPrisma.payee.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(EntityNotFoundException);
    });

    it('should throw EntityNotFoundException if soft-deleted', async () => {
      mockPrisma.payee.findUnique.mockResolvedValue({ id: 1, deletedAt: new Date() });

      await expect(service.findOne(1)).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('create', () => {
    it('should create and return new payee', async () => {
      const dto = { name: 'Amazon', notes: 'Online shopping' };
      const created = { id: 1, ...dto, deletedAt: null, createdAt: new Date(), updatedAt: new Date() };
      mockPrisma.payee.create.mockResolvedValue(created);

      const result = await service.create(dto);

      expect(mockPrisma.payee.create).toHaveBeenCalledWith({ data: dto });
      expect(result).toEqual(created);
    });

    it('should create payee without notes', async () => {
      const dto = { name: 'Walmart' };
      const created = { id: 1, name: 'Walmart', notes: null, deletedAt: null };
      mockPrisma.payee.create.mockResolvedValue(created);

      const result = await service.create(dto);

      expect(mockPrisma.payee.create).toHaveBeenCalledWith({ data: dto });
      expect(result).toEqual(created);
    });

    it('should throw ConflictException for duplicate name', async () => {
      const dto = { name: 'Existing' };
      const prismaError = new Error('Unique constraint failed');
      (prismaError as any).code = 'P2002';
      mockPrisma.payee.create.mockRejectedValue(prismaError);

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('should update and return payee', async () => {
      const dto = { name: 'Updated Amazon' };
      mockPrisma.payee.findUnique.mockResolvedValue({ id: 1, name: 'Amazon', notes: 'Online shopping', deletedAt: null });
      mockPrisma.payee.update.mockResolvedValue({ id: 1, name: 'Updated Amazon', notes: 'Online shopping', deletedAt: null });

      const result = await service.update(1, dto);

      expect(mockPrisma.payee.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: dto,
      });
      expect(result.name).toBe('Updated Amazon');
    });

    it('should update only notes', async () => {
      const dto = { notes: 'Updated notes' };
      mockPrisma.payee.findUnique.mockResolvedValue({ id: 1, name: 'Amazon', notes: 'Online shopping', deletedAt: null });
      mockPrisma.payee.update.mockResolvedValue({ id: 1, name: 'Amazon', notes: 'Updated notes', deletedAt: null });

      const result = await service.update(1, dto);

      expect(mockPrisma.payee.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: dto,
      });
      expect(result.notes).toBe('Updated notes');
    });

    it('should throw EntityNotFoundException if payee not found', async () => {
      mockPrisma.payee.findUnique.mockResolvedValue(null);

      await expect(service.update(999, { name: 'New Name' })).rejects.toThrow(EntityNotFoundException);
    });

    it('should throw ConflictException for duplicate name on update', async () => {
      const dto = { name: 'Existing' };
      mockPrisma.payee.findUnique.mockResolvedValue({ id: 1, name: 'Amazon', notes: 'Online shopping', deletedAt: null });
      const prismaError = new Error('Unique constraint failed');
      (prismaError as any).code = 'P2002';
      mockPrisma.payee.update.mockRejectedValue(prismaError);

      await expect(service.update(1, dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('should soft-delete payee if no associated transactions or recurring rules', async () => {
      mockPrisma.payee.findUnique.mockResolvedValue({ id: 1, name: 'Amazon', deletedAt: null });
      mockPrisma.transaction.count.mockResolvedValue(0);
      mockPrisma.recurringRule.count.mockResolvedValue(0);
      mockPrisma.payee.update.mockResolvedValue({ id: 1, name: 'Amazon', deletedAt: new Date() });

      await service.remove(1);

      expect(mockPrisma.payee.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('should throw EntityInUseException if has associated transactions', async () => {
      mockPrisma.payee.findUnique.mockResolvedValue({ id: 1, name: 'Amazon', deletedAt: null });
      mockPrisma.transaction.count.mockResolvedValue(5);

      await expect(service.remove(1)).rejects.toThrow(EntityInUseException);
    });

    it('should throw EntityInUseException if has associated recurring rules', async () => {
      mockPrisma.payee.findUnique.mockResolvedValue({ id: 1, name: 'Amazon', deletedAt: null });
      mockPrisma.transaction.count.mockResolvedValue(0);
      mockPrisma.recurringRule.count.mockResolvedValue(3);

      await expect(service.remove(1)).rejects.toThrow(EntityInUseException);
    });

    it('should throw EntityNotFoundException if payee not found', async () => {
      mockPrisma.payee.findUnique.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(EntityNotFoundException);
    });

    it('should throw EntityNotFoundException if payee already soft-deleted', async () => {
      mockPrisma.payee.findUnique.mockResolvedValue({ id: 1, deletedAt: new Date() });

      await expect(service.remove(1)).rejects.toThrow(EntityNotFoundException);
    });
  });
});
