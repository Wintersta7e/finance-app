import { type ReactNode } from 'react';
import { tokens } from '../theme';

type PageKey = 'dashboard' | 'accounts' | 'transactions' | 'recurring' | 'analytics' | 'budgets' | 'categories';

interface LayoutProps {
  currentPage: PageKey;
  onChangePage: (page: PageKey) => void;
  children: ReactNode;
}

const navItems: { key: PageKey; label: string; icon: ReactNode }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: <IconGrid /> },
  { key: 'accounts', label: 'Accounts', icon: <IconWallet /> },
  { key: 'transactions', label: 'Transactions', icon: <IconArrows /> },
  { key: 'recurring', label: 'Recurring', icon: <IconLoop /> },
  { key: 'categories', label: 'Categories', icon: <IconTag /> },
  { key: 'analytics', label: 'Analytics', icon: <IconChart /> },
  { key: 'budgets', label: 'Budgets', icon: <IconCalendar /> },
];

export function Layout({ currentPage, onChangePage, children }: LayoutProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '240px 1fr',
        minHeight: '100vh',
        background: tokens.colors.bg,
        color: tokens.colors.textPrimary,
      }}
    >
      <aside
        style={{
          background: tokens.colors.sidebarBg,
          borderRight: `1px solid ${tokens.colors.borderSoft}`,
          padding: '1.4rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.6rem' }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: tokens.radii.md,
              background: 'linear-gradient(135deg, #38bdf8, #22d3ee)',
              display: 'grid',
              placeItems: 'center',
              color: '#0b1220',
              fontWeight: 800,
              fontSize: '1rem',
            }}
          >
            ₣
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>Finance Desk</div>
            <div style={{ color: tokens.colors.textMuted, fontSize: '0.9rem' }}>Control center</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          {navItems.map((item) => {
            const active = item.key === currentPage;
            return (
              <button
                type="button"
                key={item.key}
                onClick={() => onChangePage(item.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  width: '100%',
                  background: active ? tokens.colors.accentMuted : 'transparent',
                  color: tokens.colors.textPrimary,
                  border: `1px solid ${active ? tokens.colors.accent : tokens.colors.borderSoft}`,
                  borderRadius: tokens.radii.lg,
                  padding: '0.65rem 0.85rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: tokens.radii.md,
                    background: active ? tokens.colors.accent : 'rgba(255,255,255,0.04)',
                    display: 'grid',
                    placeItems: 'center',
                    color: active ? '#0b1220' : tokens.colors.textMuted,
                    border: `1px solid ${tokens.colors.borderSoft}`,
                  }}
                >
                  {item.icon}
                </span>
                <span style={{ fontWeight: 600 }}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </aside>

      <main
        style={{
          padding: '1.75rem',
          background: 'radial-gradient(circle at 20% 20%, rgba(56,189,248,0.06), transparent 25%), radial-gradient(circle at 80% 0%, rgba(14,165,233,0.08), transparent 30%), linear-gradient(180deg, #18181b, #0f1115)',
          overflowY: 'auto',
        }}
      >
        {children}
      </main>
    </div>
  );
}

function IconGrid() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="13" y="3" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="13" y="13" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function IconWallet() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="6" width="18" height="12" rx="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M16 12h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M3 10h12" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function IconArrows() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M7 5h13m0 0-3-3m3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 19H4m0 0 3 3m-3-3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconLoop() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M4 8c0-2.21 1.79-4 4-4h8l-2.5 2.5M20 16c0 2.21-1.79 4-4 4H8l2.5-2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 9v-1M20 15v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconTag() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M3 9V5a2 2 0 0 1 2-2h4l11 11-6 6L3 9Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="7" r="1" fill="currentColor" />
    </svg>
  );
}

function IconChart() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M4 20V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="6.5" y="10" width="3" height="10" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="11.5" y="6" width="3" height="14" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="16.5" y="3" width="3" height="17" rx="1" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M16 3v4M8 3v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M3 10h18" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export type { PageKey };
