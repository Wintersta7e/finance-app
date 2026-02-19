import { IsString, IsBoolean, IsOptional, IsNotEmpty, IsIn } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsIn(['INCOME', 'EXPENSE'])
  kind!: string;

  @IsOptional()
  @IsBoolean()
  fixedCost?: boolean;
}
