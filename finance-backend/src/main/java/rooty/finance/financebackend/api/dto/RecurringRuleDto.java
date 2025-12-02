package rooty.finance.financebackend.api.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record RecurringRuleDto(
        Long id,
        Long accountId,
        Long categoryId,
        BigDecimal amount,
        String direction,
        String period,
        LocalDate startDate,
        LocalDate endDate,
        boolean autoPost) {
}
