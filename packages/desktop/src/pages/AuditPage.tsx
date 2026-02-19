import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import type { AuditEntry } from '../api/types';
import { Card } from '../components/ui/Card';
import { Page } from '../components/ui/Page';
import { tokens } from '../theme';

const ACTION_COLORS: Record<string, string> = {
  CREATE: tokens.colors.success,
  UPDATE: tokens.colors.accent,
  DELETE: tokens.colors.danger,
};

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function ChangesCell({ changes }: { changes: string | null }) {
  const [expanded, setExpanded] = useState(false);
  if (!changes) return <span style={{ color: tokens.colors.textMuted }}>—</span>;

  let parsed: Record<string, { from: unknown; to: unknown }>;
  try {
    parsed = JSON.parse(changes);
  } catch {
    return <span style={{ color: tokens.colors.textMuted }}>—</span>;
  }

  const entries = Object.entries(parsed);
  if (entries.length === 0) return <span style={{ color: tokens.colors.textMuted }}>—</span>;

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        style={{
          background: 'none',
          border: 'none',
          color: tokens.colors.accent,
          cursor: 'pointer',
          fontWeight: 600,
          fontSize: '0.8rem',
          padding: 0,
        }}
      >
        {entries.length} field{entries.length > 1 ? 's' : ''} changed
      </button>
    );
  }

  return (
    <div style={{ fontSize: '0.8rem' }}>
      {entries.map(([field, { from, to }]) => (
        <div key={field} style={{ marginBottom: '0.15rem' }}>
          <span style={{ fontWeight: 600 }}>{field}:</span>{' '}
          <span style={{ color: tokens.colors.danger }}>{String(from)}</span>{' → '}
          <span style={{ color: tokens.colors.success }}>{String(to)}</span>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setExpanded(false)}
        style={{
          background: 'none',
          border: 'none',
          color: tokens.colors.textMuted,
          cursor: 'pointer',
          fontSize: '0.75rem',
          padding: 0,
          marginTop: '0.2rem',
        }}
      >
        collapse
      </button>
    </div>
  );
}

export function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [limit, setLimit] = useState(50);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => { void load(); }, [load]);

  return (
    <Page
      title="Audit Log"
      subtitle="Recent changes across all entities"
      actions={
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontWeight: 600, color: tokens.colors.textMuted, fontSize: '0.85rem' }}>Show:</label>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            style={{ width: 'auto' }}
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      }
    >
      <Card>
        {error && <span style={{ color: tokens.colors.danger }}>Error: {error}</span>}
        {loading && <span style={{ color: tokens.colors.textMuted }}>Loading audit log…</span>}
        {!loading && entries.length === 0 && <span style={{ color: tokens.colors.textMuted }}>No audit entries yet.</span>}

        {entries.length > 0 && (
          <div style={{ overflowX: 'auto', marginTop: '0.5rem' }}>
            <table style={{ minWidth: '720px' }}>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>ID</th>
                  <th>Changes</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                      {formatTimestamp(entry.timestamp)}
                    </td>
                    <td>
                      <span style={{
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        padding: '0.15rem 0.5rem',
                        borderRadius: tokens.radii.sm,
                        background: `${ACTION_COLORS[entry.action] || tokens.colors.textMuted}22`,
                        color: ACTION_COLORS[entry.action] || tokens.colors.textMuted,
                      }}>
                        {entry.action}
                      </span>
                    </td>
                    <td>{entry.entityType}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{entry.entityId}</td>
                    <td><ChangesCell changes={entry.changes} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </Page>
  );
}
