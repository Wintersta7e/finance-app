package rooty.finance.financebackend.api.dto;

public record AppSettingsDto(Long id, String currencyCode, int firstDayOfMonth, int firstDayOfWeek) {
}
