import { useState } from 'react';
import { Layout } from './components/Layout';
import type { PageKey } from './components/Layout';
import { AccountsPage } from './pages/AccountsPage';
import { DashboardPage } from './pages/DashboardPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { RecurringRulesPage } from './pages/RecurringRulesPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { BudgetsPage } from './pages/BudgetsPage';
import { CategoriesPage } from './pages/CategoriesPage';

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
    <Layout currentPage={page} onChangePage={setPage}>
      {content}
    </Layout>
  );
}

export default App;
