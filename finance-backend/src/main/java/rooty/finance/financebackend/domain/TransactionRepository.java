package rooty.finance.financebackend.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface TransactionRepository extends JpaRepository<Transaction, Long> {
    List<Transaction> findByDateBetween(LocalDate from, LocalDate to);

    Optional<Transaction> findTopByRecurringRuleIdOrderByDateDesc(Long recurringRuleId);

    Optional<Transaction> findTopByRecurringRuleIdAndDateLessThanEqualOrderByDateDesc(
            Long recurringRuleId, LocalDate date);

    boolean existsByCategoryId(Long categoryId);

    boolean existsByAccountId(Long accountId);

    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t WHERE t.date <= :date")
    BigDecimal sumAmountsUpToDate(@Param("date") LocalDate date);
}
