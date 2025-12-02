import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { BudgetVsActual, MonthSummary } from '../api/types';
import { NetWorthChart } from '../components/charts/NetWorthChart';

export function DashboardPage() {
  const [summary, setSummary] = useState<MonthSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [budgetStatus, setBudgetStatus] = useState<BudgetVsActual[]>([]);
  const [budgetError, setBudgetError] = useState<string | null>(null);

  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    api.getMonthSummary(year, month)
        .then((data) => {
          setSummary(data);
          setError(null);
        })
        .catch((err) => {
          setError(err.message);
          setSummary(null);
        });

    api.getBudgetVsActual(year, month)
        .then((data) => {
          setBudgetStatus(data);
          setBudgetError(null);
        })
        .catch((err) => {
          setBudgetError(err.message);
          setBudgetStatus([]);
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
      <div style={{ marginTop: '1.5rem' }}>
        <h2 style={{ marginBottom: '0.5rem' }}>Budgets</h2>
        {budgetError && <p style={{ color: 'red' }}>Error: {budgetError}</p>}
        {!budgetError && budgetStatus.length === 0 && <p>No budgets yet.</p>}
        {budgetStatus.length > 0 && (
          <div style={{ display: 'grid', gap: '0.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
            {budgetStatus.map((b) => (
              <BudgetCard key={b.categoryId} item={b} />
            ))}
          </div>
        )}
      </div>
      <div style={{ marginTop: '2rem' }}>
        <h2 style={{ marginBottom: '0.5rem' }}>Net worth trend</h2>
        <NetWorthChart />
      </div>
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

function BudgetCard({ item }: { item: BudgetVsActual }) {
  const overBudget = item.actualAmount > item.budgetAmount;
  return (
    <div
      style={{
        padding: '0.75rem',
        borderRadius: '8px',
        border: '1px solid #ddd',
        background: overBudget ? '#fee2e2' : '#ecfeff',
      }}
    >
      <div style={{ fontWeight: 600 }}>{item.categoryName}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
        <span>Budget</span>
        <span>{item.budgetAmount.toFixed(2)}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>Actual</span>
        <span style={{ color: overBudget ? '#b91c1c' : '#166534' }}>{item.actualAmount.toFixed(2)}</span>
      </div>
    </div>
  );
}
