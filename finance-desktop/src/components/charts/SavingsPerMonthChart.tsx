import { useEffect, useState } from 'react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../../api/client';
import type { MonthSummary } from '../../api/types';

type Point = { label: string; savings: number };

export function SavingsPerMonthChart() {
  const [data, setData] = useState<Point[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const now = new Date();
    const months: { year: number; month: number; label: string }[] = [];
    for (let i = 5; i >= 0; i -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        label: date.toLocaleDateString(undefined, { month: 'short' }),
      });
    }

    Promise.all(months.map((m) => api.getMonthSummary(m.year, m.month)))
      .then((summaries: MonthSummary[]) => {
        const series = summaries.map((s, idx) => ({
          label: months[idx].label,
          savings: s.savings,
        }));
        setData(series);
        setError(null);
      })
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return <p style={{ color: 'red' }}>Error: {error}</p>;
  }

  if (!data.length) {
    return <p>No savings data.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data}>
        <XAxis dataKey="label" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="savings" fill="#10b981" />
      </BarChart>
    </ResponsiveContainer>
  );
}
