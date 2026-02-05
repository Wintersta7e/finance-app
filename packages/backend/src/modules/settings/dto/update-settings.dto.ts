import { IsString, IsInt, IsOptional, Min, Max } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional()
  @IsString()
  currencyCode?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(28)
  firstDayOfMonth?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  firstDayOfWeek?: number;
}
