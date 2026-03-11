import { type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface SidePanelProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function SidePanel({ open, onClose, children }: SidePanelProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop - click to close */}
          <motion.div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          {/* Panel */}
          <motion.aside
            className="fixed right-0 top-0 z-50 flex h-full w-80 flex-col
                       border-l border-neon-border bg-neon-surface
                       overflow-y-auto overflow-x-hidden"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute right-3 top-3 z-10 flex h-6 w-6 items-center justify-center
                         rounded text-neon-text-muted hover:text-neon-text
                         hover:bg-[rgba(255,255,255,0.05)] transition-colors"
              aria-label="Close panel"
            >
              ✕
            </button>
            <div className="flex-1 p-5 pt-10">
              {children}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
