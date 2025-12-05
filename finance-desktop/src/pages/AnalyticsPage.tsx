import { CategoryBreakdownChart } from '../components/charts/CategoryBreakdownChart';
import { NetWorthChart } from '../components/charts/NetWorthChart';
import { SavingsPerMonthChart } from '../components/charts/SavingsPerMonthChart';
import { Card } from '../components/ui/Card';
import { Page } from '../components/ui/Page';

interface AnalyticsPageProps {
  analyticsRefreshToken: number;
}

export function AnalyticsPage({ analyticsRefreshToken }: AnalyticsPageProps) {
  return (
    <Page title="Analytics" subtitle="Trends and breakdowns">
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
