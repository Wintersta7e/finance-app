import { IsOptional, IsInt, Min, Max, IsString, IsIn, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
import { TRANSACTION_TYPES, TransactionType } from './create-transaction.dto';

export class TransactionQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  accountId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoryId?: number;

  @IsOptional()
  @IsString()
  @IsIn(TRANSACTION_TYPES)
  type?: TransactionType;
}
