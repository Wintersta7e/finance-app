import { PartialType } from '@nestjs/mapped-types';
import { CreateRecurringRuleDto } from './create-recurring-rule.dto';

export class UpdateRecurringRuleDto extends PartialType(CreateRecurringRuleDto) {}
