import {
  IsNumber,
  IsOptional,
  IsDate,
  IsIn,
  IsPositive,
} from 'class-validator';
import { Type } from 'class-transformer';

export const BUDGET_PERIODS = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] as const;
export type BudgetPeriod = (typeof BUDGET_PERIODS)[number];

export class CreateBudgetDto {
  @IsNumber()
  @IsPositive()
  amount: number;

  @IsOptional()
  @IsIn(BUDGET_PERIODS)
  period?: BudgetPeriod = 'MONTHLY';

  @Type(() => Date)
  @IsDate()
  effectiveFrom: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  effectiveTo?: Date;

  @IsNumber()
  categoryId: number;
}
