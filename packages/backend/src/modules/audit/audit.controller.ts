import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiQuery } from '@nestjs/swagger';
import { AuditService } from './audit.service';

@ApiTags('Audit')
@Controller('audit')
export class AuditController {
  constructor(private readonly service: AuditService) {}

  @Get('recent')
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of recent entries (default: 50, max: 100)' })
  getRecentActivity(
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    const capped = Math.max(1, Math.min(limit, 100));
    return this.service.getRecentActivity(capped);
  }

  @Get(':entityType/:entityId')
  getHistory(
    @Param('entityType') entityType: string,
    @Param('entityId', ParseIntPipe) entityId: number,
  ) {
    return this.service.getHistory(entityType, entityId);
  }
}
