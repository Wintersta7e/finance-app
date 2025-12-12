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
  type: 'INCOME' | 'EXPENSE' | 'FIXED_COST' | 'VARIABLE_EXPENSE' | 'TRANSFER';
  accountId: number;
  categoryId: number | null;
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
  endOfMonthBalance: number;
}

export interface CategoryAmount {
  categoryId: number;
  categoryName: string;
  amount: number;
}

export interface NetWorthPoint {
  date: string;
  value: number;
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
  budgetAmount: number;
  actualAmount: number;
}

export interface RecurringCosts {
  monthlyTotal: number;
}
