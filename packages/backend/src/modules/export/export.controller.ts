import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Res,
  HttpCode,
  HttpStatus,
  Header,
} from '@nestjs/common';
import { Response } from 'express';
import { ExportService, ExportData, ImportMode } from './export.service';
import { ImportQueryDto } from './dto/import-query.dto';

@Controller()
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get('export/json')
  @Header('Content-Type', 'application/json')
  @Header('Content-Disposition', 'attachment; filename="finance-export.json"')
  async exportJson() {
    return this.exportService.exportJson();
  }

  @Get('export/csv/transactions')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="transactions.csv"')
  async exportTransactionsCsv(@Res() res: Response) {
    const csv = await this.exportService.exportTransactionsCsv();
    res.send(csv);
  }

  @Post('import/json')
  @HttpCode(HttpStatus.OK)
  async importJson(
    @Body() body: ExportData,
    @Query() query: ImportQueryDto,
  ) {
    const mode: ImportMode = query.mode || 'replace';
    return this.exportService.importJson(body, mode);
  }
}
