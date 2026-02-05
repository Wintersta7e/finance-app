package rooty.finance.financebackend.api;

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
import rooty.finance.financebackend.api.dto.AccountDto;
import rooty.finance.financebackend.domain.Account;
import rooty.finance.financebackend.domain.AccountRepository;
import rooty.finance.financebackend.domain.RecurringRuleRepository;
import rooty.finance.financebackend.domain.TransactionRepository;

import java.util.List;

@RestController
@RequestMapping("/api/accounts")
public class AccountController {

    private final AccountRepository accountRepository;
    private final TransactionRepository transactionRepository;
    private final RecurringRuleRepository recurringRuleRepository;

    public AccountController(AccountRepository accountRepository,
                             TransactionRepository transactionRepository,
                             RecurringRuleRepository recurringRuleRepository) {
        this.accountRepository = accountRepository;
        this.transactionRepository = transactionRepository;
        this.recurringRuleRepository = recurringRuleRepository;
    }

    @GetMapping
    public List<AccountDto> list() {
        return accountRepository.findAll().stream().map(DtoMapper::toDto).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AccountDto create(@RequestBody AccountDto dto) {
        Account account = DtoMapper.toEntity(dto);
        account.setId(null);
        return DtoMapper.toDto(accountRepository.save(account));
    }

    @PutMapping("/{id}")
    public AccountDto update(@PathVariable Long id, @RequestBody AccountDto dto) {
        Account account =
                accountRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        DtoMapper.updateAccount(account, dto);
        return DtoMapper.toDto(accountRepository.save(account));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        if (!accountRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
        if (transactionRepository.existsByAccountId(id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Cannot delete account with existing transactions");
        }
        if (recurringRuleRepository.existsByAccountId(id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Cannot delete account with existing recurring rules");
        }
        accountRepository.deleteById(id);
    }
}
