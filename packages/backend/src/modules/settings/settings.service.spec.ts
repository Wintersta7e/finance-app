import { Test, TestingModule } from '@nestjs/testing';
import { SettingsService } from './settings.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('SettingsService', () => {
  let service: SettingsService;
  let prisma: PrismaService;

  const mockPrisma = {
    appSettings: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<SettingsService>(SettingsService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('getSettings', () => {
    it('should return existing settings if found', async () => {
      const mockSettings = {
        id: 1,
        currencyCode: 'EUR',
        firstDayOfMonth: 1,
        firstDayOfWeek: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.appSettings.upsert.mockResolvedValue(mockSettings);

      const result = await service.getSettings();

      expect(mockPrisma.appSettings.upsert).toHaveBeenCalledWith({
        where: { id: 1 },
        update: {},
        create: { id: 1 },
      });
      expect(result).toEqual(mockSettings);
    });

    it('should create default settings if not found', async () => {
      const defaultSettings = {
        id: 1,
        currencyCode: 'EUR',
        firstDayOfMonth: 1,
        firstDayOfWeek: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.appSettings.upsert.mockResolvedValue(defaultSettings);

      const result = await service.getSettings();

      expect(mockPrisma.appSettings.upsert).toHaveBeenCalledWith({
        where: { id: 1 },
        update: {},
        create: { id: 1 },
      });
      expect(result).toEqual(defaultSettings);
    });
  });

  describe('updateSettings', () => {
    it('should update currencyCode', async () => {
      const updatedSettings = {
        id: 1,
        currencyCode: 'USD',
        firstDayOfMonth: 1,
        firstDayOfWeek: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.appSettings.upsert.mockResolvedValue(updatedSettings);

      const result = await service.updateSettings({ currencyCode: 'USD' });

      expect(mockPrisma.appSettings.upsert).toHaveBeenCalledWith({
        where: { id: 1 },
        update: { currencyCode: 'USD' },
        create: { id: 1, currencyCode: 'USD' },
      });
      expect(result).toEqual(updatedSettings);
    });

    it('should update firstDayOfMonth', async () => {
      const updatedSettings = {
        id: 1,
        currencyCode: 'EUR',
        firstDayOfMonth: 15,
        firstDayOfWeek: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.appSettings.upsert.mockResolvedValue(updatedSettings);

      const result = await service.updateSettings({ firstDayOfMonth: 15 });

      expect(mockPrisma.appSettings.upsert).toHaveBeenCalledWith({
        where: { id: 1 },
        update: { firstDayOfMonth: 15 },
        create: { id: 1, firstDayOfMonth: 15 },
      });
      expect(result).toEqual(updatedSettings);
    });

    it('should update firstDayOfWeek', async () => {
      const updatedSettings = {
        id: 1,
        currencyCode: 'EUR',
        firstDayOfMonth: 1,
        firstDayOfWeek: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.appSettings.upsert.mockResolvedValue(updatedSettings);

      const result = await service.updateSettings({ firstDayOfWeek: 0 });

      expect(mockPrisma.appSettings.upsert).toHaveBeenCalledWith({
        where: { id: 1 },
        update: { firstDayOfWeek: 0 },
        create: { id: 1, firstDayOfWeek: 0 },
      });
      expect(result).toEqual(updatedSettings);
    });

    it('should update multiple fields at once', async () => {
      const updatedSettings = {
        id: 1,
        currencyCode: 'GBP',
        firstDayOfMonth: 25,
        firstDayOfWeek: 6,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.appSettings.upsert.mockResolvedValue(updatedSettings);

      const result = await service.updateSettings({
        currencyCode: 'GBP',
        firstDayOfMonth: 25,
        firstDayOfWeek: 6,
      });

      expect(mockPrisma.appSettings.upsert).toHaveBeenCalledWith({
        where: { id: 1 },
        update: {
          currencyCode: 'GBP',
          firstDayOfMonth: 25,
          firstDayOfWeek: 6,
        },
        create: {
          id: 1,
          currencyCode: 'GBP',
          firstDayOfMonth: 25,
          firstDayOfWeek: 6,
        },
      });
      expect(result).toEqual(updatedSettings);
    });

    it('should create settings if not exists before updating', async () => {
      const updatedSettings = {
        id: 1,
        currencyCode: 'USD',
        firstDayOfMonth: 1,
        firstDayOfWeek: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.appSettings.upsert.mockResolvedValue(updatedSettings);

      const result = await service.updateSettings({ currencyCode: 'USD' });

      expect(mockPrisma.appSettings.upsert).toHaveBeenCalledWith({
        where: { id: 1 },
        update: { currencyCode: 'USD' },
        create: { id: 1, currencyCode: 'USD' },
      });
      expect(mockPrisma.appSettings.update).not.toHaveBeenCalled();
      expect(result).toEqual(updatedSettings);
    });
  });
});
