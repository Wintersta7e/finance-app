import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Goal } from '../api/types';
import { EmptyState } from '../components/EmptyState';
import { OrbitalRing } from '../components/OrbitalRing';
import { SidePanel } from '../components/SidePanel';
import { useIsMounted } from '../hooks/useIsMounted';

const ACCENT_HEX = ['#00ff88', '#818cf8', '#f59e0b', '#22d3ee', '#f97316', '#f472b6'];

type GoalForm = {
  name: string;
  targetAmount: string;
  targetDate: string;
  color: string;
};

const emptyForm: GoalForm = { name: '', targetAmount: '', targetDate: '', color: '#00ff88' };

function formatCurrency(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

interface GoalsPageProps {
  onDataChanged: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export function GoalsPage({ onDataChanged, showToast }: GoalsPageProps) {
  const isMounted = useIsMounted();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [selected, setSelected] = useState<Goal | null>(null);
  const [form, setForm] = useState<GoalForm | null>(null);
  const [contributeAmount, setContributeAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [contributing, setContributing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Key to force OrbitalRing remount for animation replay
  const [ringKey, setRingKey] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getGoals();
      if (!isMounted()) return;
      setGoals(data);
      // If a goal is selected, update it with fresh data
      setSelected(prev => {
        if (!prev) return null;
        return data.find(g => g.id === prev.id) ?? null;
      });
      setError(null);
    } catch (err) {
      if (!isMounted()) return;
      setError((err as Error).message);
    } finally {
      if (isMounted()) setLoading(false);
    }
  }, [isMounted]);

  useEffect(() => { void load(); }, [load]);

  const openCreate = () => {
    setSelected(null);
    setForm(emptyForm);
    setContributeAmount('');
    setRingKey(prev => prev + 1);
  };

  const openEdit = (goal: Goal) => {
    setSelected(goal);
    setForm({
      name: goal.name,
      targetAmount: goal.targetAmount.toString(),
      targetDate: goal.targetDate ? goal.targetDate.slice(0, 10) : '',
      color: goal.color ?? '#00ff88',
    });
    setContributeAmount('');
    setRingKey(prev => prev + 1);
  };

  const closePanel = () => {
    setForm(null);
    setSelected(null);
    setContributeAmount('');
    setError(null);
  };

  const handleSubmit = async () => {
    if (!form || !form.name.trim()) return;
    const target = parseFloat(form.targetAmount.replace(',', '.'));
    if (isNaN(target) || target <= 0) {
      setError('Enter a valid target amount');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        targetAmount: target,
        targetDate: form.targetDate || null,
        color: form.color || null,
      };
      if (selected) {
        await api.updateGoal(selected.id, payload);
      } else {
        await api.createGoal(payload);
      }
      closePanel();
      onDataChanged();
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
    if (!window.confirm(`Delete goal "${selected.name}"?`)) return;
    setError(null);
    setSaving(true);
    try {
      await api.deleteGoal(selected.id);
      closePanel();
      onDataChanged();
      void load();
    } catch (err) {
      if (!isMounted()) return;
      setError((err as Error).message);
    } finally {
      if (isMounted()) setSaving(false);
    }
  };

  const handleContribute = async () => {
    if (!selected) return;
    const amount = parseFloat(contributeAmount.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) {
      setError('Enter a valid contribution amount');
      return;
    }
    setError(null);
    setContributing(true);
    try {
      await api.contributeToGoal(selected.id, amount);
      setContributeAmount('');
      showToast(`+${formatCurrency(amount)} contributed`, 'success');
      setRingKey(prev => prev + 1);
      onDataChanged();
      void load();
    } catch (err) {
      if (!isMounted()) return;
      setError((err as Error).message);
    } finally {
      if (isMounted()) setContributing(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-neon-text">Goals</h1>
          <p className="text-[11px] text-neon-text-muted mt-0.5">Track progress toward savings targets</p>
        </div>
        <button
          onClick={openCreate}
          disabled={loading || saving}
          className="flex h-8 w-8 items-center justify-center rounded-lg
                     bg-neon-green/10 border border-neon-green/20
                     text-neon-green text-lg font-bold
                     hover:bg-neon-green/20 transition-colors
                     disabled:opacity-40 disabled:cursor-not-allowed"
        >
          +
        </button>
      </div>

      {/* Error banner */}
      {error && !form && (
        <div className="rounded-lg border border-neon-red/20 bg-neon-red/5 px-4 py-2.5 text-xs text-neon-red">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <p className="text-xs text-neon-text-muted py-8 text-center">Loading goals...</p>
      )}

      {/* Empty state */}
      {!loading && goals.length === 0 && (
        <EmptyState message="No goals yet" actionLabel="Create your first goal" onAction={openCreate} />
      )}

      {/* Goal list - horizontal strips */}
      {!loading && goals.length > 0 && (
        <div className="flex flex-col">
          {goals.map((goal, i) => {
            const accent = goal.color ?? ACCENT_HEX[i % ACCENT_HEX.length];
            const progress = goal.targetAmount > 0
              ? Math.min(goal.currentAmount / goal.targetAmount, 1)
              : 0;
            const pctLabel = `${Math.round(progress * 100)}%`;
            const isActive = selected?.id === goal.id;

            return (
              <button
                key={goal.id}
                onClick={() => openEdit(goal)}
                className={`group flex items-center gap-4 px-4 py-3.5
                           border-l-2 text-left transition-all
                           ${isActive
                             ? 'bg-[rgba(255,255,255,0.04)]'
                             : 'border-l-transparent hover:bg-[rgba(255,255,255,0.02)]'
                           }`}
                style={{ borderLeftColor: isActive ? accent : undefined }}
              >
                {/* OrbitalRing */}
                <div className="shrink-0">
                  <OrbitalRing
                    value={progress}
                    size={44}
                    color={accent}
                    strokeWidth={3}
                    label={pctLabel}
                  />
                </div>

                {/* Name + amounts */}
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-sm font-medium text-neon-text truncate">{goal.name}</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[11px] font-semibold" style={{ color: accent }}>
                      {formatCurrency(goal.currentAmount)}
                    </span>
                    <span className="text-[10px] text-neon-text-muted">/</span>
                    <span className="text-[11px] text-neon-text-secondary">
                      {formatCurrency(goal.targetAmount)}
                    </span>
                  </div>
                </div>

                {/* Target date */}
                {goal.targetDate && (
                  <span className="text-[10px] text-neon-text-muted shrink-0">
                    {goal.targetDate.slice(0, 10)}
                  </span>
                )}

                {/* Hover indicator */}
                <span className="text-[10px] text-neon-text-muted opacity-0 group-hover:opacity-60 transition-opacity shrink-0">
                  edit
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Side Panel */}
      <SidePanel open={form !== null} onClose={closePanel}>
        {form && (
          <div className="flex flex-col gap-5">
            {/* Panel title */}
            <h2 className="text-sm font-semibold text-neon-text">
              {selected ? 'Edit goal' : 'New goal'}
            </h2>

            {/* Error inside panel */}
            {error && (
              <div className="rounded-lg border border-neon-red/20 bg-neon-red/5 px-3 py-2 text-xs text-neon-red">
                {error}
              </div>
            )}

            {/* Large OrbitalRing (only for existing goals) */}
            {selected && (() => {
              const accent = selected.color ?? '#00ff88';
              const progress = selected.targetAmount > 0
                ? Math.min(selected.currentAmount / selected.targetAmount, 1)
                : 0;
              const pctLabel = `${Math.round(progress * 100)}%`;
              const remaining = Math.max(selected.targetAmount - selected.currentAmount, 0);

              return (
                <div className="flex flex-col items-center gap-3">
                  <OrbitalRing
                    key={ringKey}
                    value={progress}
                    size={80}
                    color={accent}
                    strokeWidth={4}
                    label={pctLabel}
                  />
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-base font-semibold" style={{ color: accent }}>
                      {formatCurrency(selected.currentAmount)}
                    </span>
                    <span className="text-xs text-neon-text-muted">of</span>
                    <span className="text-sm text-neon-text-secondary">
                      {formatCurrency(selected.targetAmount)}
                    </span>
                  </div>

                  {/* Projection */}
                  {selected.targetDate && (() => {
                    const days = daysUntil(selected.targetDate.slice(0, 10));
                    return (
                      <p className="text-[10px] text-neon-text-muted text-center">
                        {formatCurrency(remaining)} remaining
                        {days > 0 ? ` \u00B7 ${days} day${days !== 1 ? 's' : ''} left` : ''}
                        {days <= 0 ? ' \u00B7 past due' : ''}
                      </p>
                    );
                  })()}
                </div>
              );
            })()}

            {/* Contribute section (only for existing goals) */}
            {selected && (
              <div className="flex flex-col gap-1.5 rounded-lg border border-neon-border bg-neon-elevated/50 p-3">
                <label className="text-[9px] uppercase tracking-[2px] text-neon-text-muted">Contribute</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={contributeAmount}
                    onChange={(e) => setContributeAmount(e.target.value)}
                    placeholder="0.00"
                    autoComplete="off"
                    className="flex-1 rounded-md border border-neon-border bg-neon-bg px-3 py-1.5
                               text-sm text-neon-text placeholder:text-neon-text-muted/40
                               focus:border-neon-border-active focus:outline-none transition-colors"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void handleContribute();
                    }}
                  />
                  <button
                    onClick={() => void handleContribute()}
                    disabled={contributing || !contributeAmount.trim()}
                    className="rounded-md bg-neon-green/10 border border-neon-green/20
                               px-3 py-1.5 text-xs font-medium text-neon-green
                               hover:bg-neon-green/20 transition-colors
                               disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {contributing ? '...' : 'Add'}
                  </button>
                </div>
              </div>
            )}

            {/* Separator */}
            {selected && (
              <div className="border-t border-neon-border" />
            )}

            {/* Edit fields */}
            <div className="flex flex-col gap-4">
              {/* Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] uppercase tracking-[2px] text-neon-text-muted">Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm(prev => prev ? { ...prev, name: e.target.value } : prev)}
                  placeholder="e.g. Emergency fund"
                  className="w-full rounded-md border border-neon-border bg-neon-elevated px-3 py-2
                             text-sm text-neon-text placeholder:text-neon-text-muted/40
                             focus:border-neon-border-active focus:outline-none transition-colors"
                />
              </div>

              {/* Target amount */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] uppercase tracking-[2px] text-neon-text-muted">Target Amount</label>
                <input
                  type="text"
                  value={form.targetAmount}
                  onChange={(e) => setForm(prev => prev ? { ...prev, targetAmount: e.target.value } : prev)}
                  placeholder="10000"
                  autoComplete="off"
                  className="w-full rounded-md border border-neon-border bg-neon-elevated px-3 py-2
                             text-sm text-neon-text placeholder:text-neon-text-muted/40
                             focus:border-neon-border-active focus:outline-none transition-colors"
                />
              </div>

              {/* Target date */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] uppercase tracking-[2px] text-neon-text-muted">Target Date</label>
                <input
                  type="date"
                  value={form.targetDate}
                  onChange={(e) => setForm(prev => prev ? { ...prev, targetDate: e.target.value } : prev)}
                  className="w-full rounded-md border border-neon-border bg-neon-elevated px-3 py-2
                             text-sm text-neon-text
                             focus:border-neon-border-active focus:outline-none transition-colors"
                />
              </div>

              {/* Color picker */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] uppercase tracking-[2px] text-neon-text-muted">Color</label>
                <div className="flex items-center gap-2.5">
                  <input
                    type="color"
                    value={form.color || '#00ff88'}
                    onChange={(e) => setForm(prev => prev ? { ...prev, color: e.target.value } : prev)}
                    className="h-9 w-9 cursor-pointer rounded border-0 bg-transparent p-0"
                  />
                  <input
                    value={form.color}
                    onChange={(e) => setForm(prev => prev ? { ...prev, color: e.target.value } : prev)}
                    placeholder="#00ff88"
                    className="flex-1 rounded-md border border-neon-border bg-neon-elevated px-3 py-2
                               text-sm text-neon-text font-mono placeholder:text-neon-text-muted/40
                               focus:border-neon-border-active focus:outline-none transition-colors"
                  />
                </div>
                {/* Preset swatches */}
                <div className="flex gap-1.5 mt-1">
                  {ACCENT_HEX.map((hex) => (
                    <button
                      key={hex}
                      onClick={() => setForm(prev => prev ? { ...prev, color: hex } : prev)}
                      className={`h-5 w-5 rounded-full transition-transform hover:scale-125
                                 ${form.color === hex ? 'ring-2 ring-white/30 scale-110' : 'ring-1 ring-white/10'}`}
                      style={{ background: hex }}
                      title={hex}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 mt-2">
              <button
                onClick={() => void handleSubmit()}
                disabled={saving || !form.name.trim()}
                className="w-full rounded-md bg-neon-green/10 border border-neon-green/20
                           px-4 py-2 text-xs font-medium text-neon-green
                           hover:bg-neon-green/20 transition-colors
                           disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              {selected && (
                <button
                  onClick={() => void handleDelete()}
                  disabled={saving}
                  className="w-full rounded-md bg-neon-red/5 border border-neon-red/15
                             px-4 py-2 text-xs font-medium text-neon-red
                             hover:bg-neon-red/10 transition-colors
                             disabled:opacity-40 disabled:cursor-not-allowed"
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
