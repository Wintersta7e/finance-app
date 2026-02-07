import {
  IsString,
  IsNumber,
  IsOptional,
  IsPositive,
  IsNotEmpty,
  Min,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateGoalDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @IsPositive()
  targetAmount: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  currentAmount?: number;

  @IsOptional()
  @Type(() => Date)
  @IsDateString()
  targetDate?: Date;

  @IsOptional()
  @IsString()
  color?: string;
}
