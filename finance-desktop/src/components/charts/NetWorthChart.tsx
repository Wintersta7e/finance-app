import { useEffect, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../../api/client';
import type { NetWorthPoint } from '../../api/types';
import { tokens } from '../../theme';

interface NetWorthChartProps {
  refreshToken?: number;
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function NetWorthChart({ refreshToken = 0 }: NetWorthChartProps) {
  const [data, setData] = useState<NetWorthPoint[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const to = now;

    api
      .getNetWorthTrend(formatDate(from), formatDate(to))
      .then((points) => {
        setData(points);
        setError(null);
      })
      .catch((err) => setError(err.message));
  }, [refreshToken]);

  if (error) {
    return <p style={{ color: 'red' }}>Error: {error}</p>;
  }

  if (!data.length) {
    return <p>No net worth data yet.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data}>
        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: tokens.colors.textMuted, fontSize: 12 }}
          tickLine={false}
          axisLine={{ stroke: tokens.colors.borderSoft }}
        />
        <YAxis
          tick={{ fill: tokens.colors.textMuted, fontSize: 12 }}
          tickLine={false}
          axisLine={{ stroke: tokens.colors.borderSoft }}
          width={72}
        />
        <Tooltip
          contentStyle={{
            background: tokens.colors.bgElevated,
            border: `1px solid ${tokens.colors.borderSoft}`,
            borderRadius: tokens.radii.md,
            color: tokens.colors.textPrimary,
          }}
        />
        <Line type="monotone" dataKey="value" stroke={tokens.colors.accent} strokeWidth={2.4} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
