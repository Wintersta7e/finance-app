package rooty.finance.financebackend.api;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import rooty.finance.financebackend.api.dto.CategoryDto;
import rooty.finance.financebackend.domain.Category;
import rooty.finance.financebackend.domain.CategoryRepository;

import java.util.List;

@RestController
@RequestMapping("/api/categories")
public class CategoryController {

    private final CategoryRepository categoryRepository;

    public CategoryController(CategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
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
        categoryRepository.deleteById(id);
    }
}
