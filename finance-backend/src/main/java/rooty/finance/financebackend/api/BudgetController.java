package rooty.finance.financebackend.api;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import rooty.finance.financebackend.api.dto.BudgetDto;
import rooty.finance.financebackend.domain.Budget;
import rooty.finance.financebackend.domain.BudgetRepository;
import rooty.finance.financebackend.domain.CategoryRepository;

import java.util.List;

@RestController
@RequestMapping("/api/budgets")
public class BudgetController {

    private final BudgetRepository budgetRepository;
    private final CategoryRepository categoryRepository;

    public BudgetController(BudgetRepository budgetRepository, CategoryRepository categoryRepository) {
        this.budgetRepository = budgetRepository;
        this.categoryRepository = categoryRepository;
    }

    @GetMapping
    public List<BudgetDto> list() {
        return budgetRepository.findAll().stream().map(DtoMapper::toDto).toList();
    }

    @PostMapping
    public BudgetDto create(@RequestBody BudgetDto dto) {
        validateCategory(dto.categoryId());
        Budget saved = budgetRepository.save(DtoMapper.toEntity(dto));
        return DtoMapper.toDto(saved);
    }

    @PutMapping("/{id}")
    public BudgetDto update(@PathVariable Long id, @RequestBody BudgetDto dto) {
        validateCategory(dto.categoryId());
        Budget budget = budgetRepository
                .findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Budget not found"));

        DtoMapper.updateBudget(budget, dto);
        return DtoMapper.toDto(budgetRepository.save(budget));
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        if (!budgetRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Budget not found");
        }
        budgetRepository.deleteById(id);
    }

    private void validateCategory(Long categoryId) {
        categoryRepository
                .findById(categoryId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Category not found"));
    }
}
