import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { AccountsModule } from './modules/accounts/accounts.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { SettingsModule } from './modules/settings/settings.module';

@Module({
  imports: [PrismaModule, HealthModule, AccountsModule, CategoriesModule, SettingsModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
