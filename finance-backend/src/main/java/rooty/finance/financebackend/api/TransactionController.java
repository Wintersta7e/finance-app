package rooty.finance.financebackend.api;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import rooty.finance.financebackend.api.dto.TransactionDto;
import rooty.finance.financebackend.domain.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/transactions")
public class TransactionController {

    private final TransactionRepository transactionRepository;
    private final AccountRepository accountRepository;
    private final CategoryRepository categoryRepository;

    public TransactionController(
            TransactionRepository transactionRepository,
            AccountRepository accountRepository,
            CategoryRepository categoryRepository) {
        this.transactionRepository = transactionRepository;
        this.accountRepository = accountRepository;
        this.categoryRepository = categoryRepository;
    }

    @GetMapping
    public List<TransactionDto> list(@RequestParam("from") LocalDate from, @RequestParam("to") LocalDate to) {
        return transactionRepository.findByDateBetween(from, to).stream()
                .map(DtoMapper::toDto)
                .toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TransactionDto create(@RequestBody TransactionDto dto) {
        Account account = findAccount(dto.accountId());
        Category category = findCategory(dto.categoryId());
        Transaction transaction = DtoMapper.toEntity(dto, account, category);
        transaction.setId(null);
        return DtoMapper.toDto(transactionRepository.save(transaction));
    }

    @PutMapping("/{id}")
    public TransactionDto update(@PathVariable Long id, @RequestBody TransactionDto dto) {
        Transaction existing =
                transactionRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        Account account = findAccount(dto.accountId());
        Category category = findCategory(dto.categoryId());
        DtoMapper.updateTransaction(existing, dto, account, category);
        return DtoMapper.toDto(transactionRepository.save(existing));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        if (!transactionRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
        transactionRepository.deleteById(id);
    }

    private Account findAccount(Long id) {
        if (id == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "accountId is required");
        }
        return accountRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Account not found"));
    }

    private Category findCategory(Long id) {
        if (id == null) {
            return null;
        }
        return categoryRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Category not found"));
    }
}
