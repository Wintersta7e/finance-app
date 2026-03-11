import { useState, useRef, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { PageId } from './CommandStrip';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onNavigate: (page: PageId) => void;
  onAction?: (action: string) => void;
}

interface PaletteItem {
  id: string;
  label: string;
  section: string;
  action: () => void;
}

const PAGE_ITEMS: { id: PageId; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'transactions', label: 'Transactions' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'accounts', label: 'Accounts' },
  { id: 'budgets', label: 'Budgets' },
  { id: 'recurring', label: 'Recurring Rules' },
  { id: 'categories', label: 'Categories' },
  { id: 'tags', label: 'Tags' },
  { id: 'payees', label: 'Payees' },
  { id: 'goals', label: 'Goals' },
  { id: 'export-import', label: 'Export / Import' },
  { id: 'audit', label: 'Audit Log' },
  { id: 'settings', label: 'Settings' },
];

export function CommandPalette({ open, onClose, onNavigate, onAction }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const items = useMemo<PaletteItem[]>(() => {
    const all: PaletteItem[] = [
      ...PAGE_ITEMS.map((p) => ({
        id: `page-${p.id}`,
        label: p.label,
        section: 'Pages',
        action: () => { onNavigate(p.id); onClose(); },
      })),
      {
        id: 'action-add-transaction',
        label: 'Add transaction',
        section: 'Quick Actions',
        action: () => { onAction?.('add-transaction'); onClose(); },
      },
      {
        id: 'action-new-category',
        label: 'New category',
        section: 'Quick Actions',
        action: () => { onNavigate('categories'); onAction?.('new-category'); onClose(); },
      },
      {
        id: 'action-export',
        label: 'Export data',
        section: 'Quick Actions',
        action: () => { onNavigate('export-import'); onClose(); },
      },
    ];

    if (!query.trim()) return all;

    const q = query.toLowerCase();
    return all.filter((item) => item.label.toLowerCase().includes(q));
  }, [query, onNavigate, onClose, onAction]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && items[selectedIndex]) {
      items[selectedIndex].action();
    }
  }

  // Group items by section with precomputed flat indices
  const sectionData = useMemo(() => {
    const result: Array<{ section: string; items: Array<{ item: PaletteItem; flatIdx: number }> }> = [];
    const sectionMap = new Map<string, PaletteItem[]>();
    for (const item of items) {
      const list = sectionMap.get(item.section) ?? [];
      list.push(item);
      sectionMap.set(item.section, list);
    }
    let idx = 0;
    for (const [section, sectionItems] of sectionMap) {
      result.push({
        section,
        items: sectionItems.map((item) => ({ item, flatIdx: idx++ })),
      });
    }
    return result;
  }, [items]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed left-1/2 top-[15%] z-[70] w-[460px] -translate-x-1/2
                       rounded-xl border border-neon-border bg-neon-surface
                       shadow-2xl overflow-hidden"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.15 }}
          >
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search or jump to..."
              className="w-full border-b border-neon-border bg-transparent px-4 py-3
                         text-sm text-neon-text placeholder:text-neon-text-muted
                         outline-none"
            />
            <div className="max-h-80 overflow-y-auto py-2">
              {items.length === 0 && (
                <p className="px-4 py-6 text-center text-xs text-neon-text-muted">
                  No results found
                </p>
              )}
              {sectionData.map(({ section, items: sectionItems }) => (
                <div key={section}>
                  <p className="px-4 py-1 text-[9px] uppercase tracking-widest text-neon-text-muted">
                    {section}
                  </p>
                  {sectionItems.map(({ item, flatIdx }) => (
                    <button
                      key={item.id}
                      onClick={item.action}
                      className={`flex w-full items-center px-4 py-2 text-xs transition-colors
                        ${flatIdx === selectedIndex
                          ? 'bg-[rgba(0,255,136,0.08)] text-neon-green'
                          : 'text-neon-text-secondary hover:bg-[rgba(255,255,255,0.03)]'
                        }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
