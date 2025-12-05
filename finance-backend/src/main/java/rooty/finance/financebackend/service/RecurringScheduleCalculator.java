package rooty.finance.financebackend.service;

import java.time.LocalDate;
import rooty.finance.financebackend.domain.RecurringPeriod;

public final class RecurringScheduleCalculator {

    private RecurringScheduleCalculator() {
    }

    public static LocalDate computeNextDate(LocalDate base, RecurringPeriod period) {
        if (base == null) {
            throw new IllegalArgumentException("Base date is required");
        }
        if (period == null) {
            throw new IllegalArgumentException("Recurring period is required");
        }

        return switch (period) {
            case DAILY -> base.plusDays(1);
            case WEEKLY -> base.plusWeeks(1);
            case MONTHLY -> base.plusMonths(1);
            case YEARLY -> base.plusYears(1);
        };
    }

    public static LocalDate nextOccurrenceAfter(LocalDate today, LocalDate startDate, RecurringPeriod period) {
        if (startDate == null) {
            throw new IllegalArgumentException("Recurring rule startDate is required");
        }
        if (period == null) {
            throw new IllegalArgumentException("Recurring rule period is required");
        }
        LocalDate candidate = startDate;
        LocalDate reference = today != null ? today : LocalDate.now();
        int guard = 0;
        while (!candidate.isAfter(reference) && guard < 500) {
            candidate = computeNextDate(candidate, period);
            guard++;
        }
        if (guard >= 500) {
            throw new IllegalArgumentException("Invalid recurring rule period");
        }
        return candidate;
    }
}
