import { Controller, Get, Put, Body } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@ApiTags('Settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  @Get()
  getSettings() {
    return this.service.getSettings();
  }

  @Put()
  updateSettings(@Body() dto: UpdateSettingsDto) {
    return this.service.updateSettings(dto);
  }
}
