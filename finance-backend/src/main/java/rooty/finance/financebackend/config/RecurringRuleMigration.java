package rooty.finance.financebackend.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import rooty.finance.financebackend.domain.RecurringRule;
import rooty.finance.financebackend.domain.RecurringRuleRepository;
import rooty.finance.financebackend.domain.Transaction;
import rooty.finance.financebackend.domain.TransactionRepository;
import rooty.finance.financebackend.service.RecurringScheduleCalculator;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * One-time migration to initialize nextOccurrence for existing recurring rules.
 * This runs before the auto-post job to ensure all rules have proper nextOccurrence values.
 */
@Component
public class RecurringRuleMigration {

    private static final Logger log = LoggerFactory.getLogger(RecurringRuleMigration.class);

    private final RecurringRuleRepository recurringRuleRepository;
    private final TransactionRepository transactionRepository;

    public RecurringRuleMigration(
            RecurringRuleRepository recurringRuleRepository,
            TransactionRepository transactionRepository) {
        this.recurringRuleRepository = recurringRuleRepository;
        this.transactionRepository = transactionRepository;
    }

    @EventListener(ApplicationReadyEvent.class)
    @Order(1) // Run before auto-post job (which has default order)
    @Transactional
    public void migrateNextOccurrence() {
        List<RecurringRule> rules = recurringRuleRepository.findAll();
        int migrated = 0;

        for (RecurringRule rule : rules) {
            if (rule.getNextOccurrence() == null && rule.getStartDate() != null && rule.getPeriod() != null) {
                LocalDate nextOcc = computeNextOccurrenceForExistingRule(rule);
                if (nextOcc != null) {
                    rule.setNextOccurrence(nextOcc);
                    recurringRuleRepository.save(rule);
                    migrated++;
                    log.info("Migrated rule {} nextOccurrence to {}", rule.getId(), nextOcc);
                }
            }
        }

        if (migrated > 0) {
            log.info("Migrated nextOccurrence for {} recurring rules", migrated);
        }
    }

    private LocalDate computeNextOccurrenceForExistingRule(RecurringRule rule) {
        // Find the last transaction for this rule
        Optional<Transaction> lastTx = transactionRepository
                .findTopByRecurringRuleIdOrderByDateDesc(rule.getId());

        if (lastTx.isPresent() && lastTx.get().getDate() != null) {
            // Compute next from last transaction
            return RecurringScheduleCalculator.computeNextDate(
                    lastTx.get().getDate(), rule.getPeriod());
        }

        // No transactions exist, use startDate
        return rule.getStartDate();
    }
}
