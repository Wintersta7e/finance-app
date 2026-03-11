import { IsNumber, IsPositive } from 'class-validator';

export class ContributeDto {
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @IsPositive()
  amount!: number;
}
