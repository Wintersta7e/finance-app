package rooty.finance.financebackend.config;

import java.math.BigDecimal;
import java.util.List;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import rooty.finance.financebackend.domain.Account;
import rooty.finance.financebackend.domain.AccountRepository;
import rooty.finance.financebackend.domain.AppSettings;
import rooty.finance.financebackend.domain.AppSettingsRepository;
import rooty.finance.financebackend.domain.Category;
import rooty.finance.financebackend.domain.CategoryRepository;

@Component
public class DataInitializer {

    private final AccountRepository accountRepository;
    private final CategoryRepository categoryRepository;
    private final AppSettingsRepository appSettingsRepository;

    public DataInitializer(
            AccountRepository accountRepository,
            CategoryRepository categoryRepository,
            AppSettingsRepository appSettingsRepository) {
        this.accountRepository = accountRepository;
        this.categoryRepository = categoryRepository;
        this.appSettingsRepository = appSettingsRepository;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void initialize() {
        seedSettings();
        seedDefaultAccount();
        seedCategories();
    }

    private void seedSettings() {
        if (appSettingsRepository.count() == 0) {
            appSettingsRepository.save(
                    AppSettings.builder().id(1L).currencyCode("EUR").firstDayOfMonth(1).firstDayOfWeek(1).build());
        }
    }

    private void seedDefaultAccount() {
        if (accountRepository.count() == 0) {
            accountRepository.save(Account.builder()
                    .name("Main Account")
                    .type("CHECKING")
                    .initialBalance(BigDecimal.ZERO)
                    .archived(false)
                    .build());
        }
    }

    private void seedCategories() {
        if (categoryRepository.count() == 0) {
            List<Category> defaults = List.of(
                    Category.builder().name("Salary").kind("INCOME").fixedCost(false).build(),
                    Category.builder().name("Other income").kind("INCOME").fixedCost(false).build(),
                    Category.builder().name("Rent").kind("EXPENSE").fixedCost(true).build(),
                    Category.builder().name("Utilities").kind("EXPENSE").fixedCost(true).build(),
                    Category.builder().name("Insurance").kind("EXPENSE").fixedCost(true).build(),
                    Category.builder().name("Groceries").kind("EXPENSE").fixedCost(false).build(),
                    Category.builder().name("Transport").kind("EXPENSE").fixedCost(false).build(),
                    Category.builder().name("Entertainment").kind("EXPENSE").fixedCost(false).build());
            categoryRepository.saveAll(defaults);
        }
    }
}
