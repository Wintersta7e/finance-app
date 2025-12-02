package rooty.finance.financebackend.api;

import java.util.Optional;
import rooty.finance.financebackend.api.dto.AccountDto;
import rooty.finance.financebackend.api.dto.AppSettingsDto;
import rooty.finance.financebackend.api.dto.CategoryDto;
import rooty.finance.financebackend.api.dto.BudgetDto;
import rooty.finance.financebackend.api.dto.RecurringRuleDto;
import rooty.finance.financebackend.api.dto.TransactionDto;
import rooty.finance.financebackend.domain.Account;
import rooty.finance.financebackend.domain.AppSettings;
import rooty.finance.financebackend.domain.Budget;
import rooty.finance.financebackend.domain.Category;
import rooty.finance.financebackend.domain.RecurringRule;
import rooty.finance.financebackend.domain.Transaction;

public final class DtoMapper {

    private DtoMapper() {}

    public static AccountDto toDto(Account account) {
        return new AccountDto(
                account.getId(),
                account.getName(),
                account.getType(),
                account.getInitialBalance(),
                account.isArchived());
    }

    public static Account toEntity(AccountDto dto) {
        return Account.builder()
                .id(dto.id())
                .name(dto.name())
                .type(dto.type())
                .initialBalance(dto.initialBalance())
                .archived(dto.archived())
                .build();
    }

    public static void updateAccount(Account account, AccountDto dto) {
        account.setName(dto.name());
        account.setType(dto.type());
        account.setInitialBalance(dto.initialBalance());
        account.setArchived(dto.archived());
    }

    public static CategoryDto toDto(Category category) {
        return new CategoryDto(category.getId(), category.getName(), category.getKind(), category.isFixedCost());
    }

    public static Category toEntity(CategoryDto dto) {
        return Category.builder()
                .id(dto.id())
                .name(dto.name())
                .kind(dto.kind())
                .fixedCost(dto.fixedCost())
                .build();
    }

    public static void updateCategory(Category category, CategoryDto dto) {
        category.setName(dto.name());
        category.setKind(dto.kind());
        category.setFixedCost(dto.fixedCost());
    }

    public static TransactionDto toDto(Transaction transaction) {
        return new TransactionDto(
                transaction.getId(),
                transaction.getDate(),
                transaction.getAmount(),
                transaction.getType(),
                Optional.ofNullable(transaction.getAccount()).map(Account::getId).orElse(null),
                Optional.ofNullable(transaction.getCategory()).map(Category::getId).orElse(null),
                transaction.getNotes(),
                transaction.getRecurringRuleId());
    }

    public static Transaction toEntity(TransactionDto dto, Account account, Category category) {
        return Transaction.builder()
                .id(dto.id())
                .date(dto.date())
                .amount(dto.amount())
                .type(dto.type())
                .account(account)
                .category(category)
                .notes(dto.notes())
                .recurringRuleId(dto.recurringRuleId())
                .build();
    }

    public static void updateTransaction(Transaction transaction, TransactionDto dto, Account account, Category category) {
        transaction.setDate(dto.date());
        transaction.setAmount(dto.amount());
        transaction.setType(dto.type());
        transaction.setAccount(account);
        transaction.setCategory(category);
        transaction.setNotes(dto.notes());
        transaction.setRecurringRuleId(dto.recurringRuleId());
    }

    public static RecurringRuleDto toDto(RecurringRule rule) {
        return new RecurringRuleDto(
                rule.getId(),
                rule.getAccountId(),
                rule.getCategoryId(),
                rule.getAmount(),
                rule.getDirection(),
                rule.getPeriod(),
                rule.getStartDate(),
                rule.getEndDate(),
                rule.isAutoPost());
    }

    public static RecurringRule toEntity(RecurringRuleDto dto) {
        return RecurringRule.builder()
                .id(dto.id())
                .accountId(dto.accountId())
                .categoryId(dto.categoryId())
                .amount(dto.amount())
                .direction(dto.direction())
                .period(dto.period())
                .startDate(dto.startDate())
                .endDate(dto.endDate())
                .autoPost(dto.autoPost())
                .build();
    }

    public static void updateRecurringRule(RecurringRule rule, RecurringRuleDto dto) {
        rule.setAccountId(dto.accountId());
        rule.setCategoryId(dto.categoryId());
        rule.setAmount(dto.amount());
        rule.setDirection(dto.direction());
        rule.setPeriod(dto.period());
        rule.setStartDate(dto.startDate());
        rule.setEndDate(dto.endDate());
        rule.setAutoPost(dto.autoPost());
    }

    public static AppSettingsDto toDto(AppSettings settings) {
        return new AppSettingsDto(
                settings.getId(), settings.getCurrencyCode(), settings.getFirstDayOfMonth(), settings.getFirstDayOfWeek());
    }

    public static AppSettings toEntity(AppSettingsDto dto) {
        return AppSettings.builder()
                .id(dto.id() != null ? dto.id() : 1L)
                .currencyCode(dto.currencyCode())
                .firstDayOfMonth(dto.firstDayOfMonth())
                .firstDayOfWeek(dto.firstDayOfWeek())
                .build();
    }

    public static void updateAppSettings(AppSettings settings, AppSettingsDto dto) {
        settings.setCurrencyCode(dto.currencyCode());
        settings.setFirstDayOfMonth(dto.firstDayOfMonth());
        settings.setFirstDayOfWeek(dto.firstDayOfWeek());
    }

    public static BudgetDto toDto(Budget budget) {
        return new BudgetDto(
                budget.getId(),
                budget.getCategoryId(),
                budget.getAmount(),
                budget.getPeriod(),
                budget.getEffectiveFrom(),
                budget.getEffectiveTo());
    }

    public static Budget toEntity(BudgetDto dto) {
        return Budget.builder()
                .id(dto.id())
                .categoryId(dto.categoryId())
                .amount(dto.amount())
                .period(dto.period())
                .effectiveFrom(dto.effectiveFrom())
                .effectiveTo(dto.effectiveTo())
                .build();
    }

    public static void updateBudget(Budget budget, BudgetDto dto) {
        budget.setCategoryId(dto.categoryId());
        budget.setAmount(dto.amount());
        budget.setPeriod(dto.period());
        budget.setEffectiveFrom(dto.effectiveFrom());
        budget.setEffectiveTo(dto.effectiveTo());
    }
}
