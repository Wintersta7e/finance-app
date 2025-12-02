import { CategoryBreakdownChart } from '../components/charts/CategoryBreakdownChart';
import { NetWorthChart } from '../components/charts/NetWorthChart';
import { SavingsPerMonthChart } from '../components/charts/SavingsPerMonthChart';

export function AnalyticsPage() {
  return (
    <div>
      <h1>Analytics</h1>
      <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        <div>
          <h2 style={{ marginBottom: '0.5rem' }}>Net worth trend</h2>
          <NetWorthChart />
        </div>
        <div>
          <h2 style={{ marginBottom: '0.5rem' }}>Category breakdown (this month)</h2>
          <CategoryBreakdownChart />
        </div>
        <div>
          <h2 style={{ marginBottom: '0.5rem' }}>Savings per month</h2>
          <SavingsPerMonthChart />
        </div>
      </div>
    </div>
  );
}
