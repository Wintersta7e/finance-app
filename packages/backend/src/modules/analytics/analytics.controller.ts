import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiQuery } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { MonthQueryDto, DateRangeQueryDto } from './dto';

@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  @Get('month-summary')
  @ApiQuery({ name: 'year', required: true, type: Number, description: 'Year (2000-2100)' })
  @ApiQuery({ name: 'month', required: true, type: Number, description: 'Month (1-12)' })
  getMonthSummary(@Query() query: MonthQueryDto) {
    return this.service.getMonthSummary(query.year, query.month);
  }

  @Get('category-breakdown')
  @ApiQuery({ name: 'year', required: true, type: Number, description: 'Year (2000-2100)' })
  @ApiQuery({ name: 'month', required: true, type: Number, description: 'Month (1-12)' })
  getCategoryBreakdown(@Query() query: MonthQueryDto) {
    return this.service.getCategoryBreakdown(query.year, query.month);
  }

  @Get('net-worth-trend')
  @ApiQuery({ name: 'from', required: true, type: String, description: 'Start date (ISO 8601)' })
  @ApiQuery({ name: 'to', required: true, type: String, description: 'End date (ISO 8601)' })
  getNetWorthTrend(@Query() query: DateRangeQueryDto) {
    return this.service.getNetWorthTrend(query.from, query.to);
  }

  @Get('budget-vs-actual')
  @ApiQuery({ name: 'year', required: true, type: Number, description: 'Year (2000-2100)' })
  @ApiQuery({ name: 'month', required: true, type: Number, description: 'Month (1-12)' })
  getBudgetVsActual(@Query() query: MonthQueryDto) {
    return this.service.getBudgetVsActual(query.year, query.month);
  }

  @Get('recurring-costs')
  getRecurringCostSummary() {
    return this.service.getRecurringCostSummary();
  }
}
