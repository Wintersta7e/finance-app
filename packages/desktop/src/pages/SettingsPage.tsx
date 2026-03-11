import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import type { AppSettings } from '../api/types';
import { useIsMounted } from '../hooks/useIsMounted';

interface SettingsPageProps {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface SettingsForm {
  currencyCode: string;
  firstDayOfMonth: number;
  firstDayOfWeek: number;
}

export function SettingsPage({ showToast }: SettingsPageProps) {
  const isMounted = useIsMounted();
  const [form, setForm] = useState<SettingsForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const settings: AppSettings = await api.getSettings();
      if (!isMounted()) return;
      setForm({
        currencyCode: settings.currencyCode,
        firstDayOfMonth: settings.firstDayOfMonth,
        firstDayOfWeek: settings.firstDayOfWeek,
      });
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

  const handleSave = async () => {
    if (!form) return;
    setError(null);
    setSaving(true);
    try {
      await api.updateSettings({
        currencyCode: form.currencyCode,
        firstDayOfMonth: form.firstDayOfMonth,
        firstDayOfWeek: form.firstDayOfWeek,
      });
      if (!isMounted()) return;
      showToast('Settings saved', 'success');
    } catch {
      if (!isMounted()) return;
      showToast('Failed to save settings', 'error');
    } finally {
      if (isMounted()) setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="text-[9px] uppercase tracking-[2px] text-neon-text-muted mb-1.5">
          Configuration
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-neon-text">
          Settings
        </h1>
        <p className="mt-1 text-xs text-neon-text-muted">
          Customize how your finances are displayed
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="border-l-[3px] border-neon-red bg-neon-red/5 py-2.5 pl-4 pr-3">
          <p className="text-xs text-neon-red">{error}</p>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-6">
          <div className="h-5 w-24 animate-pulse rounded bg-neon-elevated" />
          <div className="h-10 w-64 animate-pulse rounded bg-neon-elevated" />
          <div className="h-5 w-32 animate-pulse rounded bg-neon-elevated" />
          <div className="h-10 w-64 animate-pulse rounded bg-neon-elevated" />
          <div className="h-5 w-28 animate-pulse rounded bg-neon-elevated" />
          <div className="h-10 w-64 animate-pulse rounded bg-neon-elevated" />
        </div>
      )}

      {/* Form */}
      {!loading && form && (
        <div className="space-y-8 max-w-md">
          {/* Currency Code */}
          <div className="border-l-[3px] border-neon-green/30 pl-4">
            <label className="text-[9px] uppercase tracking-[2px] text-neon-text-muted block mb-2">
              Currency Code
            </label>
            <input
              type="text"
              value={form.currencyCode}
              onChange={(e) =>
                setForm(prev => prev ? { ...prev, currencyCode: e.target.value.toUpperCase() } : prev)
              }
              maxLength={5}
              placeholder="USD"
              className="bg-neon-elevated border border-neon-border-active rounded-md px-3 py-2
                         text-sm text-neon-text focus:outline-none focus:border-neon-green/30
                         w-28 uppercase tracking-wider font-medium"
            />
            <p className="mt-1.5 text-[10px] text-neon-text-faint">
              ISO 4217 code (e.g. USD, EUR, GBP)
            </p>
          </div>

          {/* First Day of Month */}
          <div className="border-l-[3px] border-neon-indigo/30 pl-4">
            <label className="text-[9px] uppercase tracking-[2px] text-neon-text-muted block mb-2">
              First Day of Month
            </label>
            <input
              type="number"
              min={1}
              max={28}
              value={form.firstDayOfMonth}
              onChange={(e) => {
                const val = Math.max(1, Math.min(28, Number(e.target.value) || 1));
                setForm(prev => prev ? { ...prev, firstDayOfMonth: val } : prev);
              }}
              className="bg-neon-elevated border border-neon-border-active rounded-md px-3 py-2
                         text-sm text-neon-text focus:outline-none focus:border-neon-green/30
                         w-20 font-medium"
            />
            <p className="mt-1.5 text-[10px] text-neon-text-faint">
              When your monthly budget cycle begins (1-28)
            </p>
          </div>

          {/* First Day of Week */}
          <div className="border-l-[3px] border-neon-amber/30 pl-4">
            <label className="text-[9px] uppercase tracking-[2px] text-neon-text-muted block mb-2">
              First Day of Week
            </label>
            <select
              value={form.firstDayOfWeek}
              onChange={(e) =>
                setForm(prev => prev ? { ...prev, firstDayOfWeek: Number(e.target.value) } : prev)
              }
              className="bg-neon-elevated border border-neon-border-active rounded-md px-3 py-2
                         text-sm text-neon-text focus:outline-none focus:border-neon-green/30
                         w-44"
            >
              {DAY_NAMES.map((name, i) => (
                <option key={i} value={i}>{name}</option>
              ))}
            </select>
            <p className="mt-1.5 text-[10px] text-neon-text-faint">
              Starting day for weekly views
            </p>
          </div>

          {/* Save button */}
          <div className="pt-2">
            <button
              onClick={() => void handleSave()}
              disabled={saving}
              className="rounded-md bg-neon-green/10 border border-neon-green/15
                         px-6 py-2.5 text-xs font-medium text-neon-green
                         hover:bg-neon-green/15 transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
