import { Injectable } from '@nestjs/common';

@Injectable()
export class RecurringScheduleService {
  /**
   * Calculate the next occurrence date based on period.
   * Returns the first occurrence date that is strictly after the afterDate.
   *
   * @param startDate - The starting date of the recurring rule
   * @param period - The recurrence period (DAILY, WEEKLY, MONTHLY, YEARLY)
   * @param afterDate - The reference date (defaults to today). Returns next occurrence after this date.
   * @returns The next occurrence date
   */
  calculateNextOccurrence(
    startDate: Date,
    period: string,
    afterDate?: Date,
  ): Date {
    const referenceDate = afterDate ?? new Date();
    // Normalize both dates to UTC midnight for comparison
    const reference = this.normalizeToUtcDate(referenceDate);
    const start = this.normalizeToUtcDate(startDate);

    // For monthly/yearly, preserve the original day of month
    const originalDay = start.getUTCDate();

    // If start date is already after reference date, return it
    if (start > reference) {
      return start;
    }

    // Advance until we get a date > referenceDate
    let current = start;
    while (current <= reference) {
      current = this.advanceDate(current, period, originalDay);
    }

    return current;
  }

  /**
   * Normalize a date to UTC midnight, preserving the calendar date.
   * E.g., "2024-03-15T00:00:00-05:00" becomes "2024-03-15T00:00:00.000Z"
   */
  private normalizeToUtcDate(date: Date): Date {
    const d = new Date(date);
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  }

  private advanceDate(date: Date, period: string, originalDay?: number): Date {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const day = date.getUTCDate();

    switch (period) {
      case 'DAILY':
        return new Date(Date.UTC(year, month, day + 1));
      case 'WEEKLY':
        return new Date(Date.UTC(year, month, day + 7));
      case 'MONTHLY':
        return this.addMonthsUtc(year, month, originalDay ?? day, 1);
      case 'YEARLY':
        return this.addYearsUtc(year, month, originalDay ?? day, 1);
      default:
        throw new Error(`Invalid period: ${period}`);
    }
  }

  private addMonthsUtc(
    year: number,
    month: number,
    originalDay: number,
    months: number,
  ): Date {
    // Calculate target year and month
    const totalMonths = year * 12 + month + months;
    const targetYear = Math.floor(totalMonths / 12);
    const targetMonth = totalMonths % 12;

    // Get the last day of the target month
    const lastDayOfTargetMonth = new Date(
      Date.UTC(targetYear, targetMonth + 1, 0),
    ).getUTCDate();

    // Use the original day, but cap it at the last day of the target month
    const targetDay = Math.min(originalDay, lastDayOfTargetMonth);

    return new Date(Date.UTC(targetYear, targetMonth, targetDay));
  }

  private addYearsUtc(
    year: number,
    month: number,
    originalDay: number,
    years: number,
  ): Date {
    const targetYear = year + years;

    // Get the last day of the target month in the target year
    const lastDayOfTargetMonth = new Date(
      Date.UTC(targetYear, month + 1, 0),
    ).getUTCDate();

    // Use the original day, but cap it at the last day of the target month
    const targetDay = Math.min(originalDay, lastDayOfTargetMonth);

    return new Date(Date.UTC(targetYear, month, targetDay));
  }
}
