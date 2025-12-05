import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../../api/client';
import type { MonthSummary } from '../../api/types';
import { tokens } from '../../theme';

interface SavingsPerMonthChartProps {
  refreshToken?: number;
}

type Point = { label: string; savings: number };

export function SavingsPerMonthChart({ refreshToken = 0 }: SavingsPerMonthChartProps) {
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
  }, [refreshToken]);

  if (error) {
    return <p style={{ color: 'red' }}>Error: {error}</p>;
  }

  if (!data.length) {
    return <p>No savings data.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data}>
        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: tokens.colors.textMuted, fontSize: 12 }}
          tickLine={false}
          axisLine={{ stroke: tokens.colors.borderSoft }}
        />
        <YAxis
          tick={{ fill: tokens.colors.textMuted, fontSize: 12 }}
          tickLine={false}
          axisLine={{ stroke: tokens.colors.borderSoft }}
          width={70}
        />
        <Tooltip
          contentStyle={{
            background: tokens.colors.bgElevated,
            border: `1px solid ${tokens.colors.borderSoft}`,
            borderRadius: tokens.radii.md,
            color: tokens.colors.textPrimary,
          }}
        />
        <Bar dataKey="savings" fill={tokens.colors.success} radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
