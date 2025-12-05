import { type ReactNode } from 'react';
import { tokens } from '../../theme';
import { Button } from './Button';

interface ModalProps {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: number | string;
}

export function Modal({ title, open, onClose, children, footer, width = 480 }: ModalProps) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        zIndex: 50,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: tokens.colors.bgElevated,
          borderRadius: tokens.radii.lg,
          border: `1px solid ${tokens.colors.borderSoft}`,
          boxShadow: tokens.shadow.card,
          width,
          maxWidth: '100%',
          padding: '1.75rem',
          color: tokens.colors.textPrimary,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>{title}</div>
          <Button
            aria-label="Close modal"
            variant="ghost"
            onClick={onClose}
            style={{
              padding: '0.35rem 0.5rem',
              borderRadius: tokens.radii.sm,
              borderColor: tokens.colors.borderSoft,
            }}
          >
            ✕
          </Button>
        </div>
        <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>{children}</div>
        {footer && (
          <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>{footer}</div>
        )}
      </div>
    </div>
  );
}
