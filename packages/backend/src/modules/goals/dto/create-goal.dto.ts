import {
  IsString,
  IsNumber,
  IsOptional,
  IsPositive,
  IsNotEmpty,
  Min,
  IsDateString,
  Matches,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateGoalDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsNumber({ allowInfinity: false, allowNaN: false })
  @IsPositive()
  targetAmount!: number;

  @IsOptional()
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(0)
  currentAmount?: number;

  @IsOptional()
  @Type(() => Date)
  @IsDateString()
  targetDate?: Date;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'color must be a valid hex color (e.g., #FF5733)' })
  color?: string;
}
