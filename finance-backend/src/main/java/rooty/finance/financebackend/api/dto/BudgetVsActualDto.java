package rooty.finance.financebackend.api.dto;

import java.math.BigDecimal;

public record BudgetVsActualDto(Long categoryId, String categoryName, BigDecimal budgetAmount,
                                BigDecimal actualAmount) {
}
