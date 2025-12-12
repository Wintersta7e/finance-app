import { CategoryBreakdownChart } from '../components/charts/CategoryBreakdownChart';
import { NetWorthChart } from '../components/charts/NetWorthChart';
import { SavingsPerMonthChart } from '../components/charts/SavingsPerMonthChart';
import { Card } from '../components/ui/Card';
import { Page } from '../components/ui/Page';
import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { RecurringCosts } from '../api/types';

interface AnalyticsPageProps {
  analyticsRefreshToken: number;
}

export function AnalyticsPage({ analyticsRefreshToken }: AnalyticsPageProps) {
  const [recurringCosts, setRecurringCosts] = useState<RecurringCosts | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getRecurringCosts()
      .then((data) => {
        setRecurringCosts(data);
        setError(null);
      })
      .catch((err) => setError(err.message));
  }, [analyticsRefreshToken]);

  return (
    <Page title="Analytics" subtitle="Trends and breakdowns">
      <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', marginBottom: '1rem' }}>
        <Card title="Recurring costs" subtitle="Active rules">
          {error && <span style={{ color: 'red' }}>Error: {error}</span>}
          {!recurringCosts && !error && <span style={{ color: 'rgba(255,255,255,0.6)' }}>Loading…</span>}
          {recurringCosts && (
            <div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                Monthly total
              </div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{recurringCosts.monthlyTotal.toFixed(2)}</div>
            </div>
          )}
        </Card>
      </div>
      <div style={{ display: 'grid', gap: '1.25rem', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        <Card title="Net worth trend" subtitle="Last 6 months">
          <div style={{ height: 280 }}>
            <NetWorthChart refreshToken={analyticsRefreshToken} />
          </div>
        </Card>
        <Card title="Category breakdown" subtitle="This month">
          <div style={{ height: 280 }}>
            <CategoryBreakdownChart refreshToken={analyticsRefreshToken} />
          </div>
        </Card>
        <Card title="Savings per month" subtitle="Recent half-year">
          <div style={{ height: 260 }}>
            <SavingsPerMonthChart refreshToken={analyticsRefreshToken} />
          </div>
        </Card>
      </div>
    </Page>
  );
}
