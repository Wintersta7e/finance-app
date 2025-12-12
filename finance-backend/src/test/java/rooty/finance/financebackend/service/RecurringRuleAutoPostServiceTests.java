package rooty.finance.financebackend.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import rooty.finance.financebackend.domain.Account;
import rooty.finance.financebackend.domain.AccountRepository;
import rooty.finance.financebackend.domain.Category;
import rooty.finance.financebackend.domain.CategoryRepository;
import rooty.finance.financebackend.domain.RecurringPeriod;
import rooty.finance.financebackend.domain.RecurringRule;
import rooty.finance.financebackend.domain.RecurringRuleRepository;
import rooty.finance.financebackend.domain.Transaction;
import rooty.finance.financebackend.domain.TransactionRepository;

@SpringBootTest
@Transactional
class RecurringRuleAutoPostServiceTests {

    @Autowired
    private RecurringRuleAutoPostService autoPostService;

    @Autowired
    private RecurringRuleRepository recurringRuleRepository;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    private Account account;
    private Category expenseCategory;

    @BeforeEach
    void setup() {
        transactionRepository.deleteAll();
        recurringRuleRepository.deleteAll();
        categoryRepository.deleteAll();
        accountRepository.deleteAll();

        account = accountRepository.save(Account.builder()
                .name("Checking")
                .type("CHECKING")
                .initialBalance(BigDecimal.ZERO)
                .archived(false)
                .build());

        expenseCategory = categoryRepository.save(
                Category.builder().name("Rent").kind("EXPENSE").fixedCost(true).build());
    }

    @Test
    void autoPostCreatesMissingOccurrencesUpToToday() {
        RecurringRule rule = recurringRuleRepository.save(RecurringRule.builder()
                .accountId(account.getId())
                .categoryId(expenseCategory.getId())
                .amount(BigDecimal.valueOf(100))
                .direction("EXPENSE")
                .period(RecurringPeriod.MONTHLY)
                .startDate(LocalDate.of(2024, 1, 1))
                .endDate(null)
                .autoPost(true)
                .build());

        int created = autoPostService.autoPostDueTransactions(LocalDate.of(2024, 3, 15));

        List<Transaction> transactions = transactionRepository.findAll().stream()
                .sorted(Comparator.comparing(Transaction::getDate))
                .toList();

        assertThat(created).isEqualTo(3);
        assertThat(transactions).hasSize(3);
        assertThat(transactions)
                .extracting(Transaction::getDate)
                .containsExactly(LocalDate.of(2024, 1, 1), LocalDate.of(2024, 2, 1), LocalDate.of(2024, 3, 1));
        assertThat(transactions)
                .extracting(Transaction::getAmount)
                .allMatch(amount -> amount.compareTo(BigDecimal.valueOf(-100)) == 0);
        assertThat(transactions)
                .allSatisfy(tx -> {
                    assertThat(tx.getRecurringRuleId()).isEqualTo(rule.getId());
                    assertThat(tx.getAccount().getId()).isEqualTo(account.getId());
                    assertThat(tx.getCategory().getId()).isEqualTo(expenseCategory.getId());
                    assertThat(tx.getType()).isEqualTo("FIXED_COST");
                });
    }

    @Test
    void autoPostResumesFromLastGeneratedTransaction() {
        RecurringRule rule = recurringRuleRepository.save(RecurringRule.builder()
                .accountId(account.getId())
                .categoryId(null)
                .amount(BigDecimal.valueOf(250))
                .direction("INCOME")
                .period(RecurringPeriod.MONTHLY)
                .startDate(LocalDate.of(2024, 1, 1))
                .endDate(null)
                .autoPost(true)
                .build());

        transactionRepository.save(Transaction.builder()
                .date(LocalDate.of(2024, 2, 1))
                .amount(BigDecimal.valueOf(250))
                .type("INCOME")
                .account(account)
                .category(null)
                .notes(null)
                .recurringRuleId(rule.getId())
                .build());

        int created = autoPostService.autoPostDueTransactions(LocalDate.of(2024, 3, 15));

        List<LocalDate> dates = transactionRepository.findAll().stream()
                .filter(tx -> rule.getId().equals(tx.getRecurringRuleId()))
                .map(Transaction::getDate)
                .sorted()
                .toList();

        assertThat(created).isEqualTo(1);
        assertThat(dates).containsExactly(LocalDate.of(2024, 2, 1), LocalDate.of(2024, 3, 1));
    }

    @Test
    void autoPostStopsAtRuleEndDate() {
        RecurringRule rule = recurringRuleRepository.save(RecurringRule.builder()
                .accountId(account.getId())
                .categoryId(expenseCategory.getId())
                .amount(BigDecimal.valueOf(50))
                .direction("EXPENSE")
                .period(RecurringPeriod.MONTHLY)
                .startDate(LocalDate.of(2024, 1, 1))
                .endDate(LocalDate.of(2024, 2, 15))
                .autoPost(true)
                .build());

        int created = autoPostService.autoPostDueTransactions(LocalDate.of(2024, 4, 1));

        List<LocalDate> dates = transactionRepository.findAll().stream()
                .filter(tx -> rule.getId().equals(tx.getRecurringRuleId()))
                .map(Transaction::getDate)
                .sorted()
                .toList();

        assertThat(created).isEqualTo(2);
        assertThat(dates).containsExactly(LocalDate.of(2024, 1, 1), LocalDate.of(2024, 2, 1));
    }
}
