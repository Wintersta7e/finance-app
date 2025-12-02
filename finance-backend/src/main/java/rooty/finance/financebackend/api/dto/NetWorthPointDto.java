package rooty.finance.financebackend.api.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record NetWorthPointDto(LocalDate date, BigDecimal value) {
}
