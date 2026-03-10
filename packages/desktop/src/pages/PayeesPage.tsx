import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Payee } from '../api/types';
import { EmptyState } from '../components/EmptyState';
import { SidePanel } from '../components/SidePanel';

const ACCENT_HEX = ['#00ff88', '#818cf8', '#f59e0b', '#22d3ee', '#f97316', '#f472b6'];

type PayeeForm = { name: string; notes: string };

export function PayeesPage() {
  const [payees, setPayees] = useState<Payee[]>([]);
  const [selected, setSelected] = useState<Payee | null>(null);
  const [form, setForm] = useState<PayeeForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setPayees(await api.getPayees());
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const openCreate = () => {
    setSelected(null);
    setForm({ name: '', notes: '' });
  };

  const openEdit = (payee: Payee) => {
    setSelected(payee);
    setForm({ name: payee.name, notes: payee.notes ?? '' });
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
      const payload = { name: form.name, notes: form.notes.trim() || null };
      if (selected) {
        await api.updatePayee(selected.id, payload);
      } else {
        await api.createPayee(payload);
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
    if (!window.confirm(`Delete payee "${selected.name}"?`)) return;
    setError(null);
    setSaving(true);
    try {
      await api.deletePayee(selected.id);
      closePanel();
      void load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-neon-text">Payees</h1>
          <p className="text-[11px] text-neon-text-muted mt-0.5">Manage merchants and recipients</p>
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
        <p className="text-xs text-neon-text-muted py-8 text-center">Loading payees...</p>
      )}

      {/* Empty state */}
      {!loading && payees.length === 0 && (
        <EmptyState message="No payees yet" actionLabel="Add your first payee" onAction={openCreate} />
      )}

      {/* Payee list - horizontal strips */}
      {!loading && payees.length > 0 && (
        <div className="flex flex-col">
          {payees.map((payee, i) => {
            const accent = ACCENT_HEX[i % ACCENT_HEX.length];
            const isActive = selected?.id === payee.id;
            const truncatedNotes = payee.notes
              ? payee.notes.length > 60
                ? payee.notes.slice(0, 60) + '...'
                : payee.notes
              : null;

            return (
              <button
                key={payee.id}
                onClick={() => openEdit(payee)}
                className={`group flex items-center gap-3 px-4 py-3
                           border-l-2 text-left transition-all
                           ${isActive
                             ? 'bg-[rgba(255,255,255,0.04)]'
                             : 'border-l-transparent hover:bg-[rgba(255,255,255,0.02)]'
                           }`}
                style={{ borderLeftColor: isActive ? accent : undefined }}
              >
                {/* Initials circle */}
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center
                             rounded-full text-[10px] font-bold"
                  style={{
                    background: `color-mix(in srgb, ${accent} 12%, transparent)`,
                    color: accent,
                  }}
                >
                  {payee.name.slice(0, 2).toUpperCase()}
                </span>

                {/* Name + notes preview */}
                <div className="flex flex-col min-w-0">
                  <span className="text-sm text-neon-text truncate">{payee.name}</span>
                  {truncatedNotes && (
                    <span className="text-[11px] text-neon-text-muted truncate">{truncatedNotes}</span>
                  )}
                </div>

                {/* Hover indicator */}
                <span className="ml-auto text-[10px] text-neon-text-muted opacity-0 group-hover:opacity-60 transition-opacity shrink-0">
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
              {selected ? 'Edit payee' : 'New payee'}
            </h2>

            {/* Error inside panel */}
            {error && (
              <div className="rounded-lg border border-neon-red/20 bg-neon-red/5 px-3 py-2 text-xs text-neon-red">
                {error}
              </div>
            )}

            {/* Name input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] uppercase tracking-[2px] text-neon-text-muted">Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm(prev => prev ? { ...prev, name: e.target.value } : prev)}
                placeholder="e.g. Amazon, Landlord"
                className="w-full rounded-md border border-neon-border bg-neon-elevated px-3 py-2
                           text-sm text-neon-text placeholder:text-neon-text-muted/40
                           focus:border-neon-border-active focus:outline-none transition-colors"
              />
            </div>

            {/* Notes textarea */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] uppercase tracking-[2px] text-neon-text-muted">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm(prev => prev ? { ...prev, notes: e.target.value } : prev)}
                placeholder="Optional notes about this payee..."
                rows={4}
                className="w-full resize-y rounded-md border border-neon-border bg-neon-elevated px-3 py-2
                           text-sm text-neon-text placeholder:text-neon-text-muted/40
                           focus:border-neon-border-active focus:outline-none transition-colors"
              />
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
