package rooty.finance.financebackend.service;

import org.springframework.stereotype.Service;
import rooty.finance.financebackend.api.dto.BudgetVsActualDto;
import rooty.finance.financebackend.api.dto.CategoryAmountDto;
import rooty.finance.financebackend.api.dto.MonthSummaryDto;
import rooty.finance.financebackend.api.dto.NetWorthPointDto;
import rooty.finance.financebackend.domain.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class AnalyticsService {

    private final TransactionRepository transactionRepository;
    private final AccountRepository accountRepository;
    private final BudgetRepository budgetRepository;
    private final CategoryRepository categoryRepository;

    public AnalyticsService(
            TransactionRepository transactionRepository,
            AccountRepository accountRepository,
            BudgetRepository budgetRepository,
            CategoryRepository categoryRepository) {
        this.transactionRepository = transactionRepository;
        this.accountRepository = accountRepository;
        this.budgetRepository = budgetRepository;
        this.categoryRepository = categoryRepository;
    }

    public MonthSummaryDto getMonthSummary(int year, int month) {
        LocalDate start = LocalDate.of(year, month, 1);
        LocalDate end = start.with(TemporalAdjusters.lastDayOfMonth());
        List<Transaction> transactions = transactionRepository.findByDateBetween(start, end);

        BigDecimal totalIncome = BigDecimal.ZERO;
        BigDecimal fixedCosts = BigDecimal.ZERO;
        BigDecimal variableExpenses = BigDecimal.ZERO;

        for (Transaction tx : transactions) {
            String type = valueOrEmpty(tx.getType());
            if ("INCOME".equalsIgnoreCase(type)) {
                totalIncome = totalIncome.add(defaultAmount(tx.getAmount()));
            } else if ("FIXED_COST".equalsIgnoreCase(type)) {
                fixedCosts = fixedCosts.add(defaultAmount(tx.getAmount()).abs());
            } else if ("VARIABLE_EXPENSE".equalsIgnoreCase(type) || "EXPENSE".equalsIgnoreCase(type)) {
                variableExpenses = variableExpenses.add(defaultAmount(tx.getAmount()).abs());
            }
        }

        BigDecimal savings = totalIncome.subtract(fixedCosts.add(variableExpenses));
        BigDecimal endBalance = calculateBalanceUpTo(end);

        return new MonthSummaryDto(
                totalIncome,
                fixedCosts,
                variableExpenses,
                savings,
                endBalance);
    }

    public List<CategoryAmountDto> getCategoryBreakdown(YearMonth month) {
        LocalDate start = month.atDay(1);
        LocalDate end = month.atEndOfMonth();
        List<Transaction> transactions = transactionRepository.findByDateBetween(start, end);

        Map<Long, CategoryAmountDto> totals = new HashMap<>();
        for (Transaction tx : transactions) {
            if (tx.getCategory() == null) {
                continue;
            }
            BigDecimal amount = defaultAmount(tx.getAmount());
            if (amount.signum() >= 0) {
                continue;
            }
            Long categoryId = tx.getCategory().getId();
            CategoryAmountDto current = totals.get(categoryId);
            BigDecimal newTotal = (current == null ? BigDecimal.ZERO : current.amount()).add(amount.abs());
            totals.put(
                    categoryId,
                    new CategoryAmountDto(categoryId, tx.getCategory().getName(), newTotal));
        }

        return new ArrayList<>(totals.values());
    }

    public List<NetWorthPointDto> getNetWorthTrend(LocalDate from, LocalDate to) {
        List<NetWorthPointDto> points = new ArrayList<>();
        LocalDate cursor = from;
        while (!cursor.isAfter(to)) {
            points.add(new NetWorthPointDto(cursor, calculateBalanceUpTo(cursor)));
            cursor = cursor.plusDays(1);
        }
        return points;
    }

    public List<BudgetVsActualDto> getBudgetVsActual(YearMonth month) {
        LocalDate start = month.atDay(1);
        LocalDate end = month.atEndOfMonth();

        Map<Long, BigDecimal> actuals = new HashMap<>();
        for (Transaction tx : transactionRepository.findByDateBetween(start, end)) {
            if (tx.getCategory() == null || tx.getAmount() == null || tx.getAmount().signum() >= 0) {
                continue;
            }
            Long categoryId = tx.getCategory().getId();
            BigDecimal current = actuals.getOrDefault(categoryId, BigDecimal.ZERO);
            actuals.put(categoryId, current.add(tx.getAmount().abs()));
        }

        Map<Long, String> categoryNames = new HashMap<>();
        for (Category category : categoryRepository.findAll()) {
            categoryNames.put(category.getId(), category.getName());
        }

        List<BudgetVsActualDto> result = new ArrayList<>();
        for (Budget budget : budgetRepository.findAll()) {
            if (!isActiveForMonth(budget, start, end)) {
                continue;
            }
            BigDecimal budgetAmount = defaultAmount(budget.getAmount());
            BigDecimal actualAmount = actuals.getOrDefault(budget.getCategoryId(), BigDecimal.ZERO);
            String categoryName = categoryNames.getOrDefault(budget.getCategoryId(), "Category " + budget.getCategoryId());

            result.add(new BudgetVsActualDto(budget.getCategoryId(), categoryName, budgetAmount, actualAmount));
        }

        return result;
    }

    private boolean isActiveForMonth(Budget budget, LocalDate monthStart, LocalDate monthEnd) {
        LocalDate from = budget.getEffectiveFrom() != null ? budget.getEffectiveFrom() : LocalDate.MIN;
        LocalDate to = budget.getEffectiveTo() != null ? budget.getEffectiveTo() : LocalDate.MAX;
        return !from.isAfter(monthEnd) && !to.isBefore(monthStart);
    }

    private BigDecimal calculateBalanceUpTo(LocalDate dateInclusive) {
        BigDecimal starting = accountRepository.findAll().stream()
                .map(Account::getInitialBalance)
                .filter(v -> v != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal movements = transactionRepository.findAll().stream()
                .filter(tx -> tx.getDate() != null && !tx.getDate().isAfter(dateInclusive))
                .map(Transaction::getAmount)
                .filter(v -> v != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return starting.add(movements);
    }

    private BigDecimal defaultAmount(BigDecimal amount) {
        return amount == null ? BigDecimal.ZERO : amount;
    }

    private String valueOrEmpty(String value) {
        return value == null ? "" : value;
    }
}
