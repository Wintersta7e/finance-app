import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import type { BudgetVsActual, MonthSummary } from '../api/types';
import { NetWorthChart } from '../components/charts/NetWorthChart';
import { QuickTransactionForm } from '../components/transactions/QuickTransactionForm';
import { Card } from '../components/ui/Card';
import { Page } from '../components/ui/Page';
import { tokens } from '../theme';

interface DashboardPageProps {
  analyticsRefreshToken: number;
  onDataChanged: () => void;
}

export function DashboardPage({ analyticsRefreshToken, onDataChanged }: DashboardPageProps) {
  const [summary, setSummary] = useState<MonthSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [budgetStatus, setBudgetStatus] = useState<BudgetVsActual[]>([]);
  const [budgetError, setBudgetError] = useState<string | null>(null);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const loadSummary = useCallback(() => {
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
  }, [month, year]);

  const loadBudgets = useCallback(() => {
    api
      .getBudgetVsActual(year, month)
      .then((data) => {
        setBudgetStatus(data);
        setBudgetError(null);
      })
      .catch((err) => {
        setBudgetError(err.message);
        setBudgetStatus([]);
      });
  }, [month, year]);

  useEffect(() => {
    loadSummary();
    loadBudgets();
  }, [loadSummary, loadBudgets]);

  useEffect(() => {
    loadSummary();
    loadBudgets();
  }, [analyticsRefreshToken, loadSummary, loadBudgets]);

  const handleTransactionAdded = () => {
    loadSummary();
    loadBudgets();
    onDataChanged();
  };

  return (
    <Page title="Dashboard" subtitle="Snapshot of this month&apos;s performance">
      <QuickTransactionForm onChange={handleTransactionAdded} />

      {error && <Card><span style={{ color: tokens.colors.danger }}>Error: {error}</span></Card>}
      {!error && !summary && <Card>Loading summary…</Card>}

      {summary && (
        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <SummaryCard label="Income this month" value={summary.totalIncome} tone="accent" />
          <SummaryCard label="Expenses this month" value={summary.fixedCosts + summary.variableExpenses} tone="muted" />
          <SummaryCard label="Savings this month" value={summary.savings} tone="success" />
          <SummaryCard label="End-of-month balance" value={summary.endOfMonthBalance} tone="muted" />
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.25rem',
          alignItems: 'stretch',
        }}
      >
        <Card title="Budgets" subtitle="Current month" contentGap="0.9rem">
          {budgetError && <span style={{ color: tokens.colors.danger }}>Error: {budgetError}</span>}
          {!budgetError && budgetStatus.length === 0 && <span style={{ color: tokens.colors.textMuted }}>No budgets yet.</span>}
          {budgetStatus.length > 0 && (
            <div style={{ display: 'grid', gap: '0.6rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              {budgetStatus.map((b) => (
                <BudgetCard key={b.categoryId} item={b} />
              ))}
            </div>
          )}
        </Card>

        <Card title="Net worth trend" subtitle="Last 6 months">
          <div style={{ height: 300 }}>
            <NetWorthChart refreshToken={analyticsRefreshToken} />
          </div>
        </Card>
      </div>
    </Page>
  );
}

type Tone = 'accent' | 'success' | 'muted';

function SummaryCard({ label, value, tone = 'muted' }: { label: string; value: number; tone?: Tone }) {
  const toneColors: Record<Tone, { bg: string; text: string }> = {
    accent: { bg: 'rgba(56, 189, 248, 0.1)', text: tokens.colors.accent },
    success: { bg: 'rgba(34,197,94,0.12)', text: tokens.colors.success },
    muted: { bg: 'rgba(255,255,255,0.04)', text: tokens.colors.textPrimary },
  };
  return (
    <Card
      contentGap="0.35rem"
      style={{
        background: `linear-gradient(180deg, ${toneColors[tone].bg}, ${tokens.colors.bgElevated})`,
        borderColor: tokens.colors.borderSoft,
      }}
    >
      <div style={{ fontSize: '0.9rem', color: tokens.colors.textMuted }}>{label}</div>
      <div style={{ fontSize: '1.55rem', fontWeight: 700, color: toneColors[tone].text }}>{value.toFixed(2)}</div>
    </Card>
  );
}

function BudgetCard({ item }: { item: BudgetVsActual }) {
  const overBudget = item.actualAmount > item.budgetAmount;
  return (
    <div
      style={{
        padding: '0.9rem',
        borderRadius: tokens.radii.md,
        border: `1px solid ${overBudget ? 'rgba(239,68,68,0.5)' : tokens.colors.borderSoft}`,
        background: overBudget ? 'rgba(239,68,68,0.07)' : 'rgba(34,197,94,0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
      }}
    >
      <div style={{ fontWeight: 700 }}>{item.categoryName}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: tokens.colors.textMuted }}>
        <span>Budget</span>
        <span>{item.budgetAmount.toFixed(2)}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>Actual</span>
        <span style={{ color: overBudget ? tokens.colors.danger : tokens.colors.success }}>
          {item.actualAmount.toFixed(2)}
        </span>
      </div>
    </div>
  );
}
