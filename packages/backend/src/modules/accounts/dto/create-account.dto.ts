import { IsString, IsNumber, IsBoolean, IsOptional, IsIn } from 'class-validator';

export class CreateAccountDto {
  @IsString()
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
