package rooty.finance.financebackend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rooty.finance.financebackend.domain.Account;
import rooty.finance.financebackend.domain.AccountRepository;
import rooty.finance.financebackend.domain.Category;
import rooty.finance.financebackend.domain.CategoryRepository;
import rooty.finance.financebackend.domain.RecurringRule;
import rooty.finance.financebackend.domain.RecurringRuleRepository;
import rooty.finance.financebackend.domain.Transaction;
import rooty.finance.financebackend.domain.TransactionRepository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Service
public class RecurringRuleAutoPostService {

    private static final Logger log = LoggerFactory.getLogger(RecurringRuleAutoPostService.class);

    private final RecurringRuleRepository recurringRuleRepository;
    private final AccountRepository accountRepository;
    private final CategoryRepository categoryRepository;
    private final TransactionRepository transactionRepository;

    public RecurringRuleAutoPostService(
            RecurringRuleRepository recurringRuleRepository,
            AccountRepository accountRepository,
            CategoryRepository categoryRepository,
            TransactionRepository transactionRepository) {
        this.recurringRuleRepository = recurringRuleRepository;
        this.accountRepository = accountRepository;
        this.categoryRepository = categoryRepository;
        this.transactionRepository = transactionRepository;
    }

    @Transactional
    public int autoPostDueTransactions() {
        return autoPostDueTransactions(LocalDate.now());
    }

    @Transactional
    public int autoPostDueTransactions(LocalDate referenceDate) {
        LocalDate today = referenceDate != null ? referenceDate : LocalDate.now();
        List<RecurringRule> rules = recurringRuleRepository.findByAutoPostTrue();
        int created = 0;
        for (RecurringRule rule : rules) {
            try {
                created += autoPostRule(rule, today);
            } catch (IllegalStateException ex) {
                log.warn("Auto-post skipped for rule {}: {}", rule.getId(), ex.getMessage());
            }
        }
        return created;
    }

    private int autoPostRule(RecurringRule rule, LocalDate today) {
        if (rule.getStartDate() == null) {
            throw new IllegalStateException("Recurring rule startDate is required");
        }
        if (rule.getPeriod() == null) {
            throw new IllegalStateException("Recurring rule period is required");
        }

        LocalDate nextDate = determineNextDate(rule, today);
        if (nextDate == null) {
            return 0;
        }

        int created = 0;
        while (!nextDate.isAfter(today)) {
            if (rule.getEndDate() != null && nextDate.isAfter(rule.getEndDate())) {
                break;
            }
            Transaction tx = buildTransaction(rule, nextDate);
            transactionRepository.save(tx);
            created++;
            nextDate = RecurringScheduleCalculator.computeNextDate(nextDate, rule.getPeriod());
        }
        return created;
    }

    private LocalDate determineNextDate(RecurringRule rule, LocalDate today) {
        Optional<Transaction> last = transactionRepository.findTopByRecurringRuleIdAndDateLessThanEqualOrderByDateDesc(
                rule.getId(), today);
        if (last.isPresent()) {
            LocalDate lastDate = last.get().getDate();
            if (lastDate == null) {
                return null;
            }
            return RecurringScheduleCalculator.computeNextDate(lastDate, rule.getPeriod());
        }
        return rule.getStartDate();
    }

    private Transaction buildTransaction(RecurringRule rule, LocalDate date) {
        Account account = accountRepository.findById(rule.getAccountId())
                .orElseThrow(() -> new IllegalStateException("Account not found for rule " + rule.getId()));
        Category category = null;
        if (rule.getCategoryId() != null) {
            category = categoryRepository
                    .findById(rule.getCategoryId())
                    .orElseThrow(() -> new IllegalStateException("Category not found for rule " + rule.getId()));
        }

        BigDecimal normalizedAmount = normalizeAmount(rule.getAmount(), rule.getDirection());

        String type = "INCOME";
        if (!"INCOME".equalsIgnoreCase(rule.getDirection())) {
            type = "FIXED_COST";
        }

        return Transaction.builder()
                .id(null)
                .date(date)
                .amount(normalizedAmount)
                .type(type)
                .account(account)
                .category(category)
                .notes(null)
                .recurringRuleId(rule.getId())
                .build();
    }

    private BigDecimal normalizeAmount(BigDecimal amount, String direction) {
        if (amount == null) {
            throw new IllegalStateException("Amount is required for auto-post");
        }
        BigDecimal absolute = amount.abs();
        if ("EXPENSE".equalsIgnoreCase(direction)) {
            return absolute.negate();
        }
        return absolute;
    }
}
