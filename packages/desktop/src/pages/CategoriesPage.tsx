import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Category, CategoryAmount } from '../api/types';
import { SidePanel } from '../components/SidePanel';
import { PillChip } from '../components/PillChip';
import { EmptyState } from '../components/EmptyState';
import { useIsMounted } from '../hooks/useIsMounted';

const ACCENT_COLORS = ['neon-green', 'neon-indigo', 'neon-amber', 'neon-cyan', 'neon-orange', 'neon-rose'] as const;

const ACCENT_CSS: Record<string, string> = {
  'neon-green': 'var(--color-neon-green)',
  'neon-indigo': 'var(--color-neon-indigo)',
  'neon-amber': 'var(--color-neon-amber)',
  'neon-cyan': 'var(--color-neon-cyan)',
  'neon-orange': 'var(--color-neon-orange)',
  'neon-rose': 'var(--color-neon-rose)',
};

const ACCENT_GLOW: Record<string, string> = {
  'neon-green': '0 0 20px rgba(0, 255, 136, 0.15)',
  'neon-indigo': '0 0 20px rgba(129, 140, 248, 0.15)',
  'neon-amber': '0 0 20px rgba(245, 158, 11, 0.15)',
  'neon-cyan': '0 0 20px rgba(34, 211, 238, 0.15)',
  'neon-orange': '0 0 20px rgba(249, 115, 22, 0.15)',
  'neon-rose': '0 0 20px rgba(244, 114, 182, 0.15)',
};

interface CategoryForm {
  name: string;
  kind: 'INCOME' | 'EXPENSE';
  fixedCost: boolean;
}

const emptyForm: CategoryForm = { name: '', kind: 'EXPENSE', fixedCost: false };

function accentForId(id: number): string {
  return ACCENT_COLORS[id % ACCENT_COLORS.length];
}

export function CategoriesPage() {
  const isMounted = useIsMounted();
  const [categories, setCategories] = useState<Category[]>([]);
  const [breakdown, setBreakdown] = useState<CategoryAmount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Category | null>(null);
  const [form, setForm] = useState<CategoryForm | null>(null);
  const [saving, setSaving] = useState(false);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cats, bd] = await Promise.all([
        api.getCategories(),
        api.getCategoryBreakdown(year, month),
      ]);
      if (!isMounted()) return;
      setCategories(cats);
      setBreakdown(bd);
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

  const openCreate = () => {
    setSelected(null);
    setForm(emptyForm);
  };

  const openEdit = (category: Category) => {
    setSelected(category);
    setForm({
      name: category.name,
      kind: category.kind,
      fixedCost: category.fixedCost,
    });
  };

  const closePanel = () => {
    setForm(null);
    setSelected(null);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!form || !form.name.trim()) return;
    setError(null);
    setSaving(true);
    try {
      const payload = { name: form.name.trim(), kind: form.kind, fixedCost: form.fixedCost };
      if (selected) {
        await api.updateCategory(selected.id, payload);
      } else {
        await api.createCategory(payload);
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
    if (!window.confirm(`Delete category "${selected.name}"?`)) return;
    setError(null);
    setSaving(true);
    try {
      await api.deleteCategory(selected.id);
      closePanel();
      void load();
    } catch (err) {
      if (!isMounted()) return;
      setError((err as Error).message);
    } finally {
      if (isMounted()) setSaving(false);
    }
  };

  // Find the current month spend for the selected category
  const selectedSpend = selected
    ? breakdown.find(b => b.categoryId === selected.id)?.amount ?? 0
    : 0;

  const selectedAccent = selected ? accentForId(selected.id) : ACCENT_COLORS[0];
  const selectedColor = ACCENT_CSS[selectedAccent];
  const selectedGlow = ACCENT_GLOW[selectedAccent];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neon-text tracking-tight">Categories</h1>
          <p className="mt-1 text-sm text-neon-text-secondary">
            Labels for budgets, rules, and transactions
          </p>
        </div>
        <button
          onClick={openCreate}
          disabled={loading}
          className="flex h-8 w-8 items-center justify-center rounded-md
                     border border-neon-green/20 bg-neon-green/5 text-neon-green
                     hover:bg-neon-green/10 hover:shadow-glow-green-sm
                     transition-all duration-150 disabled:opacity-40"
          aria-label="Add category"
        >
          <span className="text-lg leading-none">+</span>
        </button>
      </div>

      {/* Error banner */}
      {error && !form && (
        <div className="rounded-md border border-neon-red/20 bg-neon-red/5 px-4 py-2 text-sm text-neon-red">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <p className="text-sm text-neon-text-muted py-8 text-center">Loading categories...</p>
      )}

      {/* Empty state */}
      {!loading && categories.length === 0 && !error && (
        <EmptyState
          message="No categories yet. Add your first category to organize transactions."
          actionLabel="+ New Category"
          onAction={openCreate}
        />
      )}

      {/* Category strips */}
      {!loading && categories.length > 0 && (
        <div className="space-y-1">
          {categories.map((cat) => {
            const accent = accentForId(cat.id);
            const cssColor = ACCENT_CSS[accent];
            const spend = breakdown.find(b => b.categoryId === cat.id)?.amount ?? 0;
            const isSelected = selected?.id === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => openEdit(cat)}
                className={`group flex w-full items-center gap-4 rounded-md px-4 py-3
                           border transition-all duration-150 text-left
                           ${isSelected
                             ? 'border-neon-border-active bg-[rgba(255,255,255,0.03)]'
                             : 'border-transparent hover:border-neon-border hover:bg-[rgba(255,255,255,0.015)]'
                           }`}
              >
                {/* Color dot */}
                <div
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ background: cssColor }}
                />

                {/* Name + badges */}
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <span className="text-sm font-medium text-neon-text truncate">
                    {cat.name}
                  </span>
                  <PillChip
                    label={cat.kind === 'INCOME' ? 'Income' : 'Expense'}
                    color={cat.kind === 'INCOME' ? 'var(--color-neon-green)' : 'var(--color-neon-amber)'}
                  />
                  {cat.fixedCost && (
                    <PillChip label="Fixed" color="var(--color-neon-cyan)" />
                  )}
                </div>

                {/* Month spend */}
                {spend > 0 && (
                  <div className="text-right shrink-0">
                    <span className="text-[9px] uppercase tracking-[2px] text-neon-text-muted block">
                      This month
                    </span>
                    <span className="text-sm font-semibold tabular-nums text-neon-text-secondary">
                      {spend.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Side panel */}
      <SidePanel open={form !== null} onClose={closePanel}>
        {form && (
          <div className="space-y-6">
            {/* Color header with ambient glow */}
            {selected && (
              <div
                className="rounded-lg px-4 py-5 -mx-1"
                style={{
                  background: `linear-gradient(135deg, color-mix(in srgb, ${selectedColor} 8%, transparent), transparent)`,
                  boxShadow: selectedGlow,
                }}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ background: selectedColor }}
                  />
                  <span className="text-base font-semibold text-neon-text">
                    {selected.name}
                  </span>
                </div>
                {/* Current month spend */}
                <div className="mt-3">
                  <span className="text-[9px] uppercase tracking-[2px] text-neon-text-muted block">
                    Spent this month
                  </span>
                  <span
                    className="text-2xl font-semibold tabular-nums"
                    style={{ color: selectedColor }}
                  >
                    {selectedSpend.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>
            )}

            {/* Panel title (create mode) */}
            {!selected && (
              <div>
                <h2 className="text-base font-semibold text-neon-text">New Category</h2>
                <p className="mt-0.5 text-xs text-neon-text-muted">Create a new category</p>
              </div>
            )}

            {/* Error in panel */}
            {error && (
              <div className="rounded-md border border-neon-red/20 bg-neon-red/5 px-3 py-2 text-xs text-neon-red">
                {error}
              </div>
            )}

            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-[9px] uppercase tracking-[2px] text-neon-text-muted block">
                Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm(prev => prev ? { ...prev, name: e.target.value } : prev)}
                placeholder="e.g. Groceries"
                className="w-full"
                autoFocus
              />
            </div>

            {/* Kind */}
            <div className="space-y-1.5">
              <label className="text-[9px] uppercase tracking-[2px] text-neon-text-muted block">
                Kind
              </label>
              <select
                value={form.kind}
                onChange={(e) => setForm(prev => prev ? { ...prev, kind: e.target.value as 'INCOME' | 'EXPENSE' } : prev)}
                className="w-full"
              >
                <option value="INCOME">Income</option>
                <option value="EXPENSE">Expense</option>
              </select>
            </div>

            {/* Fixed cost toggle */}
            <label className="flex items-center gap-3 cursor-pointer select-none group/toggle">
              <button
                type="button"
                role="switch"
                aria-checked={form.fixedCost}
                onClick={() => setForm(prev => prev ? { ...prev, fixedCost: !prev.fixedCost } : prev)}
                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full
                           border transition-colors duration-150
                           ${form.fixedCost
                             ? 'bg-neon-cyan/20 border-neon-cyan/30'
                             : 'bg-[rgba(255,255,255,0.04)] border-neon-border-active'
                           }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 rounded-full transition-transform duration-150
                             ${form.fixedCost
                               ? 'translate-x-[18px] bg-neon-cyan'
                               : 'translate-x-[3px] bg-neon-text-muted'
                             }`}
                />
              </button>
              <span className="text-sm text-neon-text-secondary group-hover/toggle:text-neon-text transition-colors">
                Fixed cost
              </span>
            </label>

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => void handleSubmit()}
                disabled={saving || !form.name.trim()}
                className="w-full rounded-md bg-neon-green/10 border border-neon-green/20
                           px-4 py-2 text-sm font-medium text-neon-green
                           hover:bg-neon-green/15 hover:shadow-glow-green-sm
                           transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>

              {selected && (
                <button
                  onClick={() => void handleDelete()}
                  disabled={saving}
                  className="w-full rounded-md bg-neon-red/5 border border-neon-red/15
                             px-4 py-2 text-sm font-medium text-neon-red
                             hover:bg-neon-red/10 transition-all duration-150
                             disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {saving ? 'Deleting...' : 'Delete Category'}
                </button>
              )}
            </div>
          </div>
        )}
      </SidePanel>
    </div>
  );
}
