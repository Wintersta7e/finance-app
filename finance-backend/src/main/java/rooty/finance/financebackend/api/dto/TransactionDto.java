package rooty.finance.financebackend.api.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record TransactionDto(
        Long id,
        LocalDate date,
        BigDecimal amount,
        String type,
        Long accountId,
        Long categoryId,
        String notes,
        Long recurringRuleId) {}
