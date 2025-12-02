import { API_BASE_URL } from './config';
import type {
  Account,
  Transaction,
  MonthSummary,
  CategoryAmount,
  NetWorthPoint,
  AppSettings,
} from './types';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${res.status} ${res.statusText}: ${text}`);
  }

  return res.json() as Promise<T>;
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
};
