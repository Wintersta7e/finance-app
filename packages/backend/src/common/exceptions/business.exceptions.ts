import {
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

export class EntityInUseException extends ConflictException {
  constructor(entity: string, dependency: string) {
    super(`Cannot delete ${entity} with existing ${dependency}`);
  }
}

export class EntityNotFoundException extends NotFoundException {
  constructor(entity: string, id: number | string) {
    super(`${entity} with id ${id} not found`);
  }
}

export class ValidationFailedException extends BadRequestException {
  constructor(errors: string[]) {
    super({ message: 'Validation failed', errors });
  }
}
