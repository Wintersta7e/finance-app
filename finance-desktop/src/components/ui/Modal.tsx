import { type ReactNode, useEffect, useRef } from 'react';
import { tokens } from '../../theme';
import { Button } from './Button';

interface ModalProps {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: number | string;
  /** Higher z-index for nested modals (default: 50, use 60 for nested) */
  zIndex?: number;
}

export function Modal({ title, open, onClose, children, footer, width = 480, zIndex = 50 }: ModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Auto-focus first focusable element when modal opens
  useEffect(() => {
    if (!open || !dialogRef.current) return;

    const focusableSelector = 'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])';
    const firstFocusable = dialogRef.current.querySelector<HTMLElement>(focusableSelector);
    if (firstFocusable) {
      // Small delay to ensure DOM is ready
      requestAnimationFrame(() => firstFocusable.focus());
    }
  }, [open]);

  // Close only when clicking directly on backdrop, not when events bubble up
  const handleBackdropMouseDown = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) {
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div
      ref={backdropRef}
      role="dialog"
      aria-modal="true"
      onMouseDown={handleBackdropMouseDown}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        zIndex,
      }}
    >
      <div
        ref={dialogRef}
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
