import {
  IsString,
  IsNumber,
  IsOptional,
  IsDate,
  IsIn,
  IsBoolean,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export const DIRECTIONS = ['INCOME', 'EXPENSE'] as const;
export type Direction = (typeof DIRECTIONS)[number];

export const RECURRING_PERIODS = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] as const;
export type RecurringPeriod = (typeof RECURRING_PERIODS)[number];

export class CreateRecurringRuleDto {
  @IsNumber({ allowInfinity: false, allowNaN: false })
  amount!: number;

  @IsString()
  @IsIn(DIRECTIONS)
  direction!: Direction;

  @IsString()
  @IsIn(RECURRING_PERIODS)
  period!: RecurringPeriod;

  @Type(() => Date)
  @IsDate()
  startDate!: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  @IsOptional()
  @IsBoolean()
  autoPost?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;

  @IsNumber()
  accountId!: number;

  @IsOptional()
  @IsNumber()
  categoryId?: number;

  @IsOptional()
  @IsNumber()
  payeeId?: number;
}
