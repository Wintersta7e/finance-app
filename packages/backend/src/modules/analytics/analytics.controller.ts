import { Controller, Get, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { MonthQueryDto, DateRangeQueryDto } from './dto';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  @Get('month-summary')
  getMonthSummary(@Query() query: MonthQueryDto) {
    return this.service.getMonthSummary(query.year, query.month);
  }

  @Get('category-breakdown')
  getCategoryBreakdown(@Query() query: MonthQueryDto) {
    return this.service.getCategoryBreakdown(query.year, query.month);
  }

  @Get('net-worth-trend')
  getNetWorthTrend(@Query() query: DateRangeQueryDto) {
    return this.service.getNetWorthTrend(query.from, query.to);
  }

  @Get('budget-vs-actual')
  getBudgetVsActual(@Query() query: MonthQueryDto) {
    return this.service.getBudgetVsActual(query.year, query.month);
  }

  @Get('recurring-costs')
  getRecurringCostSummary() {
    return this.service.getRecurringCostSummary();
  }
}
