import { type ReactNode } from 'react';
import { DropdownMenu } from './DropdownMenu';

export type PageId =
  | 'dashboard' | 'transactions' | 'analytics' | 'accounts' | 'budgets'
  | 'categories' | 'recurring' | 'tags' | 'payees' | 'goals'
  | 'export-import' | 'audit' | 'settings';

interface NavTab {
  id: PageId;
  label: string;
  icon: ReactNode;
  badge?: ReactNode;
}

const PRIMARY_TABS: NavTab[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
  { id: 'transactions', label: 'Transactions', icon: <ListIcon /> },
  { id: 'analytics', label: 'Analytics', icon: <ChartIcon /> },
  { id: 'accounts', label: 'Accounts', icon: <WalletIcon /> },
  { id: 'budgets', label: 'Budgets', icon: <BudgetIcon /> },
];

const MORE_ITEMS: { id: PageId; label: string }[] = [
  { id: 'recurring', label: 'Recurring Rules' },
  { id: 'categories', label: 'Categories' },
  { id: 'tags', label: 'Tags' },
  { id: 'payees', label: 'Payees' },
  { id: 'goals', label: 'Goals' },
  { id: 'export-import', label: 'Export / Import' },
  { id: 'audit', label: 'Audit Log' },
  { id: 'settings', label: 'Settings' },
];

interface CommandStripProps {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
  onCommandPalette: () => void;
}

export function CommandStrip({ activePage, onNavigate, onCommandPalette }: CommandStripProps) {
  const isMorePage = MORE_ITEMS.some((item) => item.id === activePage);
  const moreLabel = isMorePage
    ? MORE_ITEMS.find((item) => item.id === activePage)!.label
    : 'More';

  return (
    <nav className="flex h-12 items-center gap-1 border-b border-neon-border bg-neon-surface px-4">
      {/* Logo */}
      <div className="mr-3 flex h-7 w-7 items-center justify-center rounded-lg
                      bg-gradient-to-br from-neon-green to-[#00cc6a]
                      shadow-glow-green-sm">
        <span className="text-xs font-black text-neon-bg">F</span>
      </div>

      {/* Primary tabs */}
      {PRIMARY_TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onNavigate(tab.id)}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-medium transition-all
            ${activePage === tab.id
              ? 'bg-[rgba(0,255,136,0.08)] text-neon-green border border-[rgba(0,255,136,0.12)]'
              : 'text-neon-text-secondary hover:text-neon-text hover:bg-[rgba(255,255,255,0.04)] border border-transparent'
            }`}
        >
          {tab.icon}
          {tab.label}
          {tab.badge}
        </button>
      ))}

      {/* More dropdown */}
      <DropdownMenu
        trigger={
          <button
            className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-[11px] font-medium transition-all
              ${isMorePage
                ? 'bg-[rgba(0,255,136,0.08)] text-neon-green border border-[rgba(0,255,136,0.12)]'
                : 'text-neon-text-secondary hover:text-neon-text hover:bg-[rgba(255,255,255,0.04)] border border-transparent'
              }`}
          >
            {moreLabel} ▾
          </button>
        }
        items={MORE_ITEMS.map((item) => ({
          ...item,
          active: activePage === item.id,
        }))}
        onSelect={(id) => onNavigate(id as PageId)}
      />

      <div className="flex-1" />

      {/* Command palette trigger */}
      <button
        onClick={onCommandPalette}
        className="flex items-center gap-3 rounded-md border border-neon-border bg-[rgba(255,255,255,0.02)]
                   px-3 py-1 text-[10px] text-neon-text-muted transition-colors
                   hover:border-neon-border-active hover:text-neon-text-secondary"
      >
        Search or jump to...
        <kbd className="rounded bg-[rgba(255,255,255,0.06)] px-1.5 py-0.5 text-[9px]">⌘K</kbd>
      </button>
    </nav>
  );
}

/* Inline SVG icon components — small, 14x14 stroke icons */
function DashboardIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="1" y="1" width="6" height="6" rx="1" />
      <rect x="9" y="1" width="6" height="6" rx="1" />
      <rect x="1" y="9" width="6" height="6" rx="1" />
      <rect x="9" y="9" width="6" height="6" rx="1" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M2 4h12M2 8h12M2 12h8" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12l4-5 3 3 5-7" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="4" width="12" height="8" rx="1.5" />
      <circle cx="11" cy="8" r="1" fill="currentColor" />
    </svg>
  );
}

function BudgetIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="8" r="6" />
      <path d="M8 5v3l2 1" strokeLinecap="round" />
    </svg>
  );
}
