import { IsString, IsNumber, IsBoolean, IsOptional, IsIn, MaxLength } from 'class-validator';

export class CreateAccountDto {
  @IsString()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  @IsIn(['CHECKING', 'SAVINGS', 'CREDIT', 'INVESTMENT', 'CASH'])
  type?: string = 'CHECKING';

  @IsOptional()
  @IsNumber({ allowInfinity: false, allowNaN: false })
  initialBalance?: number = 0;

  @IsOptional()
  @IsBoolean()
  archived?: boolean = false;
}
