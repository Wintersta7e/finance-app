import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/client';
import type { Account, Category, Payee, RecurringRule, Transaction } from '../api/types';
import { SidePanel } from '../components/SidePanel';
import { InsightBlock } from '../components/InsightBlock';
import { PillChip } from '../components/PillChip';
import { EmptyState } from '../components/EmptyState';
import { DateGroupedList } from '../components/DateGroupedList';
import { useIsMounted } from '../hooks/useIsMounted';

/* ─── Constants ───────────────────────────────────────────────────────── */

type TxType = Transaction['type'];
type FilterType = TxType | 'ALL';

const TYPE_COLORS: Record<TxType, string> = {
  INCOME: 'var(--color-neon-green)',
  FIXED_COST: 'var(--color-neon-rose)',
  VARIABLE_EXPENSE: 'var(--color-neon-orange)',
  TRANSFER: 'var(--color-neon-cyan)',
};

const TYPE_TW: Record<TxType, string> = {
  INCOME: 'text-neon-green',
  FIXED_COST: 'text-neon-rose',
  VARIABLE_EXPENSE: 'text-neon-orange',
  TRANSFER: 'text-neon-cyan',
};

const TYPE_BORDER_TW: Record<TxType, string> = {
  INCOME: 'border-l-neon-green',
  FIXED_COST: 'border-l-neon-rose',
  VARIABLE_EXPENSE: 'border-l-neon-orange',
  TRANSFER: 'border-l-neon-cyan',
};

const TYPE_LABELS: Record<TxType, string> = {
  INCOME: 'Income',
  FIXED_COST: 'Fixed',
  VARIABLE_EXPENSE: 'Variable',
  TRANSFER: 'Transfer',
};

const FILTER_OPTIONS: { key: FilterType; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'INCOME', label: 'Income' },
  { key: 'FIXED_COST', label: 'Fixed' },
  { key: 'VARIABLE_EXPENSE', label: 'Variable' },
  { key: 'TRANSFER', label: 'Transfer' },
];

const PERIOD_YEARLY_MULTIPLIER: Record<string, number> = {
  DAILY: 365,
  WEEKLY: 52,
  MONTHLY: 12,
  YEARLY: 1,
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const PAGE_SIZE = 50;

/* ─── Helpers ─────────────────────────────────────────────────────────── */

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function monthRange(year: number, month: number): { from: string; to: string } {
  const from = new Date(year, month, 1);
  const to = new Date(year, month + 1, 0);
  return { from: isoDate(from), to: isoDate(to) };
}

function formatAmount(amount: number): string {
  return Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function relativeTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.floor((today.getTime() - target.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return `${diff}d ago`;
  return target.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface TransactionForm {
  notes: string;
  amount: string;
  date: string;
  type: TxType;
  categoryId: string;
  accountId: string;
  payeeId: string;
}

const EMPTY_FORM: TransactionForm = {
  notes: '',
  amount: '',
  date: isoDate(new Date()),
  type: 'VARIABLE_EXPENSE',
  categoryId: '',
  accountId: '',
  payeeId: '',
};

/* ─── Component ───────────────────────────────────────────────────────── */

interface TransactionsPageProps {
  onDataChanged: () => void;
}

export function TransactionsPage({ onDataChanged }: TransactionsPageProps) {
  const isMounted = useIsMounted();

  /* ── Reference data ── */
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [payees, setPayees] = useState<Payee[]>([]);
  const [recurringRules, setRecurringRules] = useState<RecurringRule[]>([]);

  /* ── Transaction data ── */
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  /* ── Month navigation ── */
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());

  /* ── Filters ── */
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<FilterType>('ALL');

  /* ── Side panel ── */
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<TransactionForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const panelOpen = selected !== null || creating;

  /* ── Lookup maps ── */
  const categoryMap = useMemo(() => {
    const m = new Map<number, Category>();
    for (const c of categories) m.set(c.id, c);
    return m;
  }, [categories]);

  const accountMap = useMemo(() => {
    const m = new Map<number, Account>();
    for (const a of accounts) m.set(a.id, a);
    return m;
  }, [accounts]);

  const payeeMap = useMemo(() => {
    const m = new Map<number, Payee>();
    for (const p of payees) m.set(p.id, p);
    return m;
  }, [payees]);

  const ruleMap = useMemo(() => {
    const m = new Map<number, RecurringRule>();
    for (const r of recurringRules) m.set(r.id, r);
    return m;
  }, [recurringRules]);

  /* ── Load reference data ── */
  const [refDataToken, setRefDataToken] = useState(0);
  useEffect(() => {
    void (async () => {
      try {
        const [accts, cats, pays, rules] = await Promise.all([
          api.getAccounts(),
          api.getCategories(),
          api.getPayees(),
          api.getRecurringRules(),
        ]);
        if (!isMounted()) return;
        setAccounts(accts);
        setCategories(cats);
        setPayees(pays);
        setRecurringRules(rules);
      } catch {
        // Reference data load failure is non-fatal; transactions still load
      }
    })();
  }, [refDataToken, isMounted]);

  /* ── Load transactions ── */
  const loadingRef = useRef(false);
  const loadTransactions = useCallback(
    (pageNum: number) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      setLoading(true);
      const { from, to } = monthRange(viewYear, viewMonth);
      void api
        .getTransactions(from, to, PAGE_SIZE, pageNum)
        .then((result) => {
          if (!isMounted()) return;
          if (pageNum === 1) {
            setTransactions(result.data);
          } else {
            setTransactions((prev) => [...prev, ...result.data]);
          }
          setTotal(result.total);
        })
        .finally(() => {
          loadingRef.current = false;
          if (isMounted()) setLoading(false);
        });
    },
    [viewYear, viewMonth, isMounted],
  );

  useEffect(() => {
    setPage(1);
    loadTransactions(1);
  }, [loadTransactions]);

  /* ── Filtered transactions ── */
  const filtered = useMemo(() => {
    let list = transactions;
    if (typeFilter !== 'ALL') {
      list = list.filter((t) => t.type === typeFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter((t) => {
        const note = t.notes?.toLowerCase() ?? '';
        const cat = t.categoryId ? (categoryMap.get(t.categoryId)?.name.toLowerCase() ?? '') : '';
        const payee = t.payeeId ? (payeeMap.get(t.payeeId)?.name.toLowerCase() ?? '') : '';
        const acc = accountMap.get(t.accountId)?.name.toLowerCase() ?? '';
        return note.includes(q) || cat.includes(q) || payee.includes(q) || acc.includes(q);
      });
    }
    return list;
  }, [transactions, typeFilter, search, categoryMap, payeeMap, accountMap]);

  const hasMore = transactions.length < total;

  /* ── Month navigation ── */
  const goMonth = (delta: number) => {
    setViewMonth((m) => {
      const next = m + delta;
      if (next < 0) {
        setViewYear((y) => y - 1);
        return 11;
      }
      if (next > 11) {
        setViewYear((y) => y + 1);
        return 0;
      }
      return next;
    });
  };

  /* ── Panel helpers ── */
  const openEdit = (tx: Transaction) => {
    setCreating(false);
    setSelected(tx);
    setForm({
      notes: tx.notes ?? '',
      amount: String(tx.amount),
      date: tx.date.slice(0, 10),
      type: tx.type,
      categoryId: tx.categoryId != null ? String(tx.categoryId) : '',
      accountId: String(tx.accountId),
      payeeId: tx.payeeId != null ? String(tx.payeeId) : '',
    });
    setPanelError(null);
    setConfirmDelete(false);
  };

  const openCreate = () => {
    setSelected(null);
    setCreating(true);
    setForm({
      ...EMPTY_FORM,
      date: isoDate(new Date()),
      accountId: accounts.length > 0 ? String(accounts[0].id) : '',
    });
    setPanelError(null);
    setConfirmDelete(false);
  };

  const closePanel = () => {
    setSelected(null);
    setCreating(false);
    setPanelError(null);
    setConfirmDelete(false);
  };

  /* ── CRUD ── */
  const handleSave = async () => {
    setPanelError(null);
    const amount = parseFloat(form.amount);
    if (isNaN(amount)) {
      setPanelError('Amount must be a valid number');
      return;
    }
    if (!form.accountId) {
      setPanelError('Account is required');
      return;
    }

    const payload = {
      notes: form.notes || null,
      amount,
      date: form.date,
      type: form.type,
      categoryId: form.categoryId ? Number(form.categoryId) : null,
      accountId: Number(form.accountId),
      payeeId: form.payeeId ? Number(form.payeeId) : null,
      recurringRuleId: selected?.recurringRuleId ?? null,
    };

    setSaving(true);
    try {
      if (selected) {
        await api.updateTransaction(selected.id, payload);
      } else {
        await api.createTransaction(payload);
      }
      closePanel();
      setPage(1);
      loadTransactions(1);
      setRefDataToken((t) => t + 1);
      onDataChanged();
    } catch (err) {
      setPanelError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    setPanelError(null);
    try {
      await api.deleteTransaction(selected.id);
      closePanel();
      setPage(1);
      loadTransactions(1);
      setRefDataToken((t) => t + 1);
      onDataChanged();
    } catch (err) {
      setPanelError((err as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  const handleLoadMore = () => {
    const next = page + 1;
    setPage(next);
    loadTransactions(next);
  };

  /* ── Recurring insight ── */
  const recurringInsight = useMemo(() => {
    if (!selected?.recurringRuleId) return null;
    const rule = ruleMap.get(selected.recurringRuleId);
    if (!rule) return null;
    const multiplier = PERIOD_YEARLY_MULTIPLIER[rule.period] ?? 1;
    const yearly = Math.abs(rule.amount) * multiplier;
    return {
      period: rule.period.charAt(0) + rule.period.slice(1).toLowerCase(),
      yearly: formatAmount(yearly),
    };
  }, [selected, ruleMap]);

  /* ─── Render ────────────────────────────────────────────────────────── */

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-5">
      {/* Hero header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-neon-text">
          Transactions
        </h1>
        <p className="mt-1 text-xs text-neon-text-muted">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </p>
      </div>

      {/* Top bar: month nav + search + filter + add */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Month navigation */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => goMonth(-1)}
            className="flex h-7 w-7 items-center justify-center rounded
                       border border-neon-border text-neon-text-secondary
                       hover:border-neon-border-active hover:text-neon-text
                       transition-colors"
            aria-label="Previous month"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <span className="min-w-[120px] text-center text-sm font-medium text-neon-text-secondary">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </span>
          <button
            onClick={() => goMonth(1)}
            className="flex h-7 w-7 items-center justify-center rounded
                       border border-neon-border text-neon-text-secondary
                       hover:border-neon-border-active hover:text-neon-text
                       transition-colors"
            aria-label="Next month"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search transactions..."
          className="h-7 w-52 rounded-md border border-neon-border bg-[rgba(255,255,255,0.03)]
                     px-2.5 text-xs text-neon-text placeholder:text-neon-text-muted
                     outline-none transition-colors focus:border-neon-green/40"
        />

        {/* Type filter pills */}
        <div className="flex items-center gap-1">
          {FILTER_OPTIONS.map((opt) => {
            const active = typeFilter === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => setTypeFilter(opt.key)}
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium transition-colors
                  ${active
                    ? 'bg-[rgba(255,255,255,0.08)] text-neon-text'
                    : 'text-neon-text-muted hover:text-neon-text-secondary'
                  }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Add button */}
        <button
          onClick={openCreate}
          className="flex h-7 items-center gap-1.5 rounded-md border border-neon-green/20
                     bg-neon-green/5 px-3 text-xs font-medium text-neon-green
                     hover:bg-neon-green/10 transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New
        </button>
      </div>

      {/* Transaction list */}
      {loading && transactions.length === 0 && (
        <div className="py-20 text-center text-xs text-neon-text-muted">
          Loading transactions...
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <EmptyState
          message={
            transactions.length === 0
              ? 'No transactions this month'
              : 'No transactions match your filters'
          }
          actionLabel={transactions.length === 0 ? 'Add transaction' : undefined}
          onAction={transactions.length === 0 ? openCreate : undefined}
        />
      )}

      {filtered.length > 0 && (
        <DateGroupedList
          items={filtered}
          getDate={(t) => t.date}
          keyExtractor={(t) => t.id}
          renderItem={(tx) => (
            <TransactionRow
              tx={tx}
              categoryMap={categoryMap}
              payeeMap={payeeMap}
              accountMap={accountMap}
              isSelected={selected?.id === tx.id}
              onClick={() => openEdit(tx)}
            />
          )}
        />
      )}

      {/* Load more */}
      {hasMore && (
        <div className="flex justify-center pb-4">
          <button
            onClick={handleLoadMore}
            disabled={loading}
            className="rounded-md border border-neon-border px-4 py-1.5 text-xs
                       text-neon-text-secondary hover:border-neon-border-active
                       hover:text-neon-text disabled:opacity-40 transition-colors"
          >
            {loading ? 'Loading...' : `Load more (${transactions.length} of ${total})`}
          </button>
        </div>
      )}

      {/* Side panel */}
      <SidePanel open={panelOpen} onClose={closePanel}>
        {/* Hero amount */}
        <div className="mb-5">
          <p className="text-[9px] uppercase tracking-[2px] text-neon-text-muted mb-1">
            {creating ? 'New Transaction' : 'Amount'}
          </p>
          {!creating && selected && (
            <p className={`text-3xl font-extrabold tracking-tight ${TYPE_TW[form.type as TxType]}`}>
              {form.type === 'INCOME' ? '+' : '-'}${formatAmount(parseFloat(form.amount) || 0)}
            </p>
          )}
          {creating && (
            <p className={`text-3xl font-extrabold tracking-tight ${TYPE_TW[form.type as TxType]}`}>
              ${formatAmount(parseFloat(form.amount) || 0)}
            </p>
          )}
        </div>

        {/* Insight block */}
        {selected && recurringInsight && (
          <div className="mb-4">
            <InsightBlock
              label="Recurring"
              text={`${recurringInsight.period} \u00b7 $${recurringInsight.yearly}/yr`}
              color={TYPE_COLORS[selected.type]}
            />
          </div>
        )}
        {selected && !recurringInsight && (
          <div className="mb-4">
            <InsightBlock
              label="Edit Transaction"
              text={`#${selected.id} \u00b7 ${TYPE_LABELS[selected.type]}`}
              color={TYPE_COLORS[selected.type]}
            />
          </div>
        )}

        {/* Form */}
        <div className="space-y-3">
          {/* Notes */}
          <label className="block">
            <span className="text-[9px] uppercase tracking-[2px] text-neon-text-muted">Notes</span>
            <input
              type="text"
              value={form.notes}
              onChange={(e) => {
                const val = e.target.value;
                setForm((prev) => ({ ...prev, notes: val }));
              }}
              placeholder="What was this for?"
              className="mt-1 block w-full"
            />
          </label>

          {/* Amount */}
          <label className="block">
            <span className="text-[9px] uppercase tracking-[2px] text-neon-text-muted">Amount</span>
            <input
              type="number"
              step="0.01"
              value={form.amount}
              onChange={(e) => {
                const val = e.target.value;
                setForm((prev) => ({ ...prev, amount: val }));
              }}
              placeholder="0.00"
              className="mt-1 block w-full"
            />
          </label>

          {/* Date */}
          <label className="block">
            <span className="text-[9px] uppercase tracking-[2px] text-neon-text-muted">Date</span>
            <input
              type="date"
              value={form.date}
              onChange={(e) => {
                const val = e.target.value;
                setForm((prev) => ({ ...prev, date: val }));
              }}
              className="mt-1 block w-full"
            />
          </label>

          {/* Type */}
          <label className="block">
            <span className="text-[9px] uppercase tracking-[2px] text-neon-text-muted">Type</span>
            <select
              value={form.type}
              onChange={(e) => {
                const val = e.target.value as TxType;
                setForm((prev) => ({ ...prev, type: val }));
              }}
              className="mt-1 block w-full"
            >
              <option value="INCOME">Income</option>
              <option value="FIXED_COST">Fixed Cost</option>
              <option value="VARIABLE_EXPENSE">Variable Expense</option>
              <option value="TRANSFER">Transfer</option>
            </select>
          </label>

          {/* Account */}
          <label className="block">
            <span className="text-[9px] uppercase tracking-[2px] text-neon-text-muted">Account</span>
            <select
              value={form.accountId}
              onChange={(e) => {
                const val = e.target.value;
                setForm((prev) => ({ ...prev, accountId: val }));
              }}
              className="mt-1 block w-full"
            >
              <option value="">Select account...</option>
              {accounts.filter((a) => !a.archived).map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </label>

          {/* Category */}
          <label className="block">
            <span className="text-[9px] uppercase tracking-[2px] text-neon-text-muted">Category</span>
            <select
              value={form.categoryId}
              onChange={(e) => {
                const val = e.target.value;
                setForm((prev) => ({ ...prev, categoryId: val }));
              }}
              className="mt-1 block w-full"
            >
              <option value="">None</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>

          {/* Payee */}
          <label className="block">
            <span className="text-[9px] uppercase tracking-[2px] text-neon-text-muted">Payee</span>
            <select
              value={form.payeeId}
              onChange={(e) => {
                const val = e.target.value;
                setForm((prev) => ({ ...prev, payeeId: val }));
              }}
              className="mt-1 block w-full"
            >
              <option value="">None</option>
              {payees.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>
        </div>

        {/* Error */}
        {panelError && (
          <p className="mt-3 text-xs text-neon-red">{panelError}</p>
        )}

        {/* Actions */}
        <div className="mt-5 flex flex-col gap-2">
          <button
            onClick={() => void handleSave()}
            disabled={saving}
            className="w-full rounded-md bg-neon-green/10 border border-neon-green/20
                       py-2 text-xs font-medium text-neon-green
                       hover:bg-neon-green/15 disabled:opacity-40 transition-colors"
          >
            {saving ? 'Saving...' : (selected ? 'Save Changes' : 'Create Transaction')}
          </button>

          {selected && (
            <button
              onClick={() => void handleDelete()}
              disabled={deleting}
              className={`w-full rounded-md border py-2 text-xs font-medium transition-colors
                disabled:opacity-40
                ${confirmDelete
                  ? 'border-neon-red/40 bg-neon-red/15 text-neon-red'
                  : 'border-neon-border text-neon-text-muted hover:border-neon-red/30 hover:text-neon-red'
                }`}
            >
              {deleting ? 'Deleting...' : confirmDelete ? 'Confirm Delete' : 'Delete'}
            </button>
          )}
        </div>
      </SidePanel>
    </div>
  );
}

/* ─── Transaction Row ─────────────────────────────────────────────────── */

interface TransactionRowProps {
  tx: Transaction;
  categoryMap: Map<number, Category>;
  payeeMap: Map<number, Payee>;
  accountMap: Map<number, Account>;
  isSelected: boolean;
  onClick: () => void;
}

function TransactionRow({ tx, categoryMap, payeeMap, accountMap, isSelected, onClick }: TransactionRowProps) {
  const cat = tx.categoryId != null ? categoryMap.get(tx.categoryId) : undefined;
  const payee = tx.payeeId != null ? payeeMap.get(tx.payeeId) : undefined;
  const account = accountMap.get(tx.accountId);
  const label = tx.notes || cat?.name || payee?.name || 'Untitled';

  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 border-l-[3px] px-3 py-2
                  text-left transition-colors cursor-pointer
                  ${TYPE_BORDER_TW[tx.type]}
                  ${isSelected
                    ? 'bg-[rgba(255,255,255,0.04)]'
                    : 'hover:bg-[rgba(255,255,255,0.02)]'
                  }`}
    >
      {/* Label + meta */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-neon-text">{label}</p>
        <div className="mt-0.5 flex items-center gap-2">
          {cat && (
            <PillChip label={cat.name} color={TYPE_COLORS[tx.type]} />
          )}
          {account && (
            <span className="text-[10px] text-neon-text-faint">{account.name}</span>
          )}
        </div>
      </div>

      {/* Relative time */}
      <span className="shrink-0 text-[10px] text-neon-text-faint">
        {relativeTime(tx.date)}
      </span>

      {/* Amount */}
      <span className={`shrink-0 text-sm font-semibold tabular-nums ${TYPE_TW[tx.type]}`}>
        {tx.type === 'INCOME' ? '+' : '-'}${formatAmount(tx.amount)}
      </span>
    </button>
  );
}
