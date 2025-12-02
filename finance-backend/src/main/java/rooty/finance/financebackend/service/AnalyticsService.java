package rooty.finance.financebackend.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import rooty.finance.financebackend.api.dto.CategoryAmountDto;
import rooty.finance.financebackend.api.dto.MonthSummaryDto;
import rooty.finance.financebackend.api.dto.NetWorthPointDto;
import rooty.finance.financebackend.domain.Account;
import rooty.finance.financebackend.domain.AccountRepository;
import rooty.finance.financebackend.domain.Transaction;
import rooty.finance.financebackend.domain.TransactionRepository;

@Service
public class AnalyticsService {

    private final TransactionRepository transactionRepository;
    private final AccountRepository accountRepository;

    public AnalyticsService(TransactionRepository transactionRepository, AccountRepository accountRepository) {
        this.transactionRepository = transactionRepository;
        this.accountRepository = accountRepository;
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
