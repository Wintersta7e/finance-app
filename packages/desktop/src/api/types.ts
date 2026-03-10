export interface Account {
  id: number;
  name: string;
  type: string;
  initialBalance: number;
  archived: boolean;
}

export interface Category {
  id: number;
  name: string;
  kind: 'INCOME' | 'EXPENSE';
  fixedCost: boolean;
}

export type RecurringPeriod = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export interface Transaction {
  id: number;
  date: string;
  amount: number;
  type: 'INCOME' | 'FIXED_COST' | 'VARIABLE_EXPENSE' | 'TRANSFER';
  accountId: number;
  categoryId: number | null;
  payeeId: number | null;
  notes: string | null;
  recurringRuleId: number | null;
}

export interface RecurringRule {
  id: number;
  accountId: number;
  categoryId: number | null;
  amount: number;
  direction: 'INCOME' | 'EXPENSE';
  period: RecurringPeriod;
  startDate: string;
  endDate: string | null;
  autoPost: boolean;
  note: string | null;
  nextOccurrence: string | null;
}

export interface AppSettings {
  id: number;
  currencyCode: string;
  firstDayOfMonth: number;
  firstDayOfWeek: number;
}

export interface MonthSummary {
  totalIncome: number;
  fixedCosts: number;
  variableExpenses: number;
  savings: number;
  endBalance: number;
}

export interface CategoryAmount {
  categoryId: number;
  categoryName: string;
  amount: number;
}

export interface NetWorthPoint {
  date: string;
  balance: number;
}

export interface Budget {
  id: number;
  categoryId: number;
  amount: number;
  period: string;
  effectiveFrom: string;
  effectiveTo: string | null;
}

export interface BudgetVsActual {
  categoryId: number;
  categoryName: string;
  budgeted: number;
  actual: number;
}

export interface RecurringCosts {
  monthlyTotal: number;
}

export interface Tag {
  id: number;
  name: string;
  color: string | null;
}

export interface Payee {
  id: number;
  name: string;
  notes: string | null;
}

export interface Goal {
  id: number;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string | null;
  color: string | null;
}

export interface AuditEntry {
  id: number;
  entityType: string;
  entityId: number;
  action: string;
  changes: string | null;
  timestamp: string;
}

export interface ImportResult {
  imported: {
    accounts: number;
    categories: number;
    transactions: number;
    recurringRules: number;
    budgets: number;
    tags: number;
    payees: number;
    goals: number;
  };
}
