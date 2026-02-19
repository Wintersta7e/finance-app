import { useState } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/Layout';
import type { PageKey } from './components/Layout';
import { AccountsPage } from './pages/AccountsPage';
import { DashboardPage } from './pages/DashboardPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { RecurringRulesPage } from './pages/RecurringRulesPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { BudgetsPage } from './pages/BudgetsPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { TagsPage } from './pages/TagsPage';
import { PayeesPage } from './pages/PayeesPage';
import { GoalsPage } from './pages/GoalsPage';
import { ExportImportPage } from './pages/ExportImportPage';
import { AuditPage } from './pages/AuditPage';

function App() {
  const [page, setPage] = useState<PageKey>('dashboard');
  const [analyticsRefreshToken, setAnalyticsRefreshToken] = useState(0);

  const bumpAnalyticsRefresh = () => setAnalyticsRefreshToken((val) => val + 1);

  let content;
  switch (page) {
    case 'accounts':
      content = <AccountsPage />;
      break;
    case 'transactions':
      content = <TransactionsPage onDataChanged={bumpAnalyticsRefresh} />;
      break;
    case 'recurring':
      content = <RecurringRulesPage />;
      break;
    case 'analytics':
      content = <AnalyticsPage analyticsRefreshToken={analyticsRefreshToken} />;
      break;
    case 'budgets':
      content = <BudgetsPage />;
      break;
    case 'categories':
      content = <CategoriesPage />;
      break;
    case 'tags':
      content = <TagsPage />;
      break;
    case 'payees':
      content = <PayeesPage />;
      break;
    case 'goals':
      content = <GoalsPage />;
      break;
    case 'export':
      content = <ExportImportPage />;
      break;
    case 'audit':
      content = <AuditPage />;
      break;
    case 'dashboard':
    default:
      content = (
        <DashboardPage
          analyticsRefreshToken={analyticsRefreshToken}
          onDataChanged={bumpAnalyticsRefresh}
        />
      );
  }

  return (
    <ErrorBoundary>
      <Layout currentPage={page} onChangePage={setPage}>
        {content}
      </Layout>
    </ErrorBoundary>
  );
}

export default App;
