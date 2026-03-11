import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface ToastProps {
  message: string | null;
  type?: 'success' | 'error' | 'info';
  onDismiss: () => void;
  duration?: number;
}

const COLORS = {
  success: 'border-neon-green/20 bg-neon-green/5 text-neon-green',
  error: 'border-neon-red/20 bg-neon-red/5 text-neon-red',
  info: 'border-neon-indigo/20 bg-neon-indigo/5 text-neon-indigo',
};

export function Toast({ message, type = 'info', onDismiss, duration = 3000 }: ToastProps) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onDismiss]);

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          className={`fixed right-4 top-16 z-[80] rounded-lg border px-4 py-2.5
                      text-xs font-medium shadow-lg ${COLORS[type]}`}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
