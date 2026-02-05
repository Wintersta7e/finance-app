import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getSettings() {
    let settings = await this.prisma.appSettings.findUnique({
      where: { id: 1 },
    });

    if (!settings) {
      settings = await this.prisma.appSettings.create({
        data: { id: 1 },
      });
    }

    return settings;
  }

  async updateSettings(dto: UpdateSettingsDto) {
    await this.getSettings();
    return this.prisma.appSettings.update({
      where: { id: 1 },
      data: dto,
    });
  }
}
