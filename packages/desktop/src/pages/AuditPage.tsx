import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import type { AuditEntry } from '../api/types';
import { PillChip } from '../components/PillChip';
import { EmptyState } from '../components/EmptyState';

/* ─── constants ───────────────────────────────────────────────────── */

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'var(--color-neon-green)',
  UPDATE: 'var(--color-neon-amber)',
  DELETE: 'var(--color-neon-red)',
};

const ACTION_DOT_CLASS: Record<string, string> = {
  CREATE: 'bg-neon-green shadow-[0_0_6px_var(--color-neon-green)]',
  UPDATE: 'bg-neon-amber shadow-[0_0_6px_var(--color-neon-amber)]',
  DELETE: 'bg-neon-red shadow-[0_0_6px_var(--color-neon-red)]',
};

const ACTION_FILTERS = ['All', 'Created', 'Updated', 'Deleted'] as const;
type ActionFilter = (typeof ACTION_FILTERS)[number];

const ACTION_FILTER_MAP: Record<ActionFilter, string | null> = {
  All: null,
  Created: 'CREATE',
  Updated: 'UPDATE',
  Deleted: 'DELETE',
};

const PAGE_SIZE = 50;

/* ─── helpers ─────────────────────────────────────────────────────── */

function dateGroupLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffMs = today.getTime() - target.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function groupEntriesByDate(entries: AuditEntry[]): [string, AuditEntry[]][] {
  const map = new Map<string, AuditEntry[]>();
  for (const entry of entries) {
    const key = entry.timestamp.slice(0, 10);
    const arr = map.get(key);
    if (arr) arr.push(entry);
    else map.set(key, [entry]);
  }
  return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
}

/* ─── sub-components ──────────────────────────────────────────────── */

function ChangesBlock({ changes }: { changes: string | null }) {
  const [expanded, setExpanded] = useState(false);

  const parsed = useMemo(() => {
    if (!changes) return null;
    try {
      const result = JSON.parse(changes);
      if (typeof result !== 'object' || result === null || Array.isArray(result)) return null;
      return result as Record<string, { from: unknown; to: unknown }>;
    } catch {
      return null;
    }
  }, [changes]);

  if (!parsed) return null;

  const entries = Object.entries(parsed);
  if (entries.length === 0) return null;

  return (
    <div className="mt-1.5">
      <button
        type="button"
        onClick={() => setExpanded(prev => !prev)}
        className="text-[10px] text-neon-text-muted hover:text-neon-text-secondary transition-colors"
      >
        {expanded ? 'Hide changes' : `${entries.length} field${entries.length > 1 ? 's' : ''} changed`}
      </button>
      {expanded && (
        <div className="mt-1.5 space-y-0.5 rounded-md bg-neon-bg/60 border border-neon-border px-3 py-2">
          {entries.map(([field, { from, to }]) => (
            <div key={field} className="flex items-baseline gap-2 text-[11px]">
              <span className="font-medium text-neon-text-secondary">{field}:</span>
              <span className="text-neon-red line-through">{String(from)}</span>
              <span className="text-neon-text-faint">&rarr;</span>
              <span className="text-neon-green">{String(to)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── main component ──────────────────────────────────────────────── */

export function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [actionFilter, setActionFilter] = useState<ActionFilter>('All');
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setEntries(await api.getRecentAudit(limit));
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    void load();
  }, [load]);

  // Derive entity types from data
  const entityTypes = useMemo(() => {
    const set = new Set(entries.map((e) => e.entityType));
    return [...set].sort();
  }, [entries]);

  // Apply client-side filters
  const filtered = useMemo(() => {
    let result = entries;
    const actionVal = ACTION_FILTER_MAP[actionFilter];
    if (actionVal) {
      result = result.filter((e) => e.action === actionVal);
    }
    if (entityTypeFilter) {
      result = result.filter((e) => e.entityType === entityTypeFilter);
    }
    return result;
  }, [entries, actionFilter, entityTypeFilter]);

  const grouped = useMemo(() => groupEntriesByDate(filtered), [filtered]);

  const handleLoadMore = () => {
    setLimit(prev => prev + PAGE_SIZE);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="text-[9px] uppercase tracking-[2px] text-neon-text-muted mb-1.5">
          Activity
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-neon-text">
          Audit Log
        </h1>
        <p className="mt-1 text-xs text-neon-text-muted">
          Recent changes across all entities
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="border-l-[3px] border-neon-red bg-neon-red/5 py-2.5 pl-4 pr-3">
          <p className="text-xs text-neon-red">{error}</p>
        </div>
      )}

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Action filter pills */}
        <div className="flex items-center gap-1.5">
          {ACTION_FILTERS.map((filter) => {
            const active = actionFilter === filter;
            const actionKey = ACTION_FILTER_MAP[filter];
            const color = actionKey ? ACTION_COLORS[actionKey] : undefined;
            return (
              <button
                key={filter}
                onClick={() => setActionFilter(filter)}
                className={`rounded-full px-3 py-1 text-[10px] font-medium border transition-colors ${
                  active
                    ? 'border-current'
                    : 'bg-transparent border-neon-border text-neon-text-muted hover:border-neon-border-active'
                }`}
                style={active && color ? { color, borderColor: color, background: `color-mix(in srgb, ${color} 10%, transparent)` } : active ? { color: 'var(--color-neon-text)', borderColor: 'var(--color-neon-border-active)', background: 'var(--color-neon-elevated)' } : undefined}
              >
                {filter}
              </button>
            );
          })}
        </div>

        {/* Entity type dropdown */}
        <select
          value={entityTypeFilter}
          onChange={(e) => setEntityTypeFilter(e.target.value)}
          className="bg-neon-elevated border border-neon-border-active rounded-md px-2.5 py-1
                     text-[10px] text-neon-text-secondary focus:outline-none focus:border-neon-green/30"
        >
          <option value="">All entity types</option>
          {entityTypes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        {/* Count indicator */}
        {!loading && (
          <span className="text-[10px] text-neon-text-faint ml-auto">
            {filtered.length} entries
          </span>
        )}
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3 pl-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded bg-neon-elevated" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <EmptyState message="No audit entries found" />
      )}

      {/* ── Timeline ──────────────────────────────────────────────── */}
      {!loading && grouped.length > 0 && (
        <div className="space-y-6">
          {grouped.map(([dateKey, dateEntries]) => (
            <div key={dateKey}>
              {/* Date label */}
              <div className="text-[10px] uppercase tracking-[1.5px] text-neon-text-faint mb-3 pl-7">
                {dateGroupLabel(dateKey)}
              </div>

              {/* Timeline entries */}
              <div className="relative">
                {/* Connecting line */}
                <div className="absolute left-[7px] top-3 bottom-3 w-px bg-neon-border" />

                <div className="space-y-0.5">
                  {dateEntries.map((entry) => (
                    <div key={entry.id} className="relative flex items-start gap-4 py-2 pl-0">
                      {/* Dot */}
                      <div className="relative z-10 mt-1.5 flex-shrink-0">
                        <div
                          className={`h-[14px] w-[14px] rounded-full border-2 border-neon-bg ${
                            ACTION_DOT_CLASS[entry.action] ?? 'bg-neon-text-muted'
                          }`}
                        />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <PillChip
                            label={entry.action}
                            color={ACTION_COLORS[entry.action] ?? 'var(--color-neon-text-muted)'}
                          />
                          <span className="text-xs font-medium text-neon-text-secondary">
                            {entry.entityType}
                          </span>
                          <span className="text-[10px] font-mono text-neon-text-faint">
                            #{entry.entityId}
                          </span>
                          <span className="text-[10px] text-neon-text-faint ml-auto">
                            {formatTime(entry.timestamp)}
                          </span>
                        </div>

                        <ChangesBlock changes={entry.changes} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}

          {/* Load more */}
          {entries.length >= limit && (
            <div className="flex justify-center pt-2">
              <button
                onClick={handleLoadMore}
                className="rounded-md bg-neon-elevated border border-neon-border-active
                           px-5 py-2 text-xs text-neon-text-secondary
                           hover:text-neon-text hover:border-neon-green/20
                           transition-colors"
              >
                Load more
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
