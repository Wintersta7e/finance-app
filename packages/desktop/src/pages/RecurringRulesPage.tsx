import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import type { Account, Category, RecurringRule, RecurringPeriod } from '../api/types';
import { EmptyState } from '../components/EmptyState';
import { InsightBlock } from '../components/InsightBlock';
import { MetricStrip } from '../components/MetricStrip';
import { PillChip } from '../components/PillChip';
import { SidePanel } from '../components/SidePanel';
import { useIsMounted } from '../hooks/useIsMounted';

/* ── Palette ─────────────────────────────────────────── */
const ACCENT_COLORS = ['neon-green', 'neon-indigo', 'neon-amber', 'neon-cyan', 'neon-orange', 'neon-rose'];

const ACCENT_CSS: Record<string, string> = {
  'neon-green': 'var(--color-neon-green)',
  'neon-indigo': 'var(--color-neon-indigo)',
  'neon-amber': 'var(--color-neon-amber)',
  'neon-cyan': 'var(--color-neon-cyan)',
  'neon-orange': 'var(--color-neon-orange)',
  'neon-rose': 'var(--color-neon-rose)',
};

function accentFor(categoryId: number | null): string {
  if (categoryId == null) return 'neon-indigo';
  return ACCENT_COLORS[categoryId % ACCENT_COLORS.length];
}

function cssVar(accent: string): string {
  return ACCENT_CSS[accent] ?? 'var(--color-neon-indigo)';
}

/* ── Period helpers ──────────────────────────────────── */
const PERIOD_LABELS: Record<RecurringPeriod, string> = {
  DAILY: 'Daily',
  WEEKLY: 'Weekly',
  MONTHLY: 'Monthly',
  YEARLY: 'Yearly',
};

const PERIOD_MULTIPLIER: Record<RecurringPeriod, number> = {
  DAILY: 365,
  WEEKLY: 52,
  MONTHLY: 12,
  YEARLY: 1,
};

function periodColor(period: RecurringPeriod): string {
  switch (period) {
    case 'DAILY': return 'var(--color-neon-cyan)';
    case 'WEEKLY': return 'var(--color-neon-indigo)';
    case 'MONTHLY': return 'var(--color-neon-green)';
    case 'YEARLY': return 'var(--color-neon-amber)';
  }
}

/* ── Form type ───────────────────────────────────────── */
type RuleForm = {
  accountId: number;
  categoryId: number | null;
  amount: string;
  direction: 'INCOME' | 'EXPENSE';
  period: RecurringPeriod;
  startDate: string;
  endDate: string;
  autoPost: boolean;
  note: string;
};

function emptyForm(accounts: Account[]): RuleForm {
  return {
    accountId: accounts[0]?.id ?? 0,
    categoryId: null,
    amount: '',
    direction: 'EXPENSE',
    period: 'MONTHLY',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: '',
    autoPost: false,
    note: '',
  };
}

function parseAmount(value: string): number {
  if (value == null) return Number.NaN;
  return Number(value.replace(',', '.'));
}

function fmt(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function isToday(dateStr: string): boolean {
  return dateStr.slice(0, 10) === new Date().toISOString().slice(0, 10);
}

function isDueOrPast(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return new Date(dateStr.slice(0, 10)) <= new Date(new Date().toISOString().slice(0, 10));
}

/* ── Page ────────────────────────────────────────────── */
export function RecurringRulesPage() {
  const isMounted = useIsMounted();
  const [rules, setRules] = useState<RecurringRule[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [selected, setSelected] = useState<RecurringRule | null>(null);
  const [form, setForm] = useState<RuleForm | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  /* ── Lookups ──────────────────────────────────────── */
  const accountMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  /* ── Load ──────────────────────────────────────────── */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, a, c] = await Promise.all([
        api.getRecurringRules(),
        api.getAccounts(),
        api.getCategories(),
      ]);
      if (!isMounted()) return;
      setRules(r);
      setAccounts(a);
      setCategories(c);
      setError(null);
    } catch (err) {
      if (!isMounted()) return;
      setError((err as Error).message);
    } finally {
      if (isMounted()) setLoading(false);
    }
  }, [isMounted]);

  useEffect(() => {
    void load();
  }, [load]);

  /* ── Panel helpers ─────────────────────────────────── */
  const openCreate = () => {
    setSelected(null);
    setIsCreating(true);
    setForm(emptyForm(accounts));
    setError(null);
  };

  const openDetail = (rule: RecurringRule) => {
    setIsCreating(false);
    setSelected(rule);
    setForm({
      accountId: rule.accountId,
      categoryId: rule.categoryId,
      amount: rule.amount.toString(),
      direction: rule.direction,
      period: rule.period,
      startDate: rule.startDate.slice(0, 10),
      endDate: rule.endDate ? rule.endDate.slice(0, 10) : '',
      autoPost: rule.autoPost,
      note: rule.note ?? '',
    });
    setError(null);
  };

  const closePanel = () => {
    setSelected(null);
    setIsCreating(false);
    setForm(null);
    setError(null);
  };

  const panelOpen = form !== null;

  /* ── Save / Delete / Generate ──────────────────────── */
  const handleSave = async () => {
    if (!form) return;
    setError(null);

    const parsedAmount = parseAmount(form.amount);
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Enter a valid amount');
      return;
    }

    const payload = {
      accountId: form.accountId,
      categoryId: form.categoryId,
      amount: parsedAmount,
      direction: form.direction,
      period: form.period,
      startDate: form.startDate,
      endDate: form.endDate || null,
      autoPost: form.autoPost,
      note: form.note.trim() || null,
    };

    setSaving(true);
    try {
      if (selected) {
        await api.updateRecurringRule(selected.id, payload);
      } else {
        await api.createRecurringRule(payload);
      }
      closePanel();
      void load();
    } catch (err) {
      if (!isMounted()) return;
      setError((err as Error).message);
    } finally {
      if (isMounted()) setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    if (!window.confirm('Delete this recurring rule?')) return;
    setError(null);
    setSaving(true);
    try {
      await api.deleteRecurringRule(selected.id);
      closePanel();
      void load();
    } catch (err) {
      if (!isMounted()) return;
      setError((err as Error).message);
    } finally {
      if (isMounted()) setSaving(false);
    }
  };

  const handleGenerate = async () => {
    if (!selected) return;
    setError(null);
    setSaving(true);
    try {
      await api.generateNextRecurringRule(selected.id);
      void load();
    } catch (err) {
      if (!isMounted()) return;
      setError((err as Error).message);
    } finally {
      if (isMounted()) setSaving(false);
    }
  };

  /* ── Selected row detail ──────────────────────────── */
  const yearlyCost = selected
    ? selected.amount * PERIOD_MULTIPLIER[selected.period]
    : 0;

  /* ── Render ────────────────────────────────────────── */
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-lg font-semibold text-neon-text">Recurring rules</h1>
          <p className="text-xs text-neon-text-muted mt-0.5">Automate predictable transactions</p>
        </div>
        <button
          onClick={openCreate}
          disabled={loading || accounts.length === 0}
          className="flex items-center gap-1.5 rounded-md bg-neon-green/10 border border-neon-green/15
                     px-3 py-1.5 text-xs font-medium text-neon-green
                     hover:bg-neon-green/15 transition-colors disabled:opacity-40"
        >
          + New rule
        </button>
      </div>

      {/* Error banner */}
      {error && !panelOpen && (
        <div className="rounded-md border border-neon-red/20 bg-neon-red/5 px-3 py-2 text-xs text-neon-red">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <p className="py-12 text-center text-xs text-neon-text-muted animate-pulse">Loading rules...</p>
      )}

      {/* Empty */}
      {!loading && rules.length === 0 && (
        <EmptyState
          message="No recurring rules yet"
          actionLabel="Create your first rule"
          onAction={openCreate}
        />
      )}

      {/* Rule list */}
      {!loading && rules.map((rule) => {
        const isActive = selected?.id === rule.id;
        const accent = accentFor(rule.categoryId);
        const accentCss = cssVar(accent);
        const catName = rule.categoryId != null
          ? (categoryMap.get(rule.categoryId)?.name ?? `Category ${rule.categoryId}`)
          : null;
        const acctName = accountMap.get(rule.accountId)?.name ?? `Account ${rule.accountId}`;
        const due = isDueOrPast(rule.nextOccurrence);
        const nextDate = rule.nextOccurrence?.slice(0, 10) ?? null;
        const displayNote = rule.note || `Recurring ${rule.direction.toLowerCase()}`;

        return (
          <button
            key={rule.id}
            onClick={() => openDetail(rule)}
            className={`group w-full text-left rounded-md border transition-all duration-150
              ${isActive
                ? 'border-neon-border-active bg-[rgba(255,255,255,0.03)]'
                : 'border-neon-border hover:border-neon-border-active bg-transparent hover:bg-[rgba(255,255,255,0.015)]'
              }`}
            style={{ borderLeftWidth: 3, borderLeftColor: accentCss }}
          >
            <div className="flex items-center gap-4 px-4 py-3">
              {/* Primary text */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-neon-text truncate">{displayNote}</div>
                <div className="text-[10px] text-neon-text-muted mt-0.5 flex items-center gap-2">
                  <span>{acctName}</span>
                  {catName && (
                    <>
                      <span className="text-neon-text-faint">|</span>
                      <span>{catName}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Amount */}
              <div className="text-right shrink-0">
                <div className="text-sm font-semibold text-neon-text">{fmt(rule.amount)}</div>
                <div className="text-[10px] text-neon-text-muted">
                  {rule.direction === 'INCOME' ? 'Income' : 'Expense'}
                </div>
              </div>

              {/* Period pill */}
              <PillChip label={PERIOD_LABELS[rule.period]} color={periodColor(rule.period)} />

              {/* Next occurrence */}
              <div className="text-right shrink-0 min-w-[72px]">
                {nextDate ? (
                  <>
                    <div className={`text-[11px] font-medium ${due ? 'text-neon-amber' : 'text-neon-text-secondary'}`}>
                      {isToday(nextDate) ? 'Today' : nextDate}
                    </div>
                    {due && (
                      <PillChip label="Due" color="var(--color-neon-amber)" />
                    )}
                  </>
                ) : (
                  <span className="text-[10px] text-neon-text-faint">No date</span>
                )}
              </div>

              {/* Auto-post indicator */}
              {rule.autoPost && (
                <div className="shrink-0" title="Auto-post enabled">
                  <div className="h-2 w-2 rounded-full bg-neon-green shadow-glow-green-sm" />
                </div>
              )}
            </div>
          </button>
        );
      })}

      {/* ── Side Panel ──────────────────────────────── */}
      <SidePanel open={panelOpen} onClose={closePanel}>
        {form && (
          <div className="space-y-5">
            {/* Panel title */}
            <h2 className="text-sm font-semibold text-neon-text">
              {isCreating ? 'New rule' : 'Rule detail'}
            </h2>

            {/* Yearly cost insight (detail only) */}
            {selected && (
              <InsightBlock
                label="Yearly cost"
                text={`$${fmt(yearlyCost)} / year (${fmt(selected.amount)} x ${PERIOD_MULTIPLIER[selected.period]})`}
                color={selected.direction === 'INCOME' ? 'var(--color-neon-green)' : 'var(--color-neon-amber)'}
              />
            )}

            {/* Summary strip (detail only) */}
            {selected && (
              <div className="flex gap-3">
                <MetricStrip
                  label="Amount"
                  value={fmt(selected.amount)}
                  color={selected.direction === 'INCOME' ? 'var(--color-neon-green)' : 'var(--color-neon-amber)'}
                />
                <MetricStrip
                  label="Period"
                  value={PERIOD_LABELS[selected.period]}
                  color={periodColor(selected.period)}
                />
              </div>
            )}

            {/* Error inside panel */}
            {error && (
              <div className="rounded-md border border-neon-red/20 bg-neon-red/5 px-3 py-2 text-xs text-neon-red">
                {error}
              </div>
            )}

            {/* ── Form fields ────────────────────────── */}
            <div className="space-y-3">
              {/* Note */}
              <div>
                <label className="text-[9px] uppercase tracking-[2px] text-neon-text-muted block mb-1">
                  Note
                </label>
                <input
                  type="text"
                  value={form.note}
                  onChange={(e) => setForm(prev => prev ? { ...prev, note: e.target.value } : prev)}
                  placeholder="e.g., Rent for downtown apartment"
                  autoComplete="off"
                  className="w-full"
                />
              </div>

              {/* Amount */}
              <div>
                <label className="text-[9px] uppercase tracking-[2px] text-neon-text-muted block mb-1">
                  Amount
                </label>
                <input
                  type="text"
                  value={form.amount}
                  onChange={(e) => {
                    const val = e.target.value;
                    setForm(prev => prev ? { ...prev, amount: val } : prev);
                  }}
                  placeholder="0.00"
                  autoComplete="off"
                  className="w-full"
                />
              </div>

              {/* Direction */}
              <div>
                <label className="text-[9px] uppercase tracking-[2px] text-neon-text-muted block mb-1">
                  Direction
                </label>
                <select
                  value={form.direction}
                  onChange={(e) => setForm(prev => prev ? { ...prev, direction: e.target.value as 'INCOME' | 'EXPENSE' } : prev)}
                  className="w-full"
                >
                  <option value="INCOME">Income</option>
                  <option value="EXPENSE">Expense</option>
                </select>
              </div>

              {/* Period */}
              <div>
                <label className="text-[9px] uppercase tracking-[2px] text-neon-text-muted block mb-1">
                  Period
                </label>
                <select
                  value={form.period}
                  onChange={(e) => setForm(prev => prev ? { ...prev, period: e.target.value as RecurringPeriod } : prev)}
                  className="w-full"
                >
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                  <option value="YEARLY">Yearly</option>
                </select>
              </div>

              {/* Start date */}
              <div>
                <label className="text-[9px] uppercase tracking-[2px] text-neon-text-muted block mb-1">
                  Start date
                </label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm(prev => prev ? { ...prev, startDate: e.target.value } : prev)}
                  className="w-full"
                />
              </div>

              {/* End date */}
              <div>
                <label className="text-[9px] uppercase tracking-[2px] text-neon-text-muted block mb-1">
                  End date (optional)
                </label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm(prev => prev ? { ...prev, endDate: e.target.value } : prev)}
                  className="w-full"
                />
              </div>

              {/* Account */}
              <div>
                <label className="text-[9px] uppercase tracking-[2px] text-neon-text-muted block mb-1">
                  Account
                </label>
                <select
                  value={form.accountId}
                  onChange={(e) => setForm(prev => prev ? { ...prev, accountId: Number(e.target.value) } : prev)}
                  className="w-full"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="text-[9px] uppercase tracking-[2px] text-neon-text-muted block mb-1">
                  Category
                </label>
                <select
                  value={form.categoryId ?? ''}
                  onChange={(e) => setForm(prev => prev ? { ...prev, categoryId: e.target.value ? Number(e.target.value) : null } : prev)}
                  className="w-full"
                >
                  <option value="">None</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Auto-post toggle */}
              <label className="flex items-center gap-2.5 cursor-pointer py-1">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={form.autoPost}
                    onChange={(e) => setForm(prev => prev ? { ...prev, autoPost: e.target.checked } : prev)}
                    className="sr-only peer"
                  />
                  <div className="h-5 w-9 rounded-full bg-[rgba(255,255,255,0.06)] border border-neon-border
                                  peer-checked:bg-neon-green/20 peer-checked:border-neon-green/30 transition-colors" />
                  <div className="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-neon-text-muted
                                  peer-checked:translate-x-4 peer-checked:bg-neon-green transition-all" />
                </div>
                <span className="text-[9px] uppercase tracking-[2px] text-neon-text-muted">Auto-post</span>
              </label>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => void handleSave()}
                disabled={saving}
                className="flex-1 rounded-md bg-neon-green/10 border border-neon-green/15
                           py-2 text-xs font-medium text-neon-green
                           hover:bg-neon-green/15 transition-colors disabled:opacity-40"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              {selected && (
                <>
                  <button
                    onClick={() => void handleGenerate()}
                    disabled={saving}
                    className="rounded-md bg-neon-indigo/10 border border-neon-indigo/15
                               px-3 py-2 text-xs font-medium text-neon-indigo
                               hover:bg-neon-indigo/15 transition-colors disabled:opacity-40"
                    title="Generate next transaction from this rule"
                  >
                    Generate next
                  </button>
                  <button
                    onClick={() => void handleDelete()}
                    disabled={saving}
                    className="rounded-md bg-neon-red/10 border border-neon-red/15
                               px-3 py-2 text-xs font-medium text-neon-red
                               hover:bg-neon-red/15 transition-colors disabled:opacity-40"
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </SidePanel>
    </div>
  );
}
