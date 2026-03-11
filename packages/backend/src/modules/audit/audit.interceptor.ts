import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditService } from './audit.service';

/**
 * Derives a singular entity type name from a controller class name.
 * e.g. AccountsController -> Account, CategoriesController -> Category
 */
export function extractEntityType(controllerName: string): string {
  const stripped = controllerName.replace('Controller', '');

  // Handle 'ies' ending -> 'y' (e.g. Categories -> Category, Payees is not ies)
  if (stripped.endsWith('ies')) {
    return stripped.slice(0, -3) + 'y';
  }

  // Handle trailing 's' (e.g. Accounts -> Account, Tags -> Tag)
  if (stripped.endsWith('s')) {
    return stripped.slice(0, -1);
  }

  return stripped;
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method: string = request.method;

    // Only audit mutating operations
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle();
    }

    const controllerName = context.getClass().name;
    const entityType = extractEntityType(controllerName);
    const entityId = request.params?.id
      ? parseInt(request.params.id, 10)
      : undefined;
    const action =
      method === 'POST' ? 'CREATE' : method === 'DELETE' ? 'DELETE' : 'UPDATE';

    return next.handle().pipe(
      tap((responseBody) => {
        // For CREATE, the new entity ID comes from the response body
        const resolvedId =
          action === 'CREATE' ? responseBody?.id : entityId;

        if (resolvedId != null && !isNaN(resolvedId)) {
          this.auditService
            .log(entityType, resolvedId, action)
            .catch(() => {
              // Swallow audit logging errors so they don't break the request
            });
        }
      }),
    );
  }
}
