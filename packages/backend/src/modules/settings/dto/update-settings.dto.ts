import { IsString, IsInt, IsOptional, Min, Max, Matches } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{3}$/, { message: 'currencyCode must be a 3-letter uppercase ISO 4217 code (e.g. USD, EUR)' })
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
