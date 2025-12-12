import { API_BASE_URL } from './config';
import type {
  Account,
  Transaction,
  MonthSummary,
  CategoryAmount,
  NetWorthPoint,
  AppSettings,
  RecurringRule,
  Category,
  Budget,
  BudgetVsActual,
} from './types';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  const text = await res.text().catch(() => '');

  if (!res.ok) {
    throw new Error(`API ${res.status} ${res.statusText}: ${text}`);
  }

  // Many endpoints return 204/empty bodies; avoid JSON parsing failures.
  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}

export const api = {
  getAccounts(): Promise<Account[]> {
    return request<Account[]>('/accounts');
  },

  createAccount(payload: Omit<Account, 'id' | 'archived'>): Promise<Account> {
    return request<Account>('/accounts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getCategories(): Promise<Category[]> {
    return request<Category[]>('/categories');
  },

  createCategory(payload: Omit<Category, 'id'>): Promise<Category> {
    return request<Category>('/categories', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateCategory(id: number, payload: Omit<Category, 'id'>): Promise<Category> {
    return request<Category>(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  deleteCategory(id: number): Promise<void> {
    return request<void>(`/categories/${id}`, {
      method: 'DELETE',
    });
  },

  getTransactions(from: string, to: string): Promise<Transaction[]> {
    const params = new URLSearchParams({ from, to });
    return request<Transaction[]>(`/transactions?${params.toString()}`);
  },

  createTransaction(payload: Omit<Transaction, 'id'>): Promise<Transaction> {
    return request<Transaction>('/transactions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getSettings(): Promise<AppSettings> {
    return request<AppSettings>('/settings');
  },

  getMonthSummary(year: number, month: number): Promise<MonthSummary> {
    const params = new URLSearchParams({ year: String(year), month: String(month) });
    return request<MonthSummary>(`/analytics/month-summary?${params.toString()}`);
  },

  getCategoryBreakdown(year: number, month: number): Promise<CategoryAmount[]> {
    const params = new URLSearchParams({ year: String(year), month: String(month) });
    return request<CategoryAmount[]>(`/analytics/category-breakdown?${params.toString()}`);
  },

  getNetWorthTrend(from: string, to: string): Promise<NetWorthPoint[]> {
    const params = new URLSearchParams({ from, to });
    return request<NetWorthPoint[]>(`/analytics/net-worth-trend?${params.toString()}`);
  },

  getRecurringRules() {
    return request<RecurringRule[]>('/recurring-rules');
  },

  createRecurringRule(payload: Omit<RecurringRule, 'id'>) {
    return request<RecurringRule>('/recurring-rules', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateRecurringRule(id: number, payload: Omit<RecurringRule, 'id'>) {
    return request<RecurringRule>(`/recurring-rules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  deleteRecurringRule(id: number) {
    return request<void>(`/recurring-rules/${id}`, {
      method: 'DELETE',
    });
  },

  generateNextRecurringRule(id: number) {
    return request<void>(`/recurring-rules/${id}/generate-next`, {
      method: 'POST',
    });
  },

  getBudgets() {
    return request<Budget[]>('/budgets');
  },

  createBudget(payload: Omit<Budget, 'id'>) {
    return request<Budget>('/budgets', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateBudget(id: number, payload: Omit<Budget, 'id'>) {
    return request<Budget>(`/budgets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  deleteBudget(id: number) {
    return request<void>(`/budgets/${id}`, {
      method: 'DELETE',
    });
  },

  deleteTransaction(id: number) {
    return request<void>(`/transactions/${id}`, {
      method: 'DELETE',
    });
  },

  getBudgetVsActual(year: number, month: number) {
    const params = new URLSearchParams({ year: String(year), month: String(month) });
    return request<BudgetVsActual[]>(`/analytics/budget-vs-actual?${params.toString()}`);
  },

  getRecurringCosts() {
    return request<import('./types').RecurringCosts>('/analytics/recurring-costs');
  },
};
