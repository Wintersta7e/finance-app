package rooty.finance.financebackend.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Month;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import rooty.finance.financebackend.api.dto.MonthSummaryDto;
import rooty.finance.financebackend.domain.Account;
import rooty.finance.financebackend.domain.AccountRepository;
import rooty.finance.financebackend.domain.Category;
import rooty.finance.financebackend.domain.CategoryRepository;
import rooty.finance.financebackend.domain.Transaction;
import rooty.finance.financebackend.domain.TransactionRepository;

@SpringBootTest
@Transactional
class AnalyticsServiceTests {

    @Autowired
    private AnalyticsService analyticsService;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Test
    void monthSummaryCalculatesIncomeExpensesAndBalance() {
        transactionRepository.deleteAll();
        categoryRepository.deleteAll();
        accountRepository.deleteAll();

        Account account = accountRepository.save(Account.builder()
                .name("Test Account")
                .type("CHECKING")
                .initialBalance(BigDecimal.valueOf(100))
                .archived(false)
                .build());

        Category salary = categoryRepository.save(
                Category.builder().name("Salary").kind("INCOME").fixedCost(false).build());
        Category rent =
                categoryRepository.save(Category.builder().name("Rent").kind("EXPENSE").fixedCost(true).build());
        Category groceries = categoryRepository.save(
                Category.builder().name("Groceries").kind("EXPENSE").fixedCost(false).build());

        transactionRepository.save(Transaction.builder()
                .date(LocalDate.of(2024, Month.JANUARY, 5))
                .amount(BigDecimal.valueOf(2000))
                .type("INCOME")
                .account(account)
                .category(salary)
                .notes(null)
                .recurringRuleId(null)
                .build());

        transactionRepository.save(Transaction.builder()
                .date(LocalDate.of(2024, Month.JANUARY, 8))
                .amount(BigDecimal.valueOf(-800))
                .type("FIXED_COST")
                .account(account)
                .category(rent)
                .notes(null)
                .recurringRuleId(null)
                .build());

        transactionRepository.save(Transaction.builder()
                .date(LocalDate.of(2024, Month.JANUARY, 12))
                .amount(BigDecimal.valueOf(-300))
                .type("VARIABLE_EXPENSE")
                .account(account)
                .category(groceries)
                .notes(null)
                .recurringRuleId(null)
                .build());

        MonthSummaryDto summary = analyticsService.getMonthSummary(2024, 1);

        assertThat(summary.totalIncome()).isEqualByComparingTo(BigDecimal.valueOf(2000));
        assertThat(summary.fixedCosts()).isEqualByComparingTo(BigDecimal.valueOf(800));
        assertThat(summary.variableExpenses()).isEqualByComparingTo(BigDecimal.valueOf(300));
        assertThat(summary.savings()).isEqualByComparingTo(BigDecimal.valueOf(900));
        assertThat(summary.endOfMonthBalance()).isEqualByComparingTo(BigDecimal.valueOf(100 + 2000 - 800 - 300));
    }
}
