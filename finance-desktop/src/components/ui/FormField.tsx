import { type ReactNode } from 'react';
import { tokens } from '../../theme';

interface FormFieldProps {
  label: string;
  children: ReactNode;
  hint?: string;
}

export function FormField({ label, children, hint }: FormFieldProps) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      <span style={{ color: tokens.colors.textMuted, fontSize: '0.95rem', fontWeight: 600 }}>{label}</span>
      {children}
      {hint && <span style={{ color: tokens.colors.textMuted, fontSize: '0.85rem' }}>{hint}</span>}
    </label>
  );
}
