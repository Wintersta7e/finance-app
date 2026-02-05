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
import rooty.finance.financebackend.api.dto.CategoryDto;
import rooty.finance.financebackend.domain.BudgetRepository;
import rooty.finance.financebackend.domain.Category;
import rooty.finance.financebackend.domain.CategoryRepository;
import rooty.finance.financebackend.domain.RecurringRuleRepository;
import rooty.finance.financebackend.domain.TransactionRepository;

import java.util.List;

@RestController
@RequestMapping("/api/categories")
public class CategoryController {

    private final CategoryRepository categoryRepository;
    private final TransactionRepository transactionRepository;
    private final RecurringRuleRepository recurringRuleRepository;
    private final BudgetRepository budgetRepository;

    public CategoryController(CategoryRepository categoryRepository,
                              TransactionRepository transactionRepository,
                              RecurringRuleRepository recurringRuleRepository,
                              BudgetRepository budgetRepository) {
        this.categoryRepository = categoryRepository;
        this.transactionRepository = transactionRepository;
        this.recurringRuleRepository = recurringRuleRepository;
        this.budgetRepository = budgetRepository;
    }

    @GetMapping
    public List<CategoryDto> list() {
        return categoryRepository.findAll().stream().map(DtoMapper::toDto).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CategoryDto create(@RequestBody CategoryDto dto) {
        Category category = DtoMapper.toEntity(dto);
        category.setId(null);
        return DtoMapper.toDto(categoryRepository.save(category));
    }

    @PutMapping("/{id}")
    public CategoryDto update(@PathVariable Long id, @RequestBody CategoryDto dto) {
        Category category =
                categoryRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        DtoMapper.updateCategory(category, dto);
        return DtoMapper.toDto(categoryRepository.save(category));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        if (!categoryRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
        if (transactionRepository.existsByCategoryId(id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Cannot delete category with existing transactions");
        }
        if (recurringRuleRepository.existsByCategoryId(id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Cannot delete category with existing recurring rules");
        }
        if (budgetRepository.existsByCategoryId(id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Cannot delete category with existing budgets");
        }
        categoryRepository.deleteById(id);
    }
}
