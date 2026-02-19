import { IsString, IsNumber, IsBoolean, IsOptional } from 'class-validator';

export class CreateAccountDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  type?: string = 'CHECKING';

  @IsOptional()
  @IsNumber()
  initialBalance?: number = 0;

  @IsOptional()
  @IsBoolean()
  archived?: boolean = false;
}
