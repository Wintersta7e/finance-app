import { useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useBackendReady } from './hooks/useBackendReady';
import { useCommandPalette } from './hooks/useCommandPalette';
import { SplashScreen } from './SplashScreen';
import { CommandStrip, type PageId } from './components/CommandStrip';
import { CommandPalette } from './components/CommandPalette';
import { Toast } from './components/Toast';
import { DashboardPage } from './pages/DashboardPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { AccountsPage } from './pages/AccountsPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { BudgetsPage } from './pages/BudgetsPage';
import { RecurringRulesPage } from './pages/RecurringRulesPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { TagsPage } from './pages/TagsPage';
import { PayeesPage } from './pages/PayeesPage';
import { GoalsPage } from './pages/GoalsPage';
import { ExportImportPage } from './pages/ExportImportPage';
import { AuditPage } from './pages/AuditPage';
import { SettingsPage } from './pages/SettingsPage';

// Ambient gradient tints per page
const PAGE_GRADIENTS: Record<PageId, string> = {
  dashboard: 'radial-gradient(ellipse at 20% 15%, rgba(0,255,136,0.03) 0%, transparent 50%)',
  transactions: 'radial-gradient(ellipse at 20% 15%, rgba(129,140,248,0.03) 0%, transparent 50%)',
  analytics: 'radial-gradient(ellipse at 20% 15%, rgba(0,255,136,0.03) 0%, transparent 50%)',
  accounts: 'radial-gradient(ellipse at 20% 15%, rgba(0,255,136,0.03) 0%, transparent 50%)',
  budgets: 'radial-gradient(ellipse at 20% 15%, rgba(245,158,11,0.03) 0%, transparent 50%)',
  categories: 'radial-gradient(ellipse at 20% 15%, rgba(0,255,136,0.03) 0%, transparent 50%)',
  recurring: 'radial-gradient(ellipse at 20% 15%, rgba(0,255,136,0.03) 0%, transparent 50%)',
  tags: 'radial-gradient(ellipse at 20% 15%, rgba(0,255,136,0.03) 0%, transparent 50%)',
  payees: 'radial-gradient(ellipse at 20% 15%, rgba(0,255,136,0.03) 0%, transparent 50%)',
  goals: 'radial-gradient(ellipse at 20% 15%, rgba(129,140,248,0.03) 0%, transparent 50%)',
  'export-import': 'radial-gradient(ellipse at 20% 15%, rgba(0,255,136,0.03) 0%, transparent 50%)',
  audit: 'radial-gradient(ellipse at 20% 15%, rgba(0,255,136,0.03) 0%, transparent 50%)',
  settings: 'radial-gradient(ellipse at 20% 15%, rgba(0,255,136,0.03) 0%, transparent 50%)',
};

export default function App() {
  const { ready, error, retry } = useBackendReady();
  const [page, setPage] = useState<PageId>('dashboard');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const palette = useCommandPalette();

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  // Data change callback — pages call this after mutations to signal siblings
  const [refreshToken, setRefreshToken] = useState(0);
  const onDataChanged = useCallback(() => setRefreshToken((t) => t + 1), []);

  if (!ready) {
    return <SplashScreen error={error} onRetry={retry} />;
  }

  // Existing pages use old prop names — adapt as each page gets rewritten
  function renderPage() {
    switch (page) {
      case 'dashboard':
        return <DashboardPage analyticsRefreshToken={refreshToken} onDataChanged={onDataChanged} />;
      case 'transactions':
        return <TransactionsPage onDataChanged={onDataChanged} />;
      case 'accounts':
        return <AccountsPage />;
      case 'categories':
        return <CategoriesPage />;
      case 'budgets':
        return <BudgetsPage />;
      case 'recurring':
        return <RecurringRulesPage />;
      case 'analytics':
        return <AnalyticsPage analyticsRefreshToken={refreshToken} />;
      case 'tags':
        return <TagsPage />;
      case 'payees':
        return <PayeesPage />;
      case 'goals':
        return <GoalsPage />;
      case 'export-import':
        return <ExportImportPage />;
      case 'audit':
        return <AuditPage />;
      case 'settings':
        return <SettingsPage showToast={showToast} />;
    }
  }

  return (
    <ErrorBoundary>
      <div className="flex h-screen flex-col bg-neon-bg">
        <CommandStrip
          activePage={page}
          onNavigate={setPage}
          onCommandPalette={palette.toggle}
        />

        <main className="flex-1 overflow-y-auto p-6" style={{ background: PAGE_GRADIENTS[page] }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={page}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
            >
              {renderPage()}
            </motion.div>
          </AnimatePresence>
        </main>

        <CommandPalette
          open={palette.open}
          onClose={palette.close}
          onNavigate={(p) => { setPage(p); palette.close(); }}
        />

        <Toast
          message={toast?.message ?? null}
          type={toast?.type}
          onDismiss={dismissToast}
        />
      </div>
    </ErrorBoundary>
  );
}
