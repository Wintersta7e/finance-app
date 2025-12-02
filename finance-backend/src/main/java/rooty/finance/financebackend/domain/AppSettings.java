package rooty.finance.financebackend.domain;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AppSettings {

    @Id
    @Builder.Default
    private Long id = 1L;

    private String currencyCode;
    private int firstDayOfMonth;
    private int firstDayOfWeek;
}
