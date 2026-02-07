import { IsString, IsNumber, IsOptional, IsDateString, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export const TRANSACTION_TYPES = [
  'INCOME',
  'FIXED_COST',
  'VARIABLE_EXPENSE',
  'TRANSFER',
] as const;

export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export class CreateTransactionDto {
  @Type(() => Date)
  @IsDateString()
  date: Date;

  @IsNumber()
  amount: number;

  @IsString()
  @IsIn(TRANSACTION_TYPES)
  type: TransactionType;

  @IsNumber()
  accountId: number;

  @IsOptional()
  @IsNumber()
  categoryId?: number;

  @IsOptional()
  @IsNumber()
  payeeId?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  recurringRuleId?: number;
}
