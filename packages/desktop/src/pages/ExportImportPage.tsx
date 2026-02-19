import { useState } from 'react';
import { api } from '../api/client';
import type { ImportResult } from '../api/types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Page } from '../components/ui/Page';
import { tokens } from '../theme';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ExportImportPage() {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('replace');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExportJson = async () => {
    setExporting(true);
    setError(null);
    try {
      const blob = await api.exportJson();
      downloadBlob(blob, `finance-export-${new Date().toISOString().slice(0, 10)}.json`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setExporting(false);
    }
  };

  const handleExportCsv = async () => {
    setExporting(true);
    setError(null);
    try {
      const blob = await api.exportCsv();
      downloadBlob(blob, `transactions-${new Date().toISOString().slice(0, 10)}.csv`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setExporting(false);
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
    if (file) handleImport(file);
    e.target.value = '';
  };

  return (
    <Page title="Export / Import" subtitle="Back up your data or restore from a previous export">
      {error && <Card><span style={{ color: tokens.colors.danger }}>Error: {error}</span></Card>}

      <Card title="Export" subtitle="Download your finance data">
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
          <Button onClick={handleExportJson} disabled={exporting}>
            {exporting ? 'Exporting…' : 'Export JSON'}
          </Button>
          <Button variant="ghost" onClick={handleExportCsv} disabled={exporting}>
            {exporting ? 'Exporting…' : 'Export CSV (transactions)'}
          </Button>
        </div>
      </Card>

      <Card title="Import" subtitle="Restore data from a JSON export file">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <label style={{ fontWeight: 600, color: tokens.colors.textMuted }}>Mode:</label>
            <select value={importMode} onChange={(e) => setImportMode(e.target.value as 'replace' | 'merge')}>
              <option value="replace">Replace (clear existing data)</option>
              <option value="merge">Merge (add to existing data)</option>
            </select>
          </div>

          {importMode === 'replace' && (
            <div style={{
              padding: '0.6rem 0.85rem',
              background: 'rgba(239,68,68,0.08)',
              border: `1px solid ${tokens.colors.danger}`,
              borderRadius: tokens.radii.md,
              color: tokens.colors.danger,
              fontSize: '0.85rem',
              fontWeight: 600,
            }}>
              Warning: Replace mode will delete all existing data before importing.
            </div>
          )}

          <div>
            <label style={{ display: 'inline-block', cursor: importing ? 'not-allowed' : 'pointer' }}>
              <input
                type="file"
                accept=".json,application/json"
                onChange={onFileChange}
                disabled={importing}
                style={{ display: 'none' }}
              />
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '0.65rem 0.95rem',
                borderRadius: tokens.radii.md,
                border: `1px solid ${tokens.colors.borderSoft}`,
                background: tokens.colors.accent,
                color: '#0b1220',
                fontWeight: 600,
                fontSize: '0.95rem',
                opacity: importing ? 0.65 : 1,
              }}>
                {importing ? 'Importing…' : 'Choose JSON file…'}
              </span>
            </label>
          </div>
        </div>

        {importResult && (
          <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(34,211,238,0.06)', borderRadius: tokens.radii.md, border: `1px solid ${tokens.colors.borderSoft}` }}>
            <div style={{ fontWeight: 700, marginBottom: '0.5rem', color: tokens.colors.success }}>Import successful</div>
            <table style={{ minWidth: 'auto' }}>
              <tbody>
                {Object.entries(importResult.imported).map(([key, count]) => (
                  <tr key={key}>
                    <td style={{ paddingRight: '1rem', textTransform: 'capitalize' }}>{key.replace(/([A-Z])/g, ' $1')}</td>
                    <td style={{ fontWeight: 600 }}>{count}</td>
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
