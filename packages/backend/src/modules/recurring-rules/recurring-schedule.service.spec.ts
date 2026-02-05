import { RecurringScheduleService } from './recurring-schedule.service';

describe('RecurringScheduleService', () => {
  let service: RecurringScheduleService;

  beforeEach(() => {
    service = new RecurringScheduleService();
  });

  describe('calculateNextOccurrence', () => {
    describe('DAILY period', () => {
      it('should return tomorrow if startDate is today', () => {
        const today = new Date('2024-03-20');
        const startDate = new Date('2024-03-20');

        const result = service.calculateNextOccurrence(startDate, 'DAILY', today);

        expect(result).toEqual(new Date('2024-03-21'));
      });

      it('should return next day after afterDate', () => {
        const afterDate = new Date('2024-03-20');
        const startDate = new Date('2024-03-15');

        const result = service.calculateNextOccurrence(startDate, 'DAILY', afterDate);

        expect(result).toEqual(new Date('2024-03-21'));
      });

      it('should return startDate if it is after afterDate', () => {
        const afterDate = new Date('2024-03-10');
        const startDate = new Date('2024-03-15');

        const result = service.calculateNextOccurrence(startDate, 'DAILY', afterDate);

        expect(result).toEqual(new Date('2024-03-15'));
      });
    });

    describe('WEEKLY period', () => {
      it('should advance by 7 days until after afterDate', () => {
        const afterDate = new Date('2024-03-20');
        const startDate = new Date('2024-03-01'); // Friday

        const result = service.calculateNextOccurrence(startDate, 'WEEKLY', afterDate);

        // 03-01 + 7 = 03-08, + 7 = 03-15, + 7 = 03-22 (first one > 03-20)
        expect(result).toEqual(new Date('2024-03-22'));
      });

      it('should return startDate if after afterDate', () => {
        const afterDate = new Date('2024-03-01');
        const startDate = new Date('2024-03-15');

        const result = service.calculateNextOccurrence(startDate, 'WEEKLY', afterDate);

        expect(result).toEqual(new Date('2024-03-15'));
      });
    });

    describe('MONTHLY period', () => {
      it('should advance by months until after afterDate', () => {
        const afterDate = new Date('2024-03-20');
        const startDate = new Date('2024-01-15');

        const result = service.calculateNextOccurrence(startDate, 'MONTHLY', afterDate);

        // 01-15 <= 03-20, 02-15 <= 03-20, 03-15 <= 03-20, 04-15 > 03-20
        expect(result).toEqual(new Date('2024-04-15'));
      });

      it('should handle month end dates correctly', () => {
        const afterDate = new Date('2024-03-20');
        const startDate = new Date('2024-01-31');

        const result = service.calculateNextOccurrence(startDate, 'MONTHLY', afterDate);

        // Jan 31 <= 03-20, advance
        // Feb 29 (2024 is leap year) <= 03-20, advance
        // Mar 31 > 03-20, return this
        expect(result.getUTCDate()).toBe(31);
        expect(result.getUTCMonth()).toBe(2); // March (0-indexed)
        expect(result.getUTCFullYear()).toBe(2024);
      });

      it('should return startDate if after afterDate', () => {
        const afterDate = new Date('2024-01-01');
        const startDate = new Date('2024-03-15');

        const result = service.calculateNextOccurrence(startDate, 'MONTHLY', afterDate);

        expect(result).toEqual(new Date('2024-03-15'));
      });
    });

    describe('YEARLY period', () => {
      it('should advance by years until after afterDate', () => {
        const afterDate = new Date('2024-03-20');
        const startDate = new Date('2022-06-15');

        const result = service.calculateNextOccurrence(startDate, 'YEARLY', afterDate);

        // 2022-06-15 <= 2024-03-20, 2023-06-15 <= 2024-03-20, 2024-06-15 > 2024-03-20
        expect(result).toEqual(new Date('2024-06-15'));
      });

      it('should handle leap year dates', () => {
        const afterDate = new Date('2025-03-01');
        const startDate = new Date('2024-02-29'); // Leap year

        const result = service.calculateNextOccurrence(startDate, 'YEARLY', afterDate);

        // 2024-02-29 <= 2025-03-01, advance
        // 2025-02-28 <= 2025-03-01, advance
        // 2026-02-28 > 2025-03-01, return this
        expect(result.getUTCFullYear()).toBe(2026);
        expect(result.getUTCMonth()).toBe(1); // February
        expect(result.getUTCDate()).toBe(28);
      });

      it('should return startDate if after afterDate', () => {
        const afterDate = new Date('2020-01-01');
        const startDate = new Date('2024-03-15');

        const result = service.calculateNextOccurrence(startDate, 'YEARLY', afterDate);

        expect(result).toEqual(new Date('2024-03-15'));
      });
    });

    describe('default afterDate', () => {
      it('should use current date as afterDate when not provided', () => {
        // Use a far future date to ensure we get expected behavior
        const startDate = new Date('2099-01-01');

        const result = service.calculateNextOccurrence(startDate, 'DAILY');

        // Since startDate is in future, it should return startDate
        expect(result).toEqual(new Date('2099-01-01'));
      });
    });

    describe('edge cases', () => {
      it('should handle same day as startDate', () => {
        const date = new Date('2024-03-15');

        const result = service.calculateNextOccurrence(date, 'MONTHLY', date);

        // startDate equals afterDate, so we need the NEXT occurrence
        expect(result).toEqual(new Date('2024-04-15'));
      });

      it('should throw error for invalid period', () => {
        const date = new Date('2024-03-15');

        expect(() => {
          service.calculateNextOccurrence(date, 'INVALID' as any, date);
        }).toThrow('Invalid period: INVALID');
      });
    });
  });
});
