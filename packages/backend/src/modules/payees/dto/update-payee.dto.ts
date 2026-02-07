import { PartialType } from '@nestjs/mapped-types';
import { CreatePayeeDto } from './create-payee.dto';

export class UpdatePayeeDto extends PartialType(CreatePayeeDto) {}
