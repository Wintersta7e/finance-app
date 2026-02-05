import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('AuditService', () => {
  let service: AuditService;

  const mockPrisma = {
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    jest.clearAllMocks();
  });

  describe('log', () => {
    it('should create audit entry with correct data', async () => {
      const entry = {
        id: 1,
        entityType: 'Account',
        entityId: 42,
        action: 'CREATE',
        changes: '{"name":{"from":null,"to":"Main"}}',
        timestamp: new Date(),
      };
      mockPrisma.auditLog.create.mockResolvedValue(entry);

      const result = await service.log('Account', 42, 'CREATE', '{"name":{"from":null,"to":"Main"}}');

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          entityType: 'Account',
          entityId: 42,
          action: 'CREATE',
          changes: '{"name":{"from":null,"to":"Main"}}',
        },
      });
      expect(result).toEqual(entry);
    });

    it('should create audit entry without changes', async () => {
      const entry = {
        id: 2,
        entityType: 'Transaction',
        entityId: 10,
        action: 'DELETE',
        changes: null,
        timestamp: new Date(),
      };
      mockPrisma.auditLog.create.mockResolvedValue(entry);

      const result = await service.log('Transaction', 10, 'DELETE');

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          entityType: 'Transaction',
          entityId: 10,
          action: 'DELETE',
          changes: undefined,
        },
      });
      expect(result).toEqual(entry);
    });
  });

  describe('computeDiff', () => {
    it('should return correct diff for changed fields', () => {
      const previous = { name: 'Old Name', amount: 100 };
      const current = { name: 'New Name', amount: 200 };

      const result = service.computeDiff(previous, current);

      expect(JSON.parse(result!)).toEqual({
        name: { from: 'Old Name', to: 'New Name' },
        amount: { from: 100, to: 200 },
      });
    });

    it('should ignore unchanged fields', () => {
      const previous = { name: 'Same', amount: 100, type: 'CHECKING' };
      const current = { name: 'Same', amount: 200, type: 'CHECKING' };

      const result = service.computeDiff(previous, current);

      expect(JSON.parse(result!)).toEqual({
        amount: { from: 100, to: 200 },
      });
    });

    it('should exclude updatedAt and createdAt fields from diff', () => {
      const previous = {
        name: 'Old',
        updatedAt: new Date('2024-01-01'),
        createdAt: new Date('2024-01-01'),
      };
      const current = {
        name: 'New',
        updatedAt: new Date('2024-06-01'),
        createdAt: new Date('2024-01-01'),
      };

      const result = service.computeDiff(previous, current);

      const parsed = JSON.parse(result!);
      expect(parsed).toEqual({
        name: { from: 'Old', to: 'New' },
      });
      expect(parsed).not.toHaveProperty('updatedAt');
      expect(parsed).not.toHaveProperty('createdAt');
    });

    it('should return null if no changes', () => {
      const previous = { name: 'Same', amount: 100 };
      const current = { name: 'Same', amount: 100 };

      const result = service.computeDiff(previous, current);

      expect(result).toBeNull();
    });
  });

  describe('getHistory', () => {
    it('should query with correct filters and ordering', async () => {
      const entries = [
        { id: 2, entityType: 'Account', entityId: 1, action: 'UPDATE', timestamp: new Date() },
        { id: 1, entityType: 'Account', entityId: 1, action: 'CREATE', timestamp: new Date() },
      ];
      mockPrisma.auditLog.findMany.mockResolvedValue(entries);

      const result = await service.getHistory('Account', 1);

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          entityType: 'Account',
          entityId: 1,
        },
        orderBy: { timestamp: 'desc' },
      });
      expect(result).toEqual(entries);
    });
  });

  describe('getRecentActivity', () => {
    it('should query with correct limit and ordering', async () => {
      const entries = [
        { id: 5, entityType: 'Transaction', entityId: 3, action: 'CREATE', timestamp: new Date() },
        { id: 4, entityType: 'Account', entityId: 1, action: 'UPDATE', timestamp: new Date() },
      ];
      mockPrisma.auditLog.findMany.mockResolvedValue(entries);

      const result = await service.getRecentActivity(25);

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith({
        orderBy: { timestamp: 'desc' },
        take: 25,
      });
      expect(result).toEqual(entries);
    });
  });
});
