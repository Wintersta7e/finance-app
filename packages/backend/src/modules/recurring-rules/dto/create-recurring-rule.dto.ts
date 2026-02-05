import {
  IsString,
  IsNumber,
  IsOptional,
  IsDateString,
  IsIn,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export const DIRECTIONS = ['INCOME', 'EXPENSE'] as const;
export type Direction = (typeof DIRECTIONS)[number];

export const RECURRING_PERIODS = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] as const;
export type RecurringPeriod = (typeof RECURRING_PERIODS)[number];

export class CreateRecurringRuleDto {
  @IsNumber()
  amount: number;

  @IsString()
  @IsIn(DIRECTIONS)
  direction: Direction;

  @IsString()
  @IsIn(RECURRING_PERIODS)
  period: RecurringPeriod;

  @Type(() => Date)
  @IsDateString()
  startDate: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDateString()
  endDate?: Date;

  @IsOptional()
  @IsBoolean()
  autoPost?: boolean;

  @IsOptional()
  @IsString()
  note?: string;

  @IsNumber()
  accountId: number;

  @IsOptional()
  @IsNumber()
  categoryId?: number;

  @IsOptional()
  @IsNumber()
  payeeId?: number;
}
