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
      const existingSettings = {
        id: 1,
        currencyCode: 'EUR',
        firstDayOfMonth: 1,
        firstDayOfWeek: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const updatedSettings = { ...existingSettings, currencyCode: 'USD' };
      mockPrisma.appSettings.upsert.mockResolvedValue(existingSettings);
      mockPrisma.appSettings.update.mockResolvedValue(updatedSettings);

      const result = await service.updateSettings({ currencyCode: 'USD' });

      expect(mockPrisma.appSettings.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { currencyCode: 'USD' },
      });
      expect(result).toEqual(updatedSettings);
    });

    it('should update firstDayOfMonth', async () => {
      const existingSettings = {
        id: 1,
        currencyCode: 'EUR',
        firstDayOfMonth: 1,
        firstDayOfWeek: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const updatedSettings = { ...existingSettings, firstDayOfMonth: 15 };
      mockPrisma.appSettings.upsert.mockResolvedValue(existingSettings);
      mockPrisma.appSettings.update.mockResolvedValue(updatedSettings);

      const result = await service.updateSettings({ firstDayOfMonth: 15 });

      expect(mockPrisma.appSettings.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { firstDayOfMonth: 15 },
      });
      expect(result).toEqual(updatedSettings);
    });

    it('should update firstDayOfWeek', async () => {
      const existingSettings = {
        id: 1,
        currencyCode: 'EUR',
        firstDayOfMonth: 1,
        firstDayOfWeek: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const updatedSettings = { ...existingSettings, firstDayOfWeek: 0 };
      mockPrisma.appSettings.upsert.mockResolvedValue(existingSettings);
      mockPrisma.appSettings.update.mockResolvedValue(updatedSettings);

      const result = await service.updateSettings({ firstDayOfWeek: 0 });

      expect(mockPrisma.appSettings.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { firstDayOfWeek: 0 },
      });
      expect(result).toEqual(updatedSettings);
    });

    it('should update multiple fields at once', async () => {
      const existingSettings = {
        id: 1,
        currencyCode: 'EUR',
        firstDayOfMonth: 1,
        firstDayOfWeek: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const updatedSettings = {
        ...existingSettings,
        currencyCode: 'GBP',
        firstDayOfMonth: 25,
        firstDayOfWeek: 6,
      };
      mockPrisma.appSettings.upsert.mockResolvedValue(existingSettings);
      mockPrisma.appSettings.update.mockResolvedValue(updatedSettings);

      const result = await service.updateSettings({
        currencyCode: 'GBP',
        firstDayOfMonth: 25,
        firstDayOfWeek: 6,
      });

      expect(mockPrisma.appSettings.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          currencyCode: 'GBP',
          firstDayOfMonth: 25,
          firstDayOfWeek: 6,
        },
      });
      expect(result).toEqual(updatedSettings);
    });

    it('should create settings if not exists before updating', async () => {
      const defaultSettings = {
        id: 1,
        currencyCode: 'EUR',
        firstDayOfMonth: 1,
        firstDayOfWeek: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const updatedSettings = { ...defaultSettings, currencyCode: 'USD' };
      mockPrisma.appSettings.upsert.mockResolvedValue(defaultSettings);
      mockPrisma.appSettings.update.mockResolvedValue(updatedSettings);

      const result = await service.updateSettings({ currencyCode: 'USD' });

      expect(mockPrisma.appSettings.upsert).toHaveBeenCalledWith({
        where: { id: 1 },
        update: {},
        create: { id: 1 },
      });
      expect(mockPrisma.appSettings.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { currencyCode: 'USD' },
      });
      expect(result).toEqual(updatedSettings);
    });
  });
});
