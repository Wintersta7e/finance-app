import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getSettings() {
    return this.prisma.appSettings.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1 },
    });
  }

  async updateSettings(dto: UpdateSettingsDto) {
    await this.getSettings();
    return this.prisma.appSettings.update({
      where: { id: 1 },
      data: dto,
    });
  }
}
