package rooty.finance.financebackend.api.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record BudgetDto(
        Long id, Long categoryId, BigDecimal amount, String period, LocalDate effectiveFrom, LocalDate effectiveTo) {
}
