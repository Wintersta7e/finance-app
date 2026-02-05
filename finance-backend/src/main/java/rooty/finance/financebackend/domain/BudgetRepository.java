package rooty.finance.financebackend.domain;

import org.springframework.data.jpa.repository.JpaRepository;

public interface BudgetRepository extends JpaRepository<Budget, Long> {

    boolean existsByCategoryId(Long categoryId);
}
