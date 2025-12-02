import { useState } from 'react';
import { Layout } from './components/Layout';
import type { PageKey } from './components/Layout';
import { AccountsPage } from './pages/AccountsPage';
import { DashboardPage } from './pages/DashboardPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { RecurringRulesPage } from './pages/RecurringRulesPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { BudgetsPage } from './pages/BudgetsPage';

function App() {
  const [page, setPage] = useState<PageKey>('dashboard');

  let content;
  switch (page) {
    case 'accounts':
      content = <AccountsPage />;
      break;
    case 'transactions':
      content = <TransactionsPage />;
      break;
    case 'recurring':
      content = <RecurringRulesPage />;
      break;
    case 'analytics':
      content = <AnalyticsPage />;
      break;
    case 'budgets':
      content = <BudgetsPage />;
      break;
    case 'dashboard':
    default:
      content = <DashboardPage />;
  }

  return (
    <Layout currentPage={page} onChangePage={setPage}>
      {content}
    </Layout>
  );
}

export default App;
