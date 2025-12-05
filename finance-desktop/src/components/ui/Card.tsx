import { type CSSProperties, type ReactNode } from 'react';
import { tokens } from '../../theme';

interface CardProps {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  style?: CSSProperties;
  contentGap?: string;
}

export function Card({ title, subtitle, actions, children, style, contentGap = '1rem' }: CardProps) {
  return (
    <div
      style={{
        background: tokens.colors.bgElevated,
        border: `1px solid ${tokens.colors.borderSoft}`,
        borderRadius: tokens.radii.lg,
        boxShadow: tokens.shadow.card,
        padding: '1.25rem',
        color: tokens.colors.textPrimary,
        ...style,
      }}
    >
      {(title || subtitle || actions) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.75rem' }}>
          <div>
            {title && <div style={{ fontSize: '1.05rem', fontWeight: 700 }}>{title}</div>}
            {subtitle && <div style={{ color: tokens.colors.textMuted, marginTop: '0.25rem', fontSize: '0.95rem' }}>{subtitle}</div>}
          </div>
          {actions && <div>{actions}</div>}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: contentGap }}>{children}</div>
    </div>
  );
}
