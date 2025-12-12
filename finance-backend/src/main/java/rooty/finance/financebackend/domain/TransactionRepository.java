package rooty.finance.financebackend.domain;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface TransactionRepository extends JpaRepository<Transaction, Long> {
    List<Transaction> findByDateBetween(LocalDate from, LocalDate to);

    Optional<Transaction> findTopByRecurringRuleIdOrderByDateDesc(Long recurringRuleId);

    Optional<Transaction> findTopByRecurringRuleIdAndDateLessThanEqualOrderByDateDesc(
            Long recurringRuleId, LocalDate date);
}
