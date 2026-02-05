import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { AccountsModule } from './modules/accounts/accounts.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { SettingsModule } from './modules/settings/settings.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { RecurringRulesModule } from './modules/recurring-rules/recurring-rules.module';

@Module({
  imports: [
    PrismaModule,
    HealthModule,
    AccountsModule,
    CategoriesModule,
    SettingsModule,
    TransactionsModule,
    RecurringRulesModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
