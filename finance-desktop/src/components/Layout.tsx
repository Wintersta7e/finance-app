import { ReactNode } from 'react';

type PageKey = 'dashboard' | 'accounts' | 'transactions';

interface LayoutProps {
  currentPage: PageKey;
  onChangePage: (page: PageKey) => void;
  children: ReactNode;
}

export function Layout({ currentPage, onChangePage, children }: LayoutProps) {
  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'system-ui' }}>
      <nav
        style={{
          width: '220px',
          borderRight: '1px solid #ddd',
          padding: '1rem',
          boxSizing: 'border-box',
        }}
      >
        <h2 style={{ marginTop: 0 }}>Finance</h2>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          <li>
            <button
              onClick={() => onChangePage('dashboard')}
              style={{
                background: currentPage === 'dashboard' ? '#eee' : 'transparent',
                border: 'none',
                padding: '0.5rem 0',
                width: '100%',
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              Dashboard
            </button>
          </li>
          <li>
            <button
              onClick={() => onChangePage('accounts')}
              style={{
                background: currentPage === 'accounts' ? '#eee' : 'transparent',
                border: 'none',
                padding: '0.5rem 0',
                width: '100%',
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              Accounts
            </button>
          </li>
          <li>
            <button
              onClick={() => onChangePage('transactions')}
              style={{
                background: currentPage === 'transactions' ? '#eee' : 'transparent',
                border: 'none',
                padding: '0.5rem 0',
                width: '100%',
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              Transactions
            </button>
          </li>
        </ul>
      </nav>
      <section style={{ flex: 1, padding: '1.5rem', boxSizing: 'border-box' }}>{children}</section>
    </div>
  );
}

export type { PageKey };
