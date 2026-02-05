import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DataInitializerService implements OnModuleInit {
  private readonly logger = new Logger(DataInitializerService.name);

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    try {
      await this.seedSettings();
      await this.seedDefaultAccount();
      await this.seedCategories();
    } catch (error) {
      this.logger.error(
        'Failed to seed default data',
        error instanceof Error ? error.stack : error,
      );
    }
  }

  private async seedSettings(): Promise<void> {
    const count = await this.prisma.appSettings.count();
    if (count > 0) {
      this.logger.log('AppSettings already exist, skipping seed');
      return;
    }

    await this.prisma.appSettings.create({
      data: {
        id: 1,
        currencyCode: 'EUR',
        firstDayOfMonth: 1,
        firstDayOfWeek: 1,
      },
    });
    this.logger.log('Seeded default AppSettings');
  }

  private async seedDefaultAccount(): Promise<void> {
    const count = await this.prisma.account.count();
    if (count > 0) {
      this.logger.log('Accounts already exist, skipping seed');
      return;
    }

    await this.prisma.account.create({
      data: {
        name: 'Main Account',
        type: 'CHECKING',
        initialBalance: 0,
        archived: false,
      },
    });
    this.logger.log('Seeded default account: Main Account');
  }

  private async seedCategories(): Promise<void> {
    const count = await this.prisma.category.count();
    if (count > 0) {
      this.logger.log('Categories already exist, skipping seed');
      return;
    }

    await this.prisma.category.createMany({
      data: [
        { name: 'Salary', kind: 'INCOME', fixedCost: false },
        { name: 'Other income', kind: 'INCOME', fixedCost: false },
        { name: 'Rent', kind: 'EXPENSE', fixedCost: true },
        { name: 'Utilities', kind: 'EXPENSE', fixedCost: true },
        { name: 'Insurance', kind: 'EXPENSE', fixedCost: true },
        { name: 'Groceries', kind: 'EXPENSE', fixedCost: false },
        { name: 'Transport', kind: 'EXPENSE', fixedCost: false },
        { name: 'Entertainment', kind: 'EXPENSE', fixedCost: false },
      ],
    });
    this.logger.log('Seeded 8 default categories');
  }
}
