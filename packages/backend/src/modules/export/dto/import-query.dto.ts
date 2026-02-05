import { IsOptional, IsIn } from 'class-validator';

export class ImportQueryDto {
  @IsOptional()
  @IsIn(['replace', 'merge'])
  mode?: 'replace' | 'merge' = 'replace';
}
