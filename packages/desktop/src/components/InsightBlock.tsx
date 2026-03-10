import type { ReactNode } from 'react';

interface InsightBlockProps {
  label: string;
  text: string;
  color: string;
  children?: ReactNode;
}

export function InsightBlock({ label, text, color, children }: InsightBlockProps) {
  return (
    <div className="rounded-r-md py-2 pl-2.5 pr-3" style={{
      borderLeft: `2px solid ${color}`,
      background: `color-mix(in srgb, ${color} 4%, transparent)`,
    }}>
      <div className="text-[10px] text-neon-text-muted">{label}</div>
      <div className="mt-0.5 text-[11px] text-neon-text-secondary">{text}</div>
      {children && <div className="mt-1.5">{children}</div>}
    </div>
  );
}
