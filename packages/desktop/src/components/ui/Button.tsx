import { type ButtonHTMLAttributes, type CSSProperties } from 'react';
import { tokens } from '../../theme';

type ButtonVariant = 'primary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const baseStyle: CSSProperties = {
  borderRadius: tokens.radii.md,
  border: `1px solid ${tokens.colors.borderSoft}`,
  padding: '0.65rem 0.95rem',
  fontWeight: 600,
  fontSize: '0.95rem',
  cursor: 'pointer',
  transition: 'all 0.16s ease',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.5rem',
  justifyContent: 'center',
};

const variantStyles: Record<ButtonVariant, CSSProperties> = {
  primary: {
    background: tokens.colors.accent,
    color: '#0b1220',
    borderColor: 'transparent',
    boxShadow: '0 10px 30px rgba(56, 189, 248, 0.25)',
  },
  ghost: {
    background: 'transparent',
    color: tokens.colors.textPrimary,
  },
  danger: {
    background: tokens.colors.danger,
    color: '#0b1220',
    borderColor: 'transparent',
    boxShadow: '0 10px 30px rgba(239, 68, 68, 0.25)',
  },
};

export function Button({ variant = 'primary', style, disabled, type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      style={{
        ...baseStyle,
        ...variantStyles[variant],
        ...(disabled
          ? {
            opacity: 0.65,
            cursor: 'not-allowed',
            boxShadow: 'none',
          }
          : {}),
        ...style,
      }}
    />
  );
}
