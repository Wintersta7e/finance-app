import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class CreatePayeeDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
