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
  Tag,
  Payee,
  Goal,
  AuditEntry,
  ImportResult,
} from './types';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  for (let attempt = 0; attempt <= 1; attempt++) {
    try {
      const res = await fetch(`${API_BASE_URL}${path}`, {
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
        ...options,
      });
      const text = await res.text().catch(() => '');
      if (!res.ok) throw new Error(`API ${res.status} ${res.statusText}: ${text}`);
      if (!text) return undefined as T;
      return JSON.parse(text) as T;
    } catch (err) {
      const e = err as Error;
      const isNetwork = e.message === 'Failed to fetch' || e.message.includes('NetworkError');
      if (!isNetwork || attempt === 1) throw e;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw new Error('Request failed');
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

  updateAccount(id: number, payload: Partial<Omit<Account, 'id'>>) {
    return request<Account>(`/accounts/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  },

  deleteAccount(id: number) {
    return request<void>(`/accounts/${id}`, { method: 'DELETE' });
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

  async getTransactions(from: string, to: string, limit = 100, page = 1): Promise<{ data: Transaction[]; total: number }> {
    const params = new URLSearchParams({ startDate: from, endDate: to, limit: String(limit), page: String(page) });
    return request<{ data: Transaction[]; total: number }>(`/transactions?${params.toString()}`);
  },

  createTransaction(payload: Omit<Transaction, 'id'>): Promise<Transaction> {
    return request<Transaction>('/transactions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateTransaction(id: number, payload: Partial<Omit<Transaction, 'id'>>) {
    return request<Transaction>(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  },

  getSettings(): Promise<AppSettings> {
    return request<AppSettings>('/settings');
  },

  updateSettings(payload: Partial<Omit<AppSettings, 'id'>>) {
    return request<AppSettings>('/settings', { method: 'PUT', body: JSON.stringify(payload) });
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

  createRecurringRule(payload: Omit<RecurringRule, 'id' | 'nextOccurrence'>) {
    return request<RecurringRule>('/recurring-rules', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateRecurringRule(id: number, payload: Omit<RecurringRule, 'id' | 'nextOccurrence'>) {
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

  // Tags
  getTags() {
    return request<Tag[]>('/tags');
  },
  createTag(payload: Omit<Tag, 'id'>) {
    return request<Tag>('/tags', { method: 'POST', body: JSON.stringify(payload) });
  },
  updateTag(id: number, payload: Omit<Tag, 'id'>) {
    return request<Tag>(`/tags/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  },
  deleteTag(id: number) {
    return request<void>(`/tags/${id}`, { method: 'DELETE' });
  },

  // Payees
  getPayees() {
    return request<Payee[]>('/payees');
  },
  createPayee(payload: Omit<Payee, 'id'>) {
    return request<Payee>('/payees', { method: 'POST', body: JSON.stringify(payload) });
  },
  updatePayee(id: number, payload: Omit<Payee, 'id'>) {
    return request<Payee>(`/payees/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  },
  deletePayee(id: number) {
    return request<void>(`/payees/${id}`, { method: 'DELETE' });
  },

  // Goals
  getGoals() {
    return request<Goal[]>('/goals');
  },
  createGoal(payload: Omit<Goal, 'id' | 'currentAmount'>) {
    return request<Goal>('/goals', { method: 'POST', body: JSON.stringify(payload) });
  },
  updateGoal(id: number, payload: Partial<Omit<Goal, 'id'>>) {
    return request<Goal>(`/goals/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  },
  deleteGoal(id: number) {
    return request<void>(`/goals/${id}`, { method: 'DELETE' });
  },
  contributeToGoal(id: number, amount: number) {
    return request<Goal>(`/goals/${id}/contribute`, { method: 'POST', body: JSON.stringify({ amount }) });
  },

  // Export / Import
  async exportJson(): Promise<Blob> {
    const res = await fetch(`${API_BASE_URL}/export/json`);
    if (!res.ok) throw new Error(`Export failed: ${res.status}`);
    return res.blob();
  },
  async exportCsv(): Promise<Blob> {
    const res = await fetch(`${API_BASE_URL}/export/csv/transactions`);
    if (!res.ok) throw new Error(`CSV export failed: ${res.status}`);
    return res.blob();
  },
  async importJson(file: File, mode: 'replace' | 'merge' = 'replace'): Promise<ImportResult> {
    if (file.size > 50 * 1024 * 1024) {
      throw new Error('Import file is too large (max 50 MB)');
    }
    const text = await file.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error('File is not valid JSON. Please select a valid export file.');
    }
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      throw new Error('Import file has an unexpected format');
    }
    const params = new URLSearchParams({ mode });
    return request<ImportResult>(`/import/json?${params}`, {
      method: 'POST',
      body: text,
    });
  },

  // Audit
  getRecentAudit(limit = 50) {
    const params = new URLSearchParams({ limit: String(limit) });
    return request<AuditEntry[]>(`/audit/recent?${params}`);
  },
  getEntityHistory(entityType: string, entityId: number) {
    return request<AuditEntry[]>(`/audit/${encodeURIComponent(entityType)}/${entityId}`);
  },

  async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}/health`);
      return res.ok;
    } catch {
      return false;
    }
  },
};
