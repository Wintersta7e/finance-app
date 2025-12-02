package rooty.finance.financebackend.api;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import rooty.finance.financebackend.api.dto.AccountDto;
import rooty.finance.financebackend.domain.Account;
import rooty.finance.financebackend.domain.AccountRepository;

import java.util.List;

@RestController
@RequestMapping("/api/accounts")
public class AccountController {

    private final AccountRepository accountRepository;

    public AccountController(AccountRepository accountRepository) {
        this.accountRepository = accountRepository;
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
        accountRepository.deleteById(id);
    }
}
