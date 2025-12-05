import { useEffect, useState } from 'react';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { api } from '../../api/client';
import type { CategoryAmount } from '../../api/types';
import { tokens } from '../../theme';

interface CategoryBreakdownChartProps {
  refreshToken?: number;
}

const COLORS = ['#0ea5e9', '#22c55e', '#f97316', '#e11d48', '#a855f7', '#14b8a6', '#facc15', '#4b5563'];

export function CategoryBreakdownChart({ refreshToken = 0 }: CategoryBreakdownChartProps) {
  const [data, setData] = useState<CategoryAmount[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    api
      .getCategoryBreakdown(year, month)
      .then((res) => {
        setData(res);
        setError(null);
      })
      .catch((err) => setError(err.message));
  }, [refreshToken]);

  if (error) {
    return <p style={{ color: 'red' }}>Error: {error}</p>;
  }

  if (!data.length) {
    return <p>No expense data for this month.</p>;
  }

  const chartData = data.map((d) => ({ name: d.categoryName, value: d.amount }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={100}
          labelLine={false}
        >
          {chartData.map((entry, index) => (
            <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: tokens.colors.bgElevated,
            border: `1px solid ${tokens.colors.borderSoft}`,
            borderRadius: tokens.radii.md,
            color: tokens.colors.textPrimary,
          }}
        />
        <Legend
          wrapperStyle={{
            color: tokens.colors.textMuted,
            fontSize: '0.9rem',
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
