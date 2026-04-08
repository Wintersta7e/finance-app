import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { api } from '../api/client';
import type { CategoryAmount, MonthSummary, NetWorthPoint } from '../api/types';
import { useIsMounted } from '../hooks/useIsMounted';

/* ── Palette ────────────────────────────────────────────────── */

const ACCENT_COLORS = ['#00ff88', '#818cf8', '#f59e0b', '#22d3ee', '#f97316', '#f472b6'];
function getCategoryColor(id: number) {
  return ACCENT_COLORS[id % ACCENT_COLORS.length];
}

const CHART = {
  grid: 'rgba(255,255,255,0.04)',
  axis: 'rgba(255,255,255,0.25)',
  tooltipBg: '#09090f',
  tooltipBorder: 'rgba(255,255,255,0.04)',
  green: '#00ff88',
  indigo: '#818cf8',
} as const;

/* ── Shared tooltip ─────────────────────────────────────────── */

function ChartTooltip({ active, payload, labelFormatter }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  labelFormatter?: (label: string) => string;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const label = (payload[0] as unknown as { payload: { label?: string } }).payload.label;
  return (
    <div
      className="rounded-md px-3 py-2 text-xs"
      style={{
        background: CHART.tooltipBg,
        border: `1px solid ${CHART.tooltipBorder}`,
      }}
    >
      {label && (
        <div className="mb-1 text-neon-text-muted">
          {labelFormatter ? labelFormatter(label) : label}
        </div>
      )}
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: entry.color }}
          />
          <span className="text-neon-text-secondary">{entry.name}</span>
          <span className="ml-auto font-medium text-neon-text">
            {entry.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── Date helpers ───────────────────────────────────────────── */

function monthLabel(year: number, month: number): string {
  return new Date(year, month - 1).toLocaleString(undefined, { month: 'short', year: '2-digit' });
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/* ── Savings month entry ────────────────────────────────────── */

interface SavingsMonthEntry {
  label: string;
  income: number;
  expenses: number;
}

/* ── Component ──────────────────────────────────────────────── */

interface AnalyticsPageProps {
  analyticsRefreshToken: number;
}

export function AnalyticsPage({ analyticsRefreshToken }: AnalyticsPageProps) {
  const isMounted = useIsMounted();
  const [netWorth, setNetWorth] = useState<NetWorthPoint[]>([]);
  const [categories, setCategories] = useState<CategoryAmount[]>([]);
  const [savingsData, setSavingsData] = useState<SavingsMonthEntry[]>([]);
  const [currentMonth, setCurrentMonth] = useState<MonthSummary | null>(null);
  const [prevMonth, setPrevMonth] = useState<MonthSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const now = new Date();
      const curYear = now.getFullYear();
      const curMonth = now.getMonth() + 1;

      // 12 months back for net worth (UTC to avoid timezone date shift)
      const from = new Date(Date.UTC(curYear, curMonth - 13, 1));
      const to = new Date(Date.UTC(curYear, curMonth, 1) - 1);

      // Previous month
      const prevDate = new Date(curYear, curMonth - 2, 1);
      const prevY = prevDate.getFullYear();
      const prevM = prevDate.getMonth() + 1;

      // Build 6-month range for savings
      const savingsMonths: Array<{ year: number; month: number }> = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(curYear, curMonth - 1 - i, 1);
        savingsMonths.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
      }

      const [nwData, catData, curSummary, prevSummary, ...monthSummaries] = await Promise.all([
        api.getNetWorthTrend(isoDate(from), isoDate(to)),
        api.getCategoryBreakdown(curYear, curMonth),
        api.getMonthSummary(curYear, curMonth),
        api.getMonthSummary(prevY, prevM),
        ...savingsMonths.map((m) => api.getMonthSummary(m.year, m.month)),
      ]);

      if (!isMounted()) return;

      setNetWorth(nwData);
      setCategories(catData);
      setCurrentMonth(curSummary);
      setPrevMonth(prevSummary);
      setSavingsData(
        savingsMonths.map((m, i) => ({
          label: monthLabel(m.year, m.month),
          income: (monthSummaries[i] as MonthSummary).totalIncome,
          expenses:
            (monthSummaries[i] as MonthSummary).fixedCosts +
            (monthSummaries[i] as MonthSummary).variableExpenses,
        })),
      );
    } catch (err) {
      if (!isMounted()) return;
      setError((err as Error).message);
    } finally {
      if (isMounted()) setLoading(false);
    }
  }, [isMounted]);

  useEffect(() => {
    void load();
  }, [analyticsRefreshToken, load]);

  /* ── Derived data ─────────────────────────────────────────── */

  const netWorthChart = useMemo(
    () =>
      netWorth.map((p) => ({
        label: new Date(p.date).toLocaleString(undefined, { month: 'short', year: '2-digit' }),
        balance: p.balance,
      })),
    [netWorth],
  );

  const catTotal = useMemo(
    () => categories.reduce((s, c) => s + Math.abs(c.amount), 0),
    [categories],
  );

  /* ── Render ───────────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="space-y-6">
        <Header />
        <div className="text-sm text-neon-text-muted">Loading analytics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Header />
        <div className="text-sm text-neon-red">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <Header />

      {/* ── Net Worth Trend ──────────────────────────────────── */}
      <section>
        <SectionLabel>Net Worth Trend</SectionLabel>
        <div className="h-[280px] mt-3">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={netWorthChart} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="nwFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART.green} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={CHART.green} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={CHART.grid} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: CHART.axis, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: CHART.axis, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => v.toLocaleString()}
                width={60}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.06)' }} />
              <Area
                type="monotone"
                dataKey="balance"
                name="Balance"
                stroke={CHART.green}
                strokeWidth={2}
                fill="url(#nwFill)"
                dot={false}
                activeDot={{ r: 3, fill: CHART.green, stroke: CHART.green }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* ── Category Breakdown ───────────────────────────────── */}
      <section>
        <SectionLabel>Category Breakdown</SectionLabel>

        {categories.length === 0 ? (
          <div className="mt-3 text-sm text-neon-text-muted">No category data for this month.</div>
        ) : (
          <>
            {/* Stacked bar */}
            <div className="mt-3 flex h-3 w-full overflow-hidden rounded-sm">
              {categories.map((c) => {
                const pct = catTotal > 0 ? (Math.abs(c.amount) / catTotal) * 100 : 0;
                if (pct < 0.5) return null;
                return (
                  <div
                    key={c.categoryId}
                    style={{
                      width: `${pct}%`,
                      backgroundColor: getCategoryColor(c.categoryId),
                    }}
                    title={`${c.categoryName}: ${Math.abs(c.amount).toFixed(2)}`}
                  />
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
              {categories.map((c) => (
                <div key={c.categoryId} className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: getCategoryColor(c.categoryId) }}
                  />
                  <span className="text-xs text-neon-text-secondary">
                    {c.categoryName}
                  </span>
                  <span className="text-xs text-neon-text-muted">
                    {Math.abs(c.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {/* ── Savings per Month ────────────────────────────────── */}
      <section>
        <SectionLabel>Savings per Month</SectionLabel>
        <div className="h-[240px] mt-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={savingsData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid stroke={CHART.grid} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: CHART.axis, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: CHART.axis, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => v.toLocaleString()}
                width={60}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
              <Bar
                dataKey="income"
                name="Income"
                fill={CHART.green}
                radius={[2, 2, 0, 0]}
              />
              <Bar
                dataKey="expenses"
                name="Expenses"
                fill={CHART.indigo}
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* ── Monthly Comparison ───────────────────────────────── */}
      {currentMonth && prevMonth && (
        <section>
          <SectionLabel>Monthly Comparison</SectionLabel>
          <div className="mt-3 space-y-2">
            <ComparisonRow
              label="Income"
              current={currentMonth.totalIncome}
              previous={prevMonth.totalIncome}
            />
            <ComparisonRow
              label="Expenses"
              current={currentMonth.fixedCosts + currentMonth.variableExpenses}
              previous={prevMonth.fixedCosts + prevMonth.variableExpenses}
              invertDelta
            />
            <ComparisonRow
              label="Savings"
              current={currentMonth.savings}
              previous={prevMonth.savings}
            />
          </div>
        </section>
      )}
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────── */

function Header() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-neon-text">Analytics</h1>
      <p className="text-sm text-neon-text-muted mt-0.5">Trends and breakdowns</p>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[9px] uppercase tracking-[2px] text-neon-text-muted">
      {children}
    </div>
  );
}

function ComparisonRow({
  label,
  current,
  previous,
  invertDelta = false,
}: {
  label: string;
  current: number;
  previous: number;
  invertDelta?: boolean;
}) {
  const delta = current - previous;
  const positive = invertDelta ? delta <= 0 : delta >= 0;

  return (
    <div className="flex items-center gap-4 border-b border-neon-border py-2.5 last:border-b-0">
      <span className="w-24 text-[9px] uppercase tracking-[2px] text-neon-text-muted">
        {label}
      </span>

      {/* Previous month */}
      <div className="flex-1 text-right">
        <div className="text-[9px] uppercase tracking-[1px] text-neon-text-faint">Prev</div>
        <div className="text-sm text-neon-text-secondary">
          {previous.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>

      {/* Current month */}
      <div className="flex-1 text-right">
        <div className="text-[9px] uppercase tracking-[1px] text-neon-text-faint">Current</div>
        <div className="text-sm font-medium text-neon-text">
          {current.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>

      {/* Delta badge */}
      <div
        className={`min-w-[72px] rounded-full px-2.5 py-0.5 text-center text-xs font-medium ${
          positive
            ? 'bg-neon-green/10 text-neon-green'
            : 'bg-neon-red/10 text-neon-red'
        }`}
      >
        {delta >= 0 ? '+' : ''}
        {delta.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
    </div>
  );
}
