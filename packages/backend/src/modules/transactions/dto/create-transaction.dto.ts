import { IsString, IsNumber, IsOptional, IsDate, IsIn, MaxLength } from 'class-validator';
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
  @IsDate()
  date!: Date;

  @IsNumber({ allowInfinity: false, allowNaN: false })
  amount!: number;

  @IsString()
  @IsIn(TRANSACTION_TYPES)
  type!: TransactionType;

  @IsNumber()
  accountId!: number;

  @IsOptional()
  @IsNumber()
  categoryId?: number;

  @IsOptional()
  @IsNumber()
  payeeId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsNumber()
  recurringRuleId?: number;
}
