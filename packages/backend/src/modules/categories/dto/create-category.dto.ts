import { IsString, IsBoolean, IsOptional, IsNotEmpty, IsIn, MaxLength } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsString()
  @IsIn(['INCOME', 'EXPENSE'])
  kind!: string;

  @IsOptional()
  @IsBoolean()
  fixedCost?: boolean;
}
