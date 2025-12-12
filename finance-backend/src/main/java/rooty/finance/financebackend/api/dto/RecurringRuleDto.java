package rooty.finance.financebackend.api.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import rooty.finance.financebackend.domain.RecurringPeriod;

public record RecurringRuleDto(
        Long id,
        Long accountId,
        Long categoryId,
        BigDecimal amount,
        String direction,
        RecurringPeriod period,
        LocalDate startDate,
        LocalDate endDate,
        boolean autoPost,
        String note) {
}
