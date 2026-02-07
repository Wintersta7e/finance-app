import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Decimal } from '@prisma/client/runtime/library';

function convertDecimals(obj: unknown): unknown {
  if (obj instanceof Decimal) {
    return obj.toNumber();
  }
  if (obj instanceof Date) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(convertDecimals);
  }
  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = convertDecimals(value);
    }
    return result;
  }
  return obj;
}

@Injectable()
export class DecimalSerializerInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map(convertDecimals));
  }
}
