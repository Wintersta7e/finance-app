import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../api/client';
import type {
  Account,
  BudgetVsActual,
  Category,
  CategoryAmount,
  MonthSummary,
  Transaction,
} from '../api/types';
import { OrbitalRing } from '../components/OrbitalRing';
import { SparkBars } from '../components/SparkBars';
import { MetricStrip } from '../components/MetricStrip';
import { SidePanel } from '../components/SidePanel';
import { EmptyState } from '../components/EmptyState';
import { useIsMounted } from '../hooks/useIsMounted';

/* ─── constants ─────────────────────────────────────────────────────── */

const TRANSACTION_TYPE_BORDER: Record<Transaction['type'], string> = {
  INCOME: 'border-neon-green',
  FIXED_COST: 'border-neon-rose',
  VARIABLE_EXPENSE: 'border-neon-orange',
  TRANSFER: 'border-neon-cyan',
};

const TRANSACTION_TYPE_TEXT: Record<Transaction['type'], string> = {
  INCOME: 'text-neon-green',
  FIXED_COST: 'text-neon-rose',
  VARIABLE_EXPENSE: 'text-neon-orange',
  TRANSFER: 'text-neon-cyan',
};

const CATEGORY_COLORS = [
  'var(--color-neon-green)',
  'var(--color-neon-indigo)',
  'var(--color-neon-amber)',
  'var(--color-neon-rose)',
  'var(--color-neon-cyan)',
  'var(--color-neon-orange)',
  'var(--color-neon-red)',
];

const MONTHS_BACK = 6;
const RECENT_TX_LIMIT = 10;

type TransactionType = Transaction['type'];

interface QuickAddForm {
  amount: string;
  type: TransactionType;
  categoryId: string;
  accountId: string;
  date: string;
  notes: string;
}

const INITIAL_FORM: QuickAddForm = {
  amount: '',
  type: 'VARIABLE_EXPENSE',
  categoryId: '',
  accountId: '',
  date: new Date().toISOString().slice(0, 10),
  notes: '',
};

/* ─── helpers ───────────────────────────────────────────────────────── */

function fmt(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function relativeDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffMs = today.getTime() - target.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    const hours = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60));
    if (hours < 1) return 'Just now';
    return `${hours}h ago`;
  }
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function groupByDate(txs: Transaction[]): [string, Transaction[]][] {
  const map = new Map<string, Transaction[]>();
  for (const tx of txs) {
    const key = tx.date.slice(0, 10);
    const arr = map.get(key);
    if (arr) arr.push(tx);
    else map.set(key, [tx]);
  }
  return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/* ─── types ─────────────────────────────────────────────────────────── */

interface DashboardPageProps {
  analyticsRefreshToken: number;
  onDataChanged: () => void;
  onNavigate?: (page: string) => void;
}

interface DashboardData {
  summary: MonthSummary;
  history: MonthSummary[];
  breakdown: CategoryAmount[];
  budgets: BudgetVsActual[];
  transactions: Transaction[];
  netWorth: number;
}

/* ─── component ─────────────────────────────────────────────────────── */

export function DashboardPage({ analyticsRefreshToken, onDataChanged, onNavigate }: DashboardPageProps) {
  const isMounted = useIsMounted();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Side panel
  const [panelOpen, setPanelOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [form, setForm] = useState<QuickAddForm>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // CR-29: clear successTimer on unmount
  useEffect(() => { return () => { if (successTimer.current) clearTimeout(successTimer.current); }; }, []);

  /* ── data loading ────────────────────────────────────────────────── */

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;

      // Build 6 months of history requests
      const historyRequests: Promise<MonthSummary>[] = [];
      for (let i = MONTHS_BACK - 1; i >= 0; i--) {
        const d = new Date(year, month - 1 - i, 1);
        historyRequests.push(api.getMonthSummary(d.getFullYear(), d.getMonth() + 1));
      }

      // Transaction date range: beginning of month to now
      const monthStart = isoDate(new Date(year, month - 1, 1));
      const today = isoDate(now);

      // Fetch everything in parallel
      const [summaryResult, breakdownResult, budgetsResult, txResult, netWorthResult, ...historyResults] =
        await Promise.all([
          api.getMonthSummary(year, month),
          api.getCategoryBreakdown(year, month),
          api.getBudgetVsActual(year, month),
          api.getTransactions(monthStart, today, RECENT_TX_LIMIT, 1),
          api.getNetWorthTrend(
            isoDate(new Date(year, month - 1, 1)),
            today,
          ),
          ...historyRequests,
        ]);

      if (!isMounted()) return;

      const latestNetWorth =
        netWorthResult.length > 0
          ? netWorthResult[netWorthResult.length - 1].balance
          : summaryResult.endBalance;

      setData({
        summary: summaryResult,
        history: historyResults,
        breakdown: breakdownResult,
        budgets: budgetsResult,
        transactions: txResult.data,
        netWorth: latestNetWorth,
      });
    } catch (err) {
      if (!isMounted()) return;
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      if (isMounted()) setLoading(false);
    }
  }, [isMounted]);

  useEffect(() => {
    void load();
  }, [analyticsRefreshToken, load]);

  /* ── panel helpers ───────────────────────────────────────────────── */

  const openPanel = useCallback(() => {
    setForm({ ...INITIAL_FORM, date: new Date().toISOString().slice(0, 10) });
    setSaveError(null);
    setSuccessMsg(null);
    setPanelOpen(true);

    // Fetch categories + accounts for dropdowns
    void Promise.all([api.getCategories(), api.getAccounts()]).then(([cats, accts]) => {
      if (!isMounted()) return;
      setCategories(cats);
      setAccounts(accts.filter((a) => !a.archived));
    });
  }, [isMounted]);

  const closePanel = useCallback(() => {
    setPanelOpen(false);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSaveError(null);

      const amount = parseFloat(form.amount);
      if (isNaN(amount) || amount <= 0) {
        setSaveError('Enter a valid amount');
        return;
      }
      if (!form.accountId) {
        setSaveError('Select an account');
        return;
      }

      setSaving(true);
      try {
        await api.createTransaction({
          amount,
          type: form.type,
          categoryId: form.categoryId ? Number(form.categoryId) : null,
          accountId: Number(form.accountId),
          date: form.date,
          notes: form.notes || null,
          payeeId: null,
          recurringRuleId: null,
        });

        onDataChanged();
        closePanel();

        setSuccessMsg('Transaction added');
        if (successTimer.current) clearTimeout(successTimer.current);
        successTimer.current = setTimeout(() => setSuccessMsg(null), 2500);
      } catch (err) {
        if (!isMounted()) return;
        setSaveError(err instanceof Error ? err.message : 'Failed to create transaction');
      } finally {
        if (isMounted()) setSaving(false);
      }
    },
    [form, onDataChanged, closePanel, isMounted],
  );

  /* ── derived values ──────────────────────────────────────────────── */

  const budgetHealth = data
    ? (() => {
        const totalBudgeted = data.budgets.reduce((s, b) => s + b.budgeted, 0);
        const totalActual = data.budgets.reduce((s, b) => s + b.actual, 0);
        if (totalBudgeted === 0) return 0;
        return Math.min(totalActual / totalBudgeted, 1);
      })()
    : 0;

  const incomeHistory = data ? data.history.map((h) => h.totalIncome) : [];
  const spendHistory = data ? data.history.map((h) => h.fixedCosts + h.variableExpenses) : [];
  const totalSpent = data ? data.summary.fixedCosts + data.summary.variableExpenses : 0;
  const breakdownTotal = data ? data.breakdown.reduce((s, c) => s + c.amount, 0) : 0;
  const sortedBreakdown = useMemo(
    () => data?.breakdown.filter((c) => c.amount > 0).sort((a, b) => b.amount - a.amount) ?? [],
    [data?.breakdown],
  );

  /* ── render ──────────────────────────────────────────────────────── */

  if (error) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center">
          <p className="text-sm text-neon-red">{error}</p>
          <button
            onClick={() => void load()}
            className="mt-4 rounded-md border border-neon-border-active bg-neon-elevated
                       px-4 py-1.5 text-xs text-neon-text-secondary hover:text-neon-text
                       transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative space-y-8">
      {/* Success toast */}
      {successMsg && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="fixed right-6 top-16 z-50 rounded-md border border-neon-green/20
                     bg-neon-surface px-4 py-2 text-xs font-medium text-neon-green
                     shadow-glow-green-sm"
        >
          {successMsg}
        </motion.div>
      )}

      {/* ── Hero: Net Worth + Orbital Budget Ring ─────────────────── */}
      {loading ? (
        <div className="flex items-start gap-6 py-4">
          <div className="h-10 w-48 animate-pulse rounded bg-neon-elevated" />
          <div className="h-14 w-14 animate-pulse rounded-full bg-neon-elevated" />
        </div>
      ) : data && (
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[9px] uppercase tracking-[2px] text-neon-text-muted mb-1.5">
              Net Worth
            </div>
            <motion.div
              className="text-3xl font-extrabold tracking-tight text-neon-text"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              {fmt(data.netWorth)}
            </motion.div>
            <div className="mt-1 text-xs text-neon-text-muted">
              {data.summary.savings >= 0 ? '+' : ''}{fmt(data.summary.savings)} this month
            </div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <OrbitalRing
              value={budgetHealth}
              size={64}
              color={budgetHealth > 0.9 ? 'var(--color-neon-red)' : 'var(--color-neon-green)'}
              strokeWidth={3}
              label={`${Math.round(budgetHealth * 100)}%`}
            />
            <span className="text-[8px] uppercase tracking-[1.5px] text-neon-text-faint">
              Budget
            </span>
          </div>
        </div>
      )}

      {/* ── MetricStrip Row ───────────────────────────────────────── */}
      {loading ? (
        <div className="flex gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 flex-1 animate-pulse rounded bg-neon-elevated" />
          ))}
        </div>
      ) : data && (
        <div className="flex gap-3">
          <MetricStrip
            label="Income"
            value={fmt(data.summary.totalIncome)}
            color="var(--color-neon-green)"
          />
          <MetricStrip
            label="Spent"
            value={fmt(totalSpent)}
            color="var(--color-neon-indigo)"
          />
          <MetricStrip
            label="Saved"
            value={fmt(data.summary.savings)}
            color="var(--color-neon-amber)"
          />
        </div>
      )}

      {/* ── SparkBars: 6-month trends ─────────────────────────────── */}
      {loading ? (
        <div className="flex gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="h-10 flex-1 animate-pulse rounded bg-neon-elevated" />
          ))}
        </div>
      ) : data && (
        <div className="flex gap-6">
          <div className="flex-1">
            <div className="text-[9px] uppercase tracking-[2px] text-neon-text-muted mb-1.5">
              Income — 6 mo
            </div>
            <SparkBars data={incomeHistory} color="var(--color-neon-green)" height={32} />
          </div>
          <div className="flex-1">
            <div className="text-[9px] uppercase tracking-[2px] text-neon-text-muted mb-1.5">
              Spending — 6 mo
            </div>
            <SparkBars data={spendHistory} color="var(--color-neon-indigo)" height={32} />
          </div>
        </div>
      )}

      {/* ── Category Breakdown Bar ────────────────────────────────── */}
      {loading ? (
        <div className="h-6 animate-pulse rounded bg-neon-elevated" />
      ) : data && data.breakdown.length > 0 && (
        <div>
          <div className="text-[9px] uppercase tracking-[2px] text-neon-text-muted mb-2">
            Category Breakdown
          </div>
          <div className="flex h-5 overflow-hidden rounded-sm">
            {sortedBreakdown.map((cat, i) => {
                const pct = breakdownTotal > 0 ? (cat.amount / breakdownTotal) * 100 : 0;
                const color = CATEGORY_COLORS[i % CATEGORY_COLORS.length];
                return (
                  <motion.div
                    key={cat.categoryId}
                    className="relative h-full group"
                    style={{
                      width: `${pct}%`,
                      background: color,
                      boxShadow: `0 0 8px ${color}`,
                      opacity: 0.7 + (i === 0 ? 0.3 : 0),
                    }}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.5, delay: i * 0.05 }}
                    title={`${cat.categoryName}: ${fmt(cat.amount)}`}
                  >
                    {/* Tooltip on hover */}
                    <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2
                                    whitespace-nowrap rounded bg-neon-surface px-2 py-0.5
                                    text-[10px] text-neon-text opacity-0
                                    group-hover:opacity-100 transition-opacity
                                    border border-neon-border">
                      {cat.categoryName} {fmt(cat.amount)}
                    </div>
                  </motion.div>
                );
              })}
          </div>
          {/* Legend */}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {sortedBreakdown.slice(0, 6).map((cat, i) => (
                <div key={cat.categoryId} className="flex items-center gap-1.5">
                  <div
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
                  />
                  <span className="text-[10px] text-neon-text-secondary">{cat.categoryName}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ── Recent Transaction Stream ─────────────────────────────── */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-8 animate-pulse rounded bg-neon-elevated" />
          ))}
        </div>
      ) : data && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-[9px] uppercase tracking-[2px] text-neon-text-muted">
              Recent Transactions
            </div>
            <button
              onClick={() => onNavigate?.('transactions')}
              className="text-[10px] text-neon-text-muted hover:text-neon-green transition-colors"
            >
              View all &rarr;
            </button>
          </div>

          {data.transactions.length === 0 ? (
            <EmptyState
              message="No transactions this month"
              actionLabel="Add one"
              onAction={openPanel}
            />
          ) : (
            <div className="space-y-3">
              {groupByDate(data.transactions).map(([dateKey, txs]) => (
                <div key={dateKey}>
                  <div className="text-[10px] text-neon-text-faint mb-1">
                    {relativeDate(dateKey)}
                  </div>
                  <div className="space-y-px">
                    {txs.map((tx) => (
                      <motion.div
                        key={tx.id}
                        className={`flex items-center justify-between py-1.5 pl-3 pr-1
                                    border-l-[3px] ${TRANSACTION_TYPE_BORDER[tx.type]}
                                    bg-neon-elevated/40 hover:bg-neon-elevated transition-colors`}
                        initial={{ opacity: 0, x: -4 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs text-neon-text-secondary truncate">
                            {tx.notes || tx.type.replace('_', ' ').toLowerCase()}
                          </span>
                        </div>
                        <span className={`text-xs font-semibold whitespace-nowrap ${TRANSACTION_TYPE_TEXT[tx.type]}`}>
                          {tx.type === 'INCOME' ? '+' : '-'}{fmt(tx.amount)}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── FAB: Quick Add ────────────────────────────────────────── */}
      <button
        onClick={openPanel}
        className="fixed bottom-6 right-6 z-30 flex h-11 w-11 items-center justify-center
                   rounded-full bg-neon-green/10 border border-neon-green/20
                   text-neon-green text-lg font-bold shadow-glow-green-sm
                   hover:bg-neon-green/20 hover:shadow-glow-green
                   transition-all duration-200"
        aria-label="Quick add transaction"
      >
        +
      </button>

      {/* ── Side Panel: Create Transaction ────────────────────────── */}
      <SidePanel open={panelOpen} onClose={closePanel}>
        <div className="text-[9px] uppercase tracking-[2px] text-neon-text-muted mb-4">
          New Transaction
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          {/* Amount */}
          <div>
            <label className="text-[10px] uppercase tracking-[1px] text-neon-text-muted block mb-1">
              Amount
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={form.amount}
              onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
              className="w-full"
              autoFocus
            />
          </div>

          {/* Type */}
          <div>
            <label className="text-[10px] uppercase tracking-[1px] text-neon-text-muted block mb-1">
              Type
            </label>
            <select
              value={form.type}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, type: e.target.value as TransactionType }))
              }
              className="w-full"
            >
              <option value="INCOME">Income</option>
              <option value="FIXED_COST">Fixed Cost</option>
              <option value="VARIABLE_EXPENSE">Variable Expense</option>
              <option value="TRANSFER">Transfer</option>
            </select>
          </div>

          {/* Account */}
          <div>
            <label className="text-[10px] uppercase tracking-[1px] text-neon-text-muted block mb-1">
              Account
            </label>
            <select
              value={form.accountId}
              onChange={(e) => setForm((prev) => ({ ...prev, accountId: e.target.value }))}
              className="w-full"
            >
              <option value="">Select account...</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="text-[10px] uppercase tracking-[1px] text-neon-text-muted block mb-1">
              Category
            </label>
            <select
              value={form.categoryId}
              onChange={(e) => setForm((prev) => ({ ...prev, categoryId: e.target.value }))}
              className="w-full"
            >
              <option value="">None</option>
              {categories
                .filter((c) => {
                  if (form.type === 'INCOME') return c.kind === 'INCOME';
                  if (form.type === 'TRANSFER') return true;
                  return c.kind === 'EXPENSE';
                })
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="text-[10px] uppercase tracking-[1px] text-neon-text-muted block mb-1">
              Date
            </label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
              className="w-full"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-[10px] uppercase tracking-[1px] text-neon-text-muted block mb-1">
              Notes
            </label>
            <input
              type="text"
              placeholder="Optional"
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              className="w-full"
            />
          </div>

          {saveError && (
            <p className="text-xs text-neon-red">{saveError}</p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-md bg-neon-green/10 border border-neon-green/20
                       px-4 py-2 text-sm font-medium text-neon-green
                       hover:bg-neon-green/20 transition-colors
                       disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Add Transaction'}
          </button>
        </form>
      </SidePanel>
    </div>
  );
}
