import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Account } from '../api/types';
import { Card } from '../components/ui/Card';
import { Page } from '../components/ui/Page';
import { tokens } from '../theme';

export function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getAccounts()
      .then((data) => {
        setAccounts(data);
        setError(null);
      })
      .catch((err) => {
        setError(err.message);
      });
  }, []);

  return (
    <Page title="Accounts" subtitle="Where your balances live">
      <Card>
        {error && <span style={{ color: tokens.colors.danger }}>Error: {error}</span>}
        {!error && accounts.length === 0 && <span style={{ color: tokens.colors.textMuted }}>No accounts yet.</span>}
        {accounts.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ minWidth: '520px' }}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th style={{ textAlign: 'right' }}>Initial balance</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((a) => (
                  <tr key={a.id}>
                    <td>{a.name}</td>
                    <td>{a.type}</td>
                    <td style={{ textAlign: 'right', color: tokens.colors.textPrimary }}>{a.initialBalance.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </Page>
  );
}
