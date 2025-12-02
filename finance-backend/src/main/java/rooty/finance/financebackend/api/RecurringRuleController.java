package rooty.finance.financebackend.api;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import rooty.finance.financebackend.api.dto.RecurringRuleDto;
import rooty.finance.financebackend.api.dto.TransactionDto;
import rooty.finance.financebackend.domain.Account;
import rooty.finance.financebackend.domain.AccountRepository;
import rooty.finance.financebackend.domain.Category;
import rooty.finance.financebackend.domain.CategoryRepository;
import rooty.finance.financebackend.domain.RecurringRule;
import rooty.finance.financebackend.domain.RecurringRuleRepository;
import rooty.finance.financebackend.domain.Transaction;
import rooty.finance.financebackend.domain.TransactionRepository;

@RestController
@RequestMapping("/api/recurring-rules")
public class RecurringRuleController {

    private final RecurringRuleRepository recurringRuleRepository;
    private final AccountRepository accountRepository;
    private final CategoryRepository categoryRepository;
    private final TransactionRepository transactionRepository;

    public RecurringRuleController(
            RecurringRuleRepository recurringRuleRepository,
            AccountRepository accountRepository,
            CategoryRepository categoryRepository,
            TransactionRepository transactionRepository) {
        this.recurringRuleRepository = recurringRuleRepository;
        this.accountRepository = accountRepository;
        this.categoryRepository = categoryRepository;
        this.transactionRepository = transactionRepository;
    }

    @GetMapping
    public List<RecurringRuleDto> list() {
        return recurringRuleRepository.findAll().stream().map(DtoMapper::toDto).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public RecurringRuleDto create(@RequestBody RecurringRuleDto dto) {
        RecurringRule rule = DtoMapper.toEntity(dto);
        rule.setId(null);
        return DtoMapper.toDto(recurringRuleRepository.save(rule));
    }

    @PutMapping("/{id}")
    public RecurringRuleDto update(@PathVariable Long id, @RequestBody RecurringRuleDto dto) {
        RecurringRule existing = recurringRuleRepository
                .findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        DtoMapper.updateRecurringRule(existing, dto);
        return DtoMapper.toDto(recurringRuleRepository.save(existing));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        if (!recurringRuleRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
        recurringRuleRepository.deleteById(id);
    }

    @PostMapping("/{id}/generate-next")
    public TransactionDto generateNext(@PathVariable Long id) {
        RecurringRule rule = recurringRuleRepository
                .findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        LocalDate nextDate = nextOccurrenceAfterToday(rule);
        if (rule.getEndDate() != null && nextDate.isAfter(rule.getEndDate())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No future occurrences for this rule");
        }

        Account account = accountRepository.findById(rule.getAccountId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Account not found for rule"));
        Category category = null;
        if (rule.getCategoryId() != null) {
            category = categoryRepository
                    .findById(rule.getCategoryId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Category not found for rule"));
        }

        BigDecimal signedAmount = normalizeAmount(rule.getAmount(), rule.getDirection());
        String type = "INCOME";
        if (!"INCOME".equalsIgnoreCase(rule.getDirection())) {
            type = "FIXED_COST";
        }

        Transaction transaction = Transaction.builder()
                .date(nextDate)
                .amount(signedAmount)
                .type(type)
                .account(account)
                .category(category)
                .notes(null)
                .recurringRuleId(rule.getId())
                .build();

        return DtoMapper.toDto(transactionRepository.save(transaction));
    }

    private LocalDate nextOccurrenceAfterToday(RecurringRule rule) {
        LocalDate start = rule.getStartDate();
        if (start == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Recurring rule startDate is required");
        }
        LocalDate candidate = start;
        LocalDate today = LocalDate.now();
        int guard = 0;
        while (!candidate.isAfter(today) && guard < 500) {
            candidate = advance(candidate, rule.getPeriod());
            guard++;
        }
        if (guard >= 500) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid recurring rule period");
        }
        return candidate;
    }

    private LocalDate advance(LocalDate date, String period) {
        if (period == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Recurring rule period is required");
        }
        return switch (period.toUpperCase()) {
            case "WEEKLY" -> date.plusWeeks(1);
            case "MONTHLY" -> date.plusMonths(1);
            case "YEARLY" -> date.plusYears(1);
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported period: " + period);
        };
    }

    private BigDecimal normalizeAmount(BigDecimal amount, String direction) {
        if (amount == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Amount is required");
        }
        BigDecimal absolute = amount.abs();
        if ("EXPENSE".equalsIgnoreCase(direction)) {
            return absolute.negate();
        }
        return absolute;
    }
}
