package rooty.finance.financebackend.api.dto;

import java.math.BigDecimal;

public record MonthSummaryDto(
        BigDecimal totalIncome,
        BigDecimal fixedCosts,
        BigDecimal variableExpenses,
        BigDecimal savings,
        BigDecimal endOfMonthBalance) {}
