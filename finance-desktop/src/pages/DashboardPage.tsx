import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { MonthSummary } from '../api/types';

export function DashboardPage() {
  const [summary, setSummary] = useState<MonthSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    api
      .getMonthSummary(year, month)
      .then((data) => {
        setSummary(data);
        setError(null);
      })
      .catch((err) => {
        setError(err.message);
        setSummary(null);
      });
  }, []);

  return (
    <div>
      <h1>Dashboard</h1>
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      {!error && !summary && <p>Loading summary…</p>}
      {summary && (
        <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem' }}>
          <SummaryCard label="Income this month" value={summary.totalIncome} />
          <SummaryCard label="Expenses this month" value={summary.fixedCosts + summary.variableExpenses} />
          <SummaryCard label="Savings this month" value={summary.savings} />
          <SummaryCard label="End-of-month balance" value={summary.endOfMonthBalance} />
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        padding: '1rem',
        borderRadius: '8px',
        border: '1px solid #ddd',
        minWidth: '180px',
      }}
    >
      <div style={{ fontSize: '0.85rem', color: '#666' }}>{label}</div>
      <div style={{ fontSize: '1.4rem', fontWeight: 600 }}>{value.toFixed(2)}</div>
    </div>
  );
}
