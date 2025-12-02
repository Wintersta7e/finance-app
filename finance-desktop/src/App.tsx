import { useState } from 'react';
import { Layout, PageKey } from './components/Layout';
import { AccountsPage } from './pages/AccountsPage';
import { DashboardPage } from './pages/DashboardPage';
import { TransactionsPage } from './pages/TransactionsPage';

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
