# Finance Monorepo Code Review Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all issues identified in the code review: wildcard imports, stale closure bugs, N+1 queries, missing validations, and documentation gaps.

**Architecture:** Backend fixes focus on Java code quality and performance. Frontend fixes address React state management patterns. Changes are isolated and can be parallelized by module.

**Tech Stack:** Spring Boot 4/Java 21, React 18/TypeScript, Electron

---

## Phase 1: Quick Wins (Parallelizable)

### Task 1: Fix Wildcard Imports in Backend

**Files to modify:**
- `finance-backend/src/main/java/rooty/finance/financebackend/api/TransactionController.java`
- `finance-backend/src/main/java/rooty/finance/financebackend/api/DtoMapper.java`
- `finance-backend/src/main/java/rooty/finance/financebackend/config/DataInitializer.java`
- `finance-backend/src/main/java/rooty/finance/financebackend/service/AnalyticsService.java`
- `finance-backend/src/main/java/rooty/finance/financebackend/api/RecurringRuleController.java`
- `finance-backend/src/main/java/rooty/finance/financebackend/service/RecurringRuleAutoPostService.java`
- `finance-backend/src/main/java/rooty/finance/financebackend/config/RecurringRuleMigration.java`
- `finance-backend/src/main/java/rooty/finance/financebackend/api/CategoryController.java`
- `finance-backend/src/main/java/rooty/finance/financebackend/api/AccountController.java`
- `finance-backend/src/main/java/rooty/finance/financebackend/api/BudgetController.java`
- `finance-backend/src/main/java/rooty/finance/financebackend/api/AnalyticsController.java`
- `finance-backend/src/main/java/rooty/finance/financebackend/api/SettingsController.java`
- `finance-backend/src/main/java/rooty/finance/financebackend/config/SchemaUpdater.java`

**Action:** Replace all `import ....*;` with explicit imports. Example for TransactionController.java:

```java
// Replace line 4:
import org.springframework.web.bind.annotation.*;
// With:
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

// Replace line 7:
import rooty.finance.financebackend.domain.*;
// With:
import rooty.finance.financebackend.domain.Account;
import rooty.finance.financebackend.domain.AccountRepository;
import rooty.finance.financebackend.domain.Category;
import rooty.finance.financebackend.domain.CategoryRepository;
import rooty.finance.financebackend.domain.Transaction;
import rooty.finance.financebackend.domain.TransactionRepository;
```

**Verification:** Run `./mvnw compile` - should succeed with no errors.

---

### Task 2: Fix Stale Closure Bugs in CategoriesPage.tsx

**File:** `finance-desktop/src/pages/CategoriesPage.tsx`

**Lines to fix:** 141, 146, 156

**Changes:**

Line 141:
```typescript
// From:
<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
// To:
<input value={form.name} onChange={(e) => setForm(prev => prev ? { ...prev, name: e.target.value } : prev)} />
```

Line 146:
```typescript
// From:
onChange={(e) => setForm({ ...form, kind: e.target.value as CategoryForm['kind'] })}
// To:
onChange={(e) => setForm(prev => prev ? { ...prev, kind: e.target.value as CategoryForm['kind'] } : prev)}
```

Line 156:
```typescript
// From:
onChange={(e) => setForm({ ...form, fixedCost: e.target.checked })}
// To:
onChange={(e) => setForm(prev => prev ? { ...prev, fixedCost: e.target.checked } : prev)}
```

**Verification:** Run `npm run lint` in finance-desktop - should pass.

---

### Task 3: Fix Stale Closure Bugs in BudgetsPage.tsx

**File:** `finance-desktop/src/pages/BudgetsPage.tsx`

**Lines to fix:** 123, 241, 249, 256, and categoryDraft handlers (279-294)

**Pattern:** Replace all `setForm({ ...form, field: val })` with `setForm(prev => prev ? { ...prev, field: val } : prev)`

**Verification:** Run `npm run lint` in finance-desktop - should pass.

---

### Task 4: Fix Stale Closure Bugs in RecurringRulesPage.tsx

**File:** `finance-desktop/src/pages/RecurringRulesPage.tsx`

**Lines to fix:** 157, 255, 295, 303, 312, 316, 322, 333, and categoryDraft handlers (358-373)

**Pattern:** Replace all `setForm({ ...form, field: val })` with `setForm(prev => ({ ...prev, field: val }))`

**Verification:** Run `npm run lint` in finance-desktop - should pass.

---

### Task 5: Fix Stale Closure Bugs in QuickTransactionForm.tsx

**File:** `finance-desktop/src/components/transactions/QuickTransactionForm.tsx`

**Lines to fix:** 155, 166, 219, 245, 250, 260

**Pattern:** Replace all `setForm({ ...form, field: val })` with `setForm(prev => ({ ...prev, field: val }))`
Replace all `setCategoryDraft({ ...categoryDraft, field: val })` with `setCategoryDraft(prev => ({ ...prev, field: val }))`

**Verification:** Run `npm run lint` in finance-desktop - should pass.

---

### Task 6: Fix Duplicate useEffect in DashboardPage.tsx

**File:** `finance-desktop/src/pages/DashboardPage.tsx`

**Action:** Remove the first useEffect (lines 51-54) that duplicates the second one.

```typescript
// DELETE these lines (51-54):
useEffect(() => {
  loadSummary();
  loadBudgets();
}, [loadSummary, loadBudgets]);

// KEEP only the one with analyticsRefreshToken (lines 56-59):
useEffect(() => {
  loadSummary();
  loadBudgets();
}, [analyticsRefreshToken, loadSummary, loadBudgets]);
```

**Verification:** Run `npm run lint` in finance-desktop - should pass.

---

### Task 7: Add @ResponseStatus(CREATED) to BudgetController

**File:** `finance-backend/src/main/java/rooty/finance/financebackend/api/BudgetController.java`

**Action:** Add annotation to create method (around line 30):

```java
@PostMapping
@ResponseStatus(HttpStatus.CREATED)  // ADD THIS LINE
public BudgetDto create(@RequestBody BudgetDto dto) {
```

**Verification:** Run `./mvnw compile` - should succeed.

---

## Phase 2: Data Integrity

### Task 8: Add Cascade Delete Protection for CategoryController

**File:** `finance-backend/src/main/java/rooty/finance/financebackend/api/CategoryController.java`

**Action:** Add dependency checks before deletion. First add TransactionRepository, RecurringRuleRepository, and BudgetRepository to constructor, then modify delete method:

```java
@DeleteMapping("/{id}")
@ResponseStatus(HttpStatus.NO_CONTENT)
public void delete(@PathVariable Long id) {
    if (!categoryRepository.existsById(id)) {
        throw new ResponseStatusException(HttpStatus.NOT_FOUND);
    }
    // Check for dependent transactions
    if (transactionRepository.existsByCategoryId(id)) {
        throw new ResponseStatusException(HttpStatus.CONFLICT,
            "Cannot delete category with existing transactions");
    }
    // Check for dependent recurring rules
    if (recurringRuleRepository.existsByCategoryId(id)) {
        throw new ResponseStatusException(HttpStatus.CONFLICT,
            "Cannot delete category with existing recurring rules");
    }
    // Check for dependent budgets
    if (budgetRepository.existsByCategoryId(id)) {
        throw new ResponseStatusException(HttpStatus.CONFLICT,
            "Cannot delete category with existing budgets");
    }
    categoryRepository.deleteById(id);
}
```

**Also add repository methods:**
- `TransactionRepository`: `boolean existsByCategoryId(Long categoryId);`
- `RecurringRuleRepository`: `boolean existsByCategoryId(Long categoryId);`
- `BudgetRepository`: `boolean existsByCategoryId(Long categoryId);`

**Verification:** Run `./mvnw compile` - should succeed.

---

### Task 9: Add Cascade Delete Protection for AccountController

**File:** `finance-backend/src/main/java/rooty/finance/financebackend/api/AccountController.java`

**Action:** Add TransactionRepository and RecurringRuleRepository to constructor, then modify delete method:

```java
@DeleteMapping("/{id}")
@ResponseStatus(HttpStatus.NO_CONTENT)
public void delete(@PathVariable Long id) {
    if (!accountRepository.existsById(id)) {
        throw new ResponseStatusException(HttpStatus.NOT_FOUND);
    }
    // Check for dependent transactions
    if (transactionRepository.existsByAccountId(id)) {
        throw new ResponseStatusException(HttpStatus.CONFLICT,
            "Cannot delete account with existing transactions");
    }
    // Check for dependent recurring rules
    if (recurringRuleRepository.existsByAccountId(id)) {
        throw new ResponseStatusException(HttpStatus.CONFLICT,
            "Cannot delete account with existing recurring rules");
    }
    accountRepository.deleteById(id);
}
```

**Also add repository methods:**
- `TransactionRepository`: `boolean existsByAccountId(Long accountId);`
- `RecurringRuleRepository`: `boolean existsByAccountId(Long accountId);`

**Verification:** Run `./mvnw compile` - should succeed.

---

### Task 10: Move H2 Console to Dev Profile Only

**Files:**
- `finance-backend/src/main/resources/application.properties`
- Create: `finance-backend/src/main/resources/application-dev.properties`

**Action in application.properties:**
```properties
# Change line 11-12 from:
spring.h2.console.enabled=true
spring.h2.console.path=/h2-console
# To:
spring.h2.console.enabled=false
```

**Create application-dev.properties:**
```properties
# Development-only settings
spring.h2.console.enabled=true
spring.h2.console.path=/h2-console
```

**Verification:** Run `./mvnw spring-boot:run` - H2 console should be disabled. Run with `-Dspring.profiles.active=dev` to enable.

---

## Phase 3: Performance

### Task 11: Fix N+1 Query in AnalyticsService.calculateBalanceUpTo()

**Files:**
- `finance-backend/src/main/java/rooty/finance/financebackend/domain/TransactionRepository.java`
- `finance-backend/src/main/java/rooty/finance/financebackend/domain/AccountRepository.java`
- `finance-backend/src/main/java/rooty/finance/financebackend/service/AnalyticsService.java`

**Action in TransactionRepository.java - add method:**
```java
@Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t WHERE t.date <= :date")
BigDecimal sumAmountsUpToDate(@Param("date") LocalDate date);
```

**Action in AccountRepository.java - add method:**
```java
@Query("SELECT COALESCE(SUM(a.initialBalance), 0) FROM Account a")
BigDecimal sumInitialBalances();
```

**Action in AnalyticsService.java - replace calculateBalanceUpTo method (lines 209-222):**
```java
private BigDecimal calculateBalanceUpTo(LocalDate dateInclusive) {
    BigDecimal starting = accountRepository.sumInitialBalances();
    BigDecimal movements = transactionRepository.sumAmountsUpToDate(dateInclusive);
    return starting.add(movements);
}
```

**Verification:** Run `./mvnw test` - all tests should pass.

---

### Task 12: Remove Synchronous Auto-Post from GET Endpoints

**Files:**
- `finance-backend/src/main/java/rooty/finance/financebackend/api/TransactionController.java`
- `finance-backend/src/main/java/rooty/finance/financebackend/api/RecurringRuleController.java`
- `finance-backend/src/main/java/rooty/finance/financebackend/service/AnalyticsService.java`

**Action:** Remove `autoPostService.autoPostDueTransactions();` calls from GET handlers:

TransactionController.java line 35 - REMOVE
RecurringRuleController.java line 48 - REMOVE
AnalyticsService.java lines 47, 79, 105, 116 - REMOVE all 4 calls

The scheduled job already handles this at startup and daily at 3:05 AM.

**Verification:** Run `./mvnw compile` - should succeed.

---

## Phase 4: Documentation Updates

### Task 13: Update CLAUDE.md with SchemaUpdater

**File:** `/mnt/c/P/Java/CLAUDE.md`

**Action:** Update line 44 to include SchemaUpdater:
```markdown
- **config/**: CORS, DataInitializer (seeds defaults at startup), SchedulingConfig, RecurringRuleMigration, SchemaUpdater (schema migrations)
```

---

### Task 14: Fix RecurringRuleMigration Documentation

**File:** `/mnt/c/P/Java/finance-backend/architecture.md`

**Action:** Update the description to match actual behavior:
```markdown
// Change from:
"Startup migration that resets `nextOccurrence` to `startDate` for rules needing catch-up"
// To:
"One-time idempotent migration that initializes `nextOccurrence` to `startDate` for existing rules lacking this field"
```

---

### Task 15: Commit Untracked Documentation Files

**Action:** Stage and commit CLAUDE.md, AGENTS.md, and package-lock.json:

```bash
cd /mnt/c/P/Java
git add CLAUDE.md AGENTS.md finance-desktop/package-lock.json
git commit -m "docs: add project documentation files

- CLAUDE.md: Project coding guidelines and architecture
- AGENTS.md: Contributor guidelines
- package-lock.json: Lock frontend dependencies for reproducible builds

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Execution Order

**Parallelizable groups:**

Group A (Backend wildcard imports): Task 1
Group B (Frontend state fixes): Tasks 2, 3, 4, 5, 6
Group C (Backend quick fixes): Task 7

After Group A-C complete:
Group D (Data integrity): Tasks 8, 9, 10

After Group D:
Group E (Performance): Tasks 11, 12

After Group E:
Group F (Documentation): Tasks 13, 14, 15

---

## Final Verification

After all tasks complete:

1. Backend: `cd finance-backend && ./mvnw clean test`
2. Frontend: `cd finance-desktop && npm run lint && npm run build`
3. Full build: `bash build-all.sh`

All should pass without errors.
