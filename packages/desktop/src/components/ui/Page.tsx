import { type ReactNode } from 'react';
import { tokens } from '../../theme';

interface PageProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function Page({ title, subtitle, actions, children }: PageProps) {
  return (
    <div
      style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '1rem' }}>
        <div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: tokens.colors.textPrimary }}>{title}</div>
          {subtitle && <div style={{ color: tokens.colors.textMuted, marginTop: '0.25rem' }}>{subtitle}</div>}
        </div>
        {actions}
      </div>
      {children}
    </div>
  );
}
