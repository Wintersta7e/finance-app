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
import rooty.finance.financebackend.service.RecurringScheduleCalculator;

import java.time.LocalDate;
import java.util.List;

/**
 * One-time migration to initialize nextOccurrence for existing recurring rules.
 * This runs before the auto-post job to ensure all rules have proper nextOccurrence values.
 */
@Component
public class RecurringRuleMigration {

    private static final Logger log = LoggerFactory.getLogger(RecurringRuleMigration.class);

    private final RecurringRuleRepository recurringRuleRepository;

    public RecurringRuleMigration(RecurringRuleRepository recurringRuleRepository) {
        this.recurringRuleRepository = recurringRuleRepository;
    }

    @EventListener(ApplicationReadyEvent.class)
    @Order(1) // Run before auto-post job (which has default order)
    @Transactional
    public void migrateNextOccurrence() {
        List<RecurringRule> rules = recurringRuleRepository.findAll();
        int migrated = 0;

        for (RecurringRule rule : rules) {
            if (rule.getStartDate() != null && rule.getPeriod() != null) {
                LocalDate correctNextOcc = computeNextOccurrenceForExistingRule(rule);
                // Reset if null OR if currently set to a future date but startDate allows earlier
                // This fixes rules where nextOccurrence was incorrectly computed
                if (rule.getNextOccurrence() == null ||
                    (correctNextOcc.isBefore(rule.getNextOccurrence()) && !correctNextOcc.isAfter(LocalDate.now()))) {
                    rule.setNextOccurrence(correctNextOcc);
                    recurringRuleRepository.save(rule);
                    migrated++;
                    log.info("Migrated rule {} nextOccurrence to {}", rule.getId(), correctNextOcc);
                }
            }
        }

        if (migrated > 0) {
            log.info("Migrated nextOccurrence for {} recurring rules", migrated);
        }
    }

    private LocalDate computeNextOccurrenceForExistingRule(RecurringRule rule) {
        // Set to startDate to allow auto-post service to catch up on any missed occurrences
        // The auto-post will create transactions for all dates <= today, then advance nextOccurrence
        return rule.getStartDate();
    }
}
