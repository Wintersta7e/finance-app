package rooty.finance.financebackend.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecurringRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long accountId;
    private Long categoryId;

    private BigDecimal amount;
    private String direction;

    @Enumerated(EnumType.STRING)
    private RecurringPeriod period;
    private LocalDate startDate;
    private LocalDate endDate;

    private boolean autoPost;
}
