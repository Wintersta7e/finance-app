package rooty.finance.financebackend.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import rooty.finance.financebackend.domain.RecurringPeriod;

class RecurringScheduleCalculatorTests {

    @Test
    void dailyPeriodAdvancesToNextDayAfterToday() {
        LocalDate today = LocalDate.of(2024, 1, 10);
        LocalDate startDate = LocalDate.of(2024, 1, 9);

        LocalDate next = RecurringScheduleCalculator.nextOccurrenceAfter(today, startDate, RecurringPeriod.DAILY);

        assertThat(next).isEqualTo(LocalDate.of(2024, 1, 11));
    }

    @Test
    void weeklyPeriodSkipsAheadToFirstFutureWeekday() {
        LocalDate today = LocalDate.of(2024, 1, 10); // Wednesday
        LocalDate startDate = LocalDate.of(2024, 1, 1); // Prior week

        LocalDate next = RecurringScheduleCalculator.nextOccurrenceAfter(today, startDate, RecurringPeriod.WEEKLY);

        assertThat(next).isEqualTo(LocalDate.of(2024, 1, 15));
    }
}
