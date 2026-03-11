import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Account } from '../api/types';
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

type AccountType = 'checking' | 'savings' | 'credit' | 'investment' | 'cash';
const ACCOUNT_TYPES: AccountType[] = ['checking', 'savings', 'credit', 'investment', 'cash'];

interface AccountForm {
  name: string;
  type: AccountType;
  initialBalance: string;
}

const emptyForm: AccountForm = { name: '', type: 'checking', initialBalance: '0' };

function accentForIndex(i: number): string {
  return ACCENT_COLORS[i % ACCENT_COLORS.length];
}

export function AccountsPage() {
  const isMounted = useIsMounted();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Account | null>(null);
  const [form, setForm] = useState<AccountForm | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getAccounts();
      if (!isMounted()) return;
      setAccounts(data);
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

  const openCreate = () => {
    setSelected(null);
    setForm(emptyForm);
  };

  const openEdit = (account: Account) => {
    setSelected(account);
    setForm({
      name: account.name,
      type: account.type as AccountType,
      initialBalance: String(account.initialBalance),
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
      const balance = parseFloat(form.initialBalance.replace(',', '.'));
      if (Number.isNaN(balance)) {
        setError('Enter a valid balance');
        return;
      }
      const payload = { name: form.name.trim(), type: form.type, initialBalance: balance };
      if (selected) {
        await api.updateAccount(selected.id, payload);
      } else {
        await api.createAccount(payload);
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
    if (!window.confirm(`Delete account "${selected.name}"?`)) return;
    setError(null);
    setSaving(true);
    try {
      await api.deleteAccount(selected.id);
      closePanel();
      void load();
    } catch (err) {
      if (!isMounted()) return;
      setError((err as Error).message);
    } finally {
      if (isMounted()) setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neon-text tracking-tight">Accounts</h1>
          <p className="mt-1 text-sm text-neon-text-secondary">Where your balances live</p>
        </div>
        <button
          onClick={openCreate}
          disabled={loading}
          className="flex h-8 w-8 items-center justify-center rounded-md
                     border border-neon-green/20 bg-neon-green/5 text-neon-green
                     hover:bg-neon-green/10 hover:shadow-glow-green-sm
                     transition-all duration-150 disabled:opacity-40"
          aria-label="Add account"
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
        <p className="text-sm text-neon-text-muted py-8 text-center">Loading accounts...</p>
      )}

      {/* Empty state */}
      {!loading && accounts.length === 0 && !error && (
        <EmptyState
          message="No accounts yet. Add your first account to get started."
          actionLabel="+ New Account"
          onAction={openCreate}
        />
      )}

      {/* Account strips */}
      {!loading && accounts.length > 0 && (
        <div className="space-y-1">
          {accounts.map((account, i) => {
            const accent = accentForIndex(i);
            const cssColor = ACCENT_CSS[accent];
            const isSelected = selected?.id === account.id;
            return (
              <button
                key={account.id}
                type="button"
                onClick={() => openEdit(account)}
                className={`group flex w-full items-center gap-4 rounded-md px-4 py-3
                           border transition-all duration-150 text-left
                           ${isSelected
                             ? 'border-neon-border-active bg-[rgba(255,255,255,0.03)]'
                             : 'border-transparent hover:border-neon-border hover:bg-[rgba(255,255,255,0.015)]'
                           }`}
              >
                {/* Left accent bar */}
                <div
                  className="h-10 w-[3px] rounded-full shrink-0"
                  style={{ background: cssColor }}
                />

                {/* Name + type */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-neon-text truncate">
                    {account.name}
                  </div>
                  <div className="mt-0.5">
                    <PillChip label={account.type} color={cssColor} />
                  </div>
                </div>

                {/* Balance */}
                <div className="text-right shrink-0">
                  <span className="text-[9px] uppercase tracking-[2px] text-neon-text-muted block">
                    Initial Balance
                  </span>
                  <span
                    className="text-lg font-semibold tabular-nums"
                    style={{ color: cssColor }}
                  >
                    {account.initialBalance.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Side panel */}
      <SidePanel open={form !== null} onClose={closePanel}>
        {form && (
          <div className="space-y-6">
            {/* Panel title */}
            <div>
              <h2 className="text-base font-semibold text-neon-text">
                {selected ? 'Edit Account' : 'New Account'}
              </h2>
              <p className="mt-0.5 text-xs text-neon-text-muted">
                {selected ? `Editing "${selected.name}"` : 'Create a new account'}
              </p>
            </div>

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
                placeholder="e.g. Main Checking"
                className="w-full"
                autoFocus
              />
            </div>

            {/* Type */}
            <div className="space-y-1.5">
              <label className="text-[9px] uppercase tracking-[2px] text-neon-text-muted block">
                Type
              </label>
              <select
                value={form.type}
                onChange={(e) => setForm(prev => prev ? { ...prev, type: e.target.value as AccountType } : prev)}
                className="w-full"
              >
                {ACCOUNT_TYPES.map(t => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>

            {/* Initial Balance */}
            <div className="space-y-1.5">
              <label className="text-[9px] uppercase tracking-[2px] text-neon-text-muted block">
                Initial Balance
              </label>
              <input
                type="text"
                value={form.initialBalance}
                onChange={(e) => setForm(prev => prev ? { ...prev, initialBalance: e.target.value } : prev)}
                placeholder="0.00"
                className="w-full"
              />
            </div>

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
                  {saving ? 'Deleting...' : 'Delete Account'}
                </button>
              )}
            </div>
          </div>
        )}
      </SidePanel>
    </div>
  );
}
