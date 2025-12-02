package rooty.finance.financebackend.api.dto;

import java.math.BigDecimal;

public record AccountDto(Long id, String name, String type, BigDecimal initialBalance, boolean archived) {
}
