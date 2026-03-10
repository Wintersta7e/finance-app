import { useState, useRef, useEffect, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface DropdownItem {
  id: string;
  label: string;
  icon?: ReactNode;
  active?: boolean;
}

interface DropdownMenuProps {
  trigger: ReactNode;
  items: DropdownItem[];
  onSelect: (id: string) => void;
}

export function DropdownMenu({ trigger, items, onSelect }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    if (open) document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <div onClick={() => setOpen(!open)}>{trigger}</div>
      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute top-full right-0 mt-1 min-w-48 rounded-lg border
                       border-neon-border bg-neon-surface py-1 shadow-xl z-50"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
          >
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => { onSelect(item.id); setOpen(false); }}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-xs transition-colors
                  ${item.active
                    ? 'bg-[rgba(0,255,136,0.08)] text-neon-green'
                    : 'text-neon-text-secondary hover:bg-[rgba(255,255,255,0.04)] hover:text-neon-text'
                  }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
