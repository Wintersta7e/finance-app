import { useRef, useState } from 'react';
import { api } from '../api/client';
import type { ImportResult } from '../api/types';
import { PillChip } from '../components/PillChip';

/* ─── helpers ─────────────────────────────────────────────────────── */

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 200);
}

function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

const ENTITY_LABELS: Record<string, string> = {
  accounts: 'Accounts',
  categories: 'Categories',
  transactions: 'Transactions',
  recurringRules: 'Recurring Rules',
  budgets: 'Budgets',
  tags: 'Tags',
  payees: 'Payees',
  goals: 'Goals',
};

/* ─── component ───────────────────────────────────────────────────── */

export function ExportImportPage() {
  const [exportingJson, setExportingJson] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('merge');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleExportJson = async () => {
    setExportingJson(true);
    setError(null);
    try {
      const blob = await api.exportJson();
      downloadBlob(blob, `finance-export-${todayStamp()}.json`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setExportingJson(false);
    }
  };

  const handleExportCsv = async () => {
    setExportingCsv(true);
    setError(null);
    try {
      const blob = await api.exportCsv();
      downloadBlob(blob, `transactions-${todayStamp()}.csv`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setExportingCsv(false);
    }
  };

  const handleImport = async (file: File) => {
    setImporting(true);
    setError(null);
    setImportResult(null);
    try {
      const result = await api.importJson(file, importMode);
      setImportResult(result);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setImporting(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleImport(file);
    e.target.value = '';
  };

  const totalImported = importResult
    ? Object.values(importResult.imported).reduce((sum, n) => sum + n, 0)
    : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="text-[9px] uppercase tracking-[2px] text-neon-text-muted mb-1.5">
          Data Management
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-neon-text">
          Export / Import
        </h1>
        <p className="mt-1 text-xs text-neon-text-muted">
          Back up your data or restore from a previous export
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="border-l-[3px] border-neon-red bg-neon-red/5 py-2.5 pl-4 pr-3">
          <p className="text-xs text-neon-red">{error}</p>
        </div>
      )}

      {/* ── Export Section ────────────────────────────────────────── */}
      <div>
        <div className="text-[9px] uppercase tracking-[2px] text-neon-text-muted mb-4">
          Export
        </div>

        <div className="space-y-2">
          {/* JSON export strip */}
          <button
            onClick={() => void handleExportJson()}
            disabled={exportingJson}
            className="group flex w-full items-center gap-4 border-l-[3px] border-neon-green/30
                       bg-neon-elevated/40 hover:bg-neon-elevated py-3.5 pl-4 pr-4
                       transition-colors disabled:opacity-50"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-md
                            bg-neon-green/10 text-neon-green text-sm font-bold
                            group-hover:bg-neon-green/15 transition-colors">
              {}
            </div>
            <div className="text-left flex-1">
              <div className="text-sm font-medium text-neon-text">
                {exportingJson ? 'Exporting...' : 'Full Backup (JSON)'}
              </div>
              <div className="text-[10px] text-neon-text-faint mt-0.5">
                All accounts, transactions, categories, budgets, tags, payees, and goals
              </div>
            </div>
            <svg className="h-4 w-4 text-neon-text-muted group-hover:text-neon-green transition-colors"
                 fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>

          {/* CSV export strip */}
          <button
            onClick={() => void handleExportCsv()}
            disabled={exportingCsv}
            className="group flex w-full items-center gap-4 border-l-[3px] border-neon-indigo/30
                       bg-neon-elevated/40 hover:bg-neon-elevated py-3.5 pl-4 pr-4
                       transition-colors disabled:opacity-50"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-md
                            bg-neon-indigo/10 text-neon-indigo text-sm font-bold
                            group-hover:bg-neon-indigo/15 transition-colors">
              ,,
            </div>
            <div className="text-left flex-1">
              <div className="text-sm font-medium text-neon-text">
                {exportingCsv ? 'Exporting...' : 'Transactions (CSV)'}
              </div>
              <div className="text-[10px] text-neon-text-faint mt-0.5">
                Spreadsheet-compatible export of all transactions
              </div>
            </div>
            <svg className="h-4 w-4 text-neon-text-muted group-hover:text-neon-indigo transition-colors"
                 fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Import Section ────────────────────────────────────────── */}
      <div>
        <div className="text-[9px] uppercase tracking-[2px] text-neon-text-muted mb-4">
          Import
        </div>

        {/* Mode toggle pills */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[10px] uppercase tracking-[1px] text-neon-text-faint mr-1">
            Mode:
          </span>
          <button
            onClick={() => setImportMode('merge')}
            className={`rounded-full px-3.5 py-1 text-[10px] font-medium border transition-colors ${
              importMode === 'merge'
                ? 'bg-neon-green/10 border-neon-green/20 text-neon-green'
                : 'bg-transparent border-neon-border text-neon-text-muted hover:border-neon-border-active'
            }`}
          >
            Merge
          </button>
          <button
            onClick={() => setImportMode('replace')}
            className={`rounded-full px-3.5 py-1 text-[10px] font-medium border transition-colors ${
              importMode === 'replace'
                ? 'bg-neon-red/10 border-neon-red/20 text-neon-red'
                : 'bg-transparent border-neon-border text-neon-text-muted hover:border-neon-border-active'
            }`}
          >
            Replace
          </button>
        </div>

        {/* Replace mode warning */}
        {importMode === 'replace' && (
          <div className="border-l-[3px] border-neon-red bg-neon-red/5 py-2.5 pl-4 pr-3 mb-4">
            <p className="text-xs font-medium text-neon-red">
              Replace mode will delete all existing data before importing.
            </p>
          </div>
        )}

        {/* File input trigger */}
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          onChange={onFileChange}
          disabled={importing}
          className="hidden"
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={importing}
          className="group flex w-full items-center gap-4 border-l-[3px] border-neon-amber/30
                     bg-neon-elevated/40 hover:bg-neon-elevated py-3.5 pl-4 pr-4
                     transition-colors disabled:opacity-50"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-md
                          bg-neon-amber/10 text-neon-amber text-sm font-bold
                          group-hover:bg-neon-amber/15 transition-colors">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </div>
          <div className="text-left flex-1">
            <div className="text-sm font-medium text-neon-text">
              {importing ? 'Importing...' : 'Choose JSON File'}
            </div>
            <div className="text-[10px] text-neon-text-faint mt-0.5">
              Select a previously exported .json backup (max 50 MB)
            </div>
          </div>
        </button>
      </div>

      {/* ── Import Result ─────────────────────────────────────────── */}
      {importResult && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="text-[9px] uppercase tracking-[2px] text-neon-text-muted">
              Import Result
            </div>
            <PillChip
              label={`${totalImported} total`}
              color="var(--color-neon-green)"
            />
          </div>

          <div className="space-y-1">
            {Object.entries(importResult.imported).map(([key, count]) => (
              <div
                key={key}
                className="flex items-center justify-between border-l-[3px] py-2 pl-4 pr-4
                           bg-neon-elevated/40"
                style={{
                  borderLeftColor: count > 0
                    ? 'var(--color-neon-green)'
                    : 'var(--color-neon-border)',
                  opacity: count > 0 ? 1 : 0.5,
                }}
              >
                <span className="text-xs text-neon-text-secondary">
                  {ENTITY_LABELS[key] ?? key}
                </span>
                <span className={`text-xs font-semibold ${
                  count > 0 ? 'text-neon-green' : 'text-neon-text-faint'
                }`}>
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
