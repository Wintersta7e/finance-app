package rooty.finance.financebackend.api.dto;

import java.math.BigDecimal;

public record CategoryAmountDto(Long categoryId, String categoryName, BigDecimal amount) {
}
