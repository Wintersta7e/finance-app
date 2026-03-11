import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import type { Budget, BudgetVsActual, Category } from '../api/types';
import { EmptyState } from '../components/EmptyState';
import { GlowBar } from '../components/GlowBar';
import { InsightBlock } from '../components/InsightBlock';
import { MetricStrip } from '../components/MetricStrip';
import { OrbitalRing } from '../components/OrbitalRing';
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

function accentFor(id: number): string {
  return ACCENT_COLORS[id % ACCENT_COLORS.length];
}

function cssVar(accent: string): string {
  return ACCENT_CSS[accent] ?? 'var(--color-neon-green)';
}

/* ── Form type ───────────────────────────────────────── */
type BudgetForm = {
  categoryId: number | null;
  amount: string;
  period: string;
  effectiveFrom: string;
  effectiveTo: string;
};

function emptyForm(categories: Category[]): BudgetForm {
  return {
    categoryId: categories[0]?.id ?? null,
    amount: '',
    period: 'MONTHLY',
    effectiveFrom: new Date().toISOString().slice(0, 10),
    effectiveTo: '',
  };
}

function parseAmount(value: string): number {
  if (value == null) return Number.NaN;
  return Number(value.replace(',', '.'));
}

function fmt(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* ── Merged view model ──────────────────────────────── */
interface BudgetRow {
  budget: Budget;
  categoryName: string;
  accent: string;
  actual: number;
  progress: number;
}

/* ── Page ────────────────────────────────────────────── */
export function BudgetsPage() {
  const isMounted = useIsMounted();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [actuals, setActuals] = useState<BudgetVsActual[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [selected, setSelected] = useState<Budget | null>(null);
  const [form, setForm] = useState<BudgetForm | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(year, month, 0).getDate();

  /* ── Lookups ──────────────────────────────────────── */
  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const actualMap = useMemo(
    () => new Map(actuals.map((a) => [a.categoryId, a.actual])),
    [actuals],
  );

  const rows: BudgetRow[] = useMemo(
    () =>
      budgets.map((b) => {
        const cat = categoryMap.get(b.categoryId);
        const actual = actualMap.get(b.categoryId) ?? 0;
        const progress = b.amount > 0 ? actual / b.amount : 0;
        return {
          budget: b,
          categoryName: cat?.name ?? `Category ${b.categoryId}`,
          accent: accentFor(b.categoryId),
          actual,
          progress,
        };
      }),
    [budgets, categoryMap, actualMap],
  );

  /* ── Overall health ───────────────────────────────── */
  const totalBudgeted = useMemo(() => budgets.reduce((s, b) => s + b.amount, 0), [budgets]);
  const totalActual = useMemo(() => rows.reduce((s, r) => s + r.actual, 0), [rows]);
  const overallHealth = totalBudgeted > 0 ? Math.max(0, 1 - totalActual / totalBudgeted) : 1;

  /* ── Load ──────────────────────────────────────────── */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [b, a, c] = await Promise.all([
        api.getBudgets(),
        api.getBudgetVsActual(year, month),
        api.getCategories(),
      ]);
      if (!isMounted()) return;
      setBudgets(b);
      setActuals(a);
      setCategories(c);
      setError(null);
    } catch (err) {
      if (!isMounted()) return;
      setError((err as Error).message);
    } finally {
      if (isMounted()) setLoading(false);
    }
  }, [year, month, isMounted]);

  useEffect(() => {
    void load();
  }, [load]);

  /* ── Panel helpers ─────────────────────────────────── */
  const openCreate = () => {
    setSelected(null);
    setIsCreating(true);
    setForm(emptyForm(categories));
    setError(null);
  };

  const openDetail = (budget: Budget) => {
    setIsCreating(false);
    setSelected(budget);
    setForm({
      categoryId: budget.categoryId,
      amount: budget.amount.toString(),
      period: budget.period,
      effectiveFrom: budget.effectiveFrom.slice(0, 10),
      effectiveTo: budget.effectiveTo ? budget.effectiveTo.slice(0, 10) : '',
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

  /* ── Save / Delete ─────────────────────────────────── */
  const handleSave = async () => {
    if (!form) return;
    setError(null);

    if (form.categoryId == null) {
      setError('Select a category');
      return;
    }
    const parsedAmount = parseAmount(form.amount);
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Enter a valid amount');
      return;
    }

    const payload: Omit<Budget, 'id'> = {
      categoryId: form.categoryId,
      amount: parsedAmount,
      period: form.period,
      effectiveFrom: form.effectiveFrom,
      effectiveTo: form.effectiveTo || null,
    };

    setSaving(true);
    try {
      if (selected) {
        await api.updateBudget(selected.id, payload);
      } else {
        await api.createBudget(payload);
      }
      closePanel();
      void load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    if (!window.confirm('Delete this budget?')) return;
    setError(null);
    setSaving(true);
    try {
      await api.deleteBudget(selected.id);
      closePanel();
      void load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  /* ── Selected row detail ──────────────────────────── */
  const selectedRow = selected
    ? rows.find((r) => r.budget.id === selected.id) ?? null
    : null;

  const projection = selectedRow
    ? dayOfMonth > 0
      ? (selectedRow.actual / dayOfMonth) * daysInMonth
      : 0
    : 0;

  /* ── Render ────────────────────────────────────────── */
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-lg font-semibold text-neon-text">Budgets</h1>
          <p className="text-xs text-neon-text-muted mt-0.5">Keep spending in line</p>
        </div>
        <button
          onClick={openCreate}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-md bg-neon-green/10 border border-neon-green/15
                     px-3 py-1.5 text-xs font-medium text-neon-green
                     hover:bg-neon-green/15 transition-colors disabled:opacity-40"
        >
          + New budget
        </button>
      </div>

      {/* Error banner */}
      {error && !panelOpen && (
        <div className="rounded-md border border-neon-red/20 bg-neon-red/5 px-3 py-2 text-xs text-neon-red">
          {error}
        </div>
      )}

      {/* Overall summary strip */}
      {!loading && budgets.length > 0 && (
        <div className="flex gap-3">
          <MetricStrip label="Total budgeted" value={fmt(totalBudgeted)} color="var(--color-neon-indigo)" />
          <MetricStrip label="Total spent" value={fmt(totalActual)} color="var(--color-neon-amber)" />
          <MetricStrip label="Remaining" value={fmt(totalBudgeted - totalActual)} color="var(--color-neon-green)">
            <GlowBar value={totalBudgeted > 0 ? totalActual / totalBudgeted : 0} height={4} />
          </MetricStrip>
        </div>
      )}

      {/* Budget list */}
      {loading && (
        <p className="py-12 text-center text-xs text-neon-text-muted animate-pulse">Loading budgets...</p>
      )}

      {!loading && budgets.length === 0 && (
        <EmptyState message="No budgets yet" actionLabel="Create your first budget" onAction={openCreate} />
      )}

      {!loading && rows.map((row) => {
        const isActive = selected?.id === row.budget.id;
        const pct = row.progress * 100;
        const accent = cssVar(row.accent);
        return (
          <button
            key={row.budget.id}
            onClick={() => openDetail(row.budget)}
            className={`group w-full text-left rounded-md border transition-all duration-150
              ${isActive
                ? 'border-neon-border-active bg-[rgba(255,255,255,0.03)]'
                : 'border-neon-border hover:border-neon-border-active bg-transparent hover:bg-[rgba(255,255,255,0.015)]'
              }`}
            style={{ borderLeftWidth: 3, borderLeftColor: accent }}
          >
            <div className="flex items-center gap-4 px-4 py-3">
              {/* Category name */}
              <div className="min-w-[120px]">
                <div className="text-[9px] uppercase tracking-[2px] text-neon-text-muted">Category</div>
                <div className="text-sm font-medium text-neon-text">{row.categoryName}</div>
              </div>

              {/* GlowBar */}
              <div className="flex-1 space-y-1">
                <GlowBar value={row.progress} height={6} />
                <div className="flex justify-between text-[10px] text-neon-text-muted">
                  <span>{fmt(row.actual)} spent</span>
                  <span>{fmt(row.budget.amount)} limit</span>
                </div>
              </div>

              {/* Percentage badge */}
              <PillChip
                label={`${pct.toFixed(0)}%`}
                color={pct > 100 ? 'var(--color-neon-red)' : pct > 75 ? 'var(--color-neon-amber)' : 'var(--color-neon-green)'}
              />
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
              {isCreating ? 'New budget' : 'Budget detail'}
            </h2>

            {/* OrbitalRing + health (detail only) */}
            {selectedRow && (
              <div className="flex items-center gap-4">
                <OrbitalRing
                  value={overallHealth}
                  size={72}
                  color={
                    selectedRow.progress > 1
                      ? 'var(--color-neon-red)'
                      : selectedRow.progress > 0.75
                        ? 'var(--color-neon-amber)'
                        : 'var(--color-neon-green)'
                  }
                  strokeWidth={4}
                  label={`${(overallHealth * 100).toFixed(0)}%`}
                />
                <div className="space-y-1">
                  <MetricStrip
                    label="Spent"
                    value={fmt(selectedRow.actual)}
                    color="var(--color-neon-amber)"
                  />
                  <MetricStrip
                    label="Limit"
                    value={fmt(selectedRow.budget.amount)}
                    color="var(--color-neon-green)"
                  />
                </div>
              </div>
            )}

            {/* Projection insight (detail only) */}
            {selectedRow && (
              <InsightBlock
                label="Projection"
                text={`Projected: $${fmt(projection)} by month end`}
                color={
                  projection > selectedRow.budget.amount
                    ? 'var(--color-neon-red)'
                    : 'var(--color-neon-green)'
                }
              />
            )}

            {/* Error inside panel */}
            {error && (
              <div className="rounded-md border border-neon-red/20 bg-neon-red/5 px-3 py-2 text-xs text-neon-red">
                {error}
              </div>
            )}

            {/* ── Form fields ────────────────────────── */}
            <div className="space-y-3">
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
                  <option value="">Select category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
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

              {/* Period */}
              <div>
                <label className="text-[9px] uppercase tracking-[2px] text-neon-text-muted block mb-1">
                  Period
                </label>
                <select
                  value={form.period}
                  onChange={(e) => setForm(prev => prev ? { ...prev, period: e.target.value } : prev)}
                  className="w-full"
                >
                  <option value="MONTHLY">Monthly</option>
                </select>
              </div>

              {/* Effective from */}
              <div>
                <label className="text-[9px] uppercase tracking-[2px] text-neon-text-muted block mb-1">
                  Effective from
                </label>
                <input
                  type="date"
                  value={form.effectiveFrom}
                  onChange={(e) => setForm(prev => prev ? { ...prev, effectiveFrom: e.target.value } : prev)}
                  className="w-full"
                />
              </div>

              {/* Effective to */}
              <div>
                <label className="text-[9px] uppercase tracking-[2px] text-neon-text-muted block mb-1">
                  Effective to (optional)
                </label>
                <input
                  type="date"
                  value={form.effectiveTo}
                  onChange={(e) => setForm(prev => prev ? { ...prev, effectiveTo: e.target.value } : prev)}
                  className="w-full"
                />
              </div>
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
                <button
                  onClick={() => void handleDelete()}
                  disabled={saving}
                  className="rounded-md bg-neon-red/10 border border-neon-red/15
                             px-4 py-2 text-xs font-medium text-neon-red
                             hover:bg-neon-red/15 transition-colors disabled:opacity-40"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        )}
      </SidePanel>
    </div>
  );
}
