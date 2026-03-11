import type { ReactNode } from 'react';

interface MetricStripProps {
  label: string;
  value: string | number;
  color: string;
  children?: ReactNode;
}

export function MetricStrip({ label, value, color, children }: MetricStripProps) {
  return (
    <div className="flex-1 py-1.5 pl-2.5 pr-3" style={{
      borderLeft: `2px solid ${color}`,
      background: `color-mix(in srgb, ${color} 3%, transparent)`,
    }}>
      <div className="text-[9px] uppercase tracking-[1px] text-neon-text-muted">{label}</div>
      <div className="text-[15px] font-bold" style={{ color }}>{value}</div>
      {children}
    </div>
  );
}
