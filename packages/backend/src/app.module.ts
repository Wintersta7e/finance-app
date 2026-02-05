import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { AccountsModule } from './modules/accounts/accounts.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { SettingsModule } from './modules/settings/settings.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { RecurringRulesModule } from './modules/recurring-rules/recurring-rules.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { BudgetsModule } from './modules/budgets/budgets.module';
import { TagsModule } from './modules/tags/tags.module';
import { PayeesModule } from './modules/payees/payees.module';
import { GoalsModule } from './modules/goals/goals.module';
import { ExportModule } from './modules/export/export.module';

@Module({
  imports: [
    PrismaModule,
    HealthModule,
    AccountsModule,
    CategoriesModule,
    SettingsModule,
    TransactionsModule,
    RecurringRulesModule,
    AnalyticsModule,
    BudgetsModule,
    TagsModule,
    PayeesModule,
    GoalsModule,
    ExportModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
