import { Module } from '@nestjs/common';
import { RecurringRulesController } from './recurring-rules.controller';
import { RecurringRulesService } from './recurring-rules.service';
import { RecurringScheduleService } from './recurring-schedule.service';
import { RecurringAutoPostService } from './recurring-auto-post.service';

@Module({
  controllers: [RecurringRulesController],
  providers: [RecurringRulesService, RecurringScheduleService, RecurringAutoPostService],
  exports: [RecurringRulesService, RecurringScheduleService, RecurringAutoPostService],
})
export class RecurringRulesModule {}
