import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';
import { AuditInterceptor, extractEntityType } from './audit.interceptor';
import { AuditService } from './audit.service';

describe('extractEntityType', () => {
  it('should strip Controller suffix and trailing s', () => {
    expect(extractEntityType('AccountsController')).toBe('Account');
  });

  it('should handle ies -> y pluralization', () => {
    expect(extractEntityType('CategoriesController')).toBe('Category');
  });

  it('should handle simple s pluralization', () => {
    expect(extractEntityType('TagsController')).toBe('Tag');
    expect(extractEntityType('PayeesController')).toBe('Payee');
    expect(extractEntityType('BudgetsController')).toBe('Budget');
    expect(extractEntityType('GoalsController')).toBe('Goal');
    expect(extractEntityType('TransactionsController')).toBe('Transaction');
  });

  it('should handle non-plural controller names', () => {
    expect(extractEntityType('AuditController')).toBe('Audit');
    expect(extractEntityType('HealthController')).toBe('Health');
  });

  it('should handle compound names', () => {
    expect(extractEntityType('RecurringRulesController')).toBe(
      'RecurringRule',
    );
  });
});

describe('AuditInterceptor', () => {
  let interceptor: AuditInterceptor;
  let auditService: jest.Mocked<Pick<AuditService, 'log'>>;

  beforeEach(() => {
    auditService = {
      log: jest.fn().mockResolvedValue(undefined),
    };
    interceptor = new AuditInterceptor(auditService as any);
  });

  function createMockContext(
    method: string,
    controllerName: string,
    params: Record<string, string> = {},
  ): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          method,
          params,
        }),
      }),
      getClass: () => ({ name: controllerName }),
    } as unknown as ExecutionContext;
  }

  function createMockCallHandler(responseBody: any = {}): CallHandler {
    return {
      handle: () => of(responseBody),
    };
  }

  it('should skip GET requests without auditing', (done) => {
    const context = createMockContext('GET', 'AccountsController');
    const next = createMockCallHandler();

    interceptor.intercept(context, next).subscribe({
      complete: () => {
        expect(auditService.log).not.toHaveBeenCalled();
        done();
      },
    });
  });

  it('should log CREATE for POST requests with response body id', (done) => {
    const context = createMockContext('POST', 'AccountsController');
    const next = createMockCallHandler({ id: 42, name: 'New Account' });

    interceptor.intercept(context, next).subscribe({
      complete: () => {
        expect(auditService.log).toHaveBeenCalledWith('Account', 42, 'CREATE');
        done();
      },
    });
  });

  it('should log UPDATE for PUT requests with param id', (done) => {
    const context = createMockContext('PUT', 'AccountsController', {
      id: '7',
    });
    const next = createMockCallHandler({ id: 7, name: 'Updated' });

    interceptor.intercept(context, next).subscribe({
      complete: () => {
        expect(auditService.log).toHaveBeenCalledWith('Account', 7, 'UPDATE');
        done();
      },
    });
  });

  it('should log DELETE for DELETE requests with param id', (done) => {
    const context = createMockContext('DELETE', 'TransactionsController', {
      id: '15',
    });
    const next = createMockCallHandler();

    interceptor.intercept(context, next).subscribe({
      complete: () => {
        expect(auditService.log).toHaveBeenCalledWith(
          'Transaction',
          15,
          'DELETE',
        );
        done();
      },
    });
  });

  it('should not log when POST response has no id', (done) => {
    const context = createMockContext('POST', 'ExportController');
    const next = createMockCallHandler({ success: true });

    interceptor.intercept(context, next).subscribe({
      complete: () => {
        expect(auditService.log).not.toHaveBeenCalled();
        done();
      },
    });
  });

  it('should not log when DELETE has no param id', (done) => {
    const context = createMockContext('DELETE', 'AccountsController', {});
    const next = createMockCallHandler();

    interceptor.intercept(context, next).subscribe({
      complete: () => {
        expect(auditService.log).not.toHaveBeenCalled();
        done();
      },
    });
  });

  it('should handle CategoriesController with ies -> y pluralization', (done) => {
    const context = createMockContext('POST', 'CategoriesController');
    const next = createMockCallHandler({ id: 5, name: 'Food' });

    interceptor.intercept(context, next).subscribe({
      complete: () => {
        expect(auditService.log).toHaveBeenCalledWith(
          'Category',
          5,
          'CREATE',
        );
        done();
      },
    });
  });

  it('should not crash if auditService.log rejects', (done) => {
    auditService.log.mockRejectedValue(new Error('db error'));
    const context = createMockContext('PUT', 'AccountsController', {
      id: '1',
    });
    const next = createMockCallHandler({ id: 1 });

    interceptor.intercept(context, next).subscribe({
      next: (value) => {
        expect(value).toEqual({ id: 1 });
      },
      complete: () => {
        expect(auditService.log).toHaveBeenCalled();
        done();
      },
    });
  });
});
