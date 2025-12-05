package rooty.finance.financebackend.api;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import rooty.finance.financebackend.api.dto.RecurringRuleDto;
import rooty.finance.financebackend.api.dto.TransactionDto;
import rooty.finance.financebackend.domain.Account;
import rooty.finance.financebackend.domain.Category;
import rooty.finance.financebackend.domain.AccountRepository;
import rooty.finance.financebackend.domain.CategoryRepository;
import rooty.finance.financebackend.domain.RecurringRuleRepository;
import rooty.finance.financebackend.domain.RecurringRule;
import rooty.finance.financebackend.domain.Transaction;
import rooty.finance.financebackend.domain.TransactionRepository;
import rooty.finance.financebackend.service.RecurringScheduleCalculator;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

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

        LocalDate nextDate;
        try {
            nextDate = RecurringScheduleCalculator.nextOccurrenceAfter(LocalDate.now(), rule.getStartDate(), rule.getPeriod());
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage());
        }
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
