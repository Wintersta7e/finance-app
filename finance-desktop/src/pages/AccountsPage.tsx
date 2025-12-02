import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Account } from '../api/types';

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
    <div>
      <h1>Accounts</h1>
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      {!error && accounts.length === 0 && <p>No accounts yet.</p>}
      {accounts.length > 0 && (
        <table style={{ marginTop: '1rem', borderCollapse: 'collapse', minWidth: '400px' }}>
          <thead>
            <tr>
              <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left', padding: '0.5rem' }}>Name</th>
              <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left', padding: '0.5rem' }}>Type</th>
              <th style={{ borderBottom: '1px solid #ddd', textAlign: 'right', padding: '0.5rem' }}>
                Initial balance
              </th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={a.id}>
                <td style={{ borderBottom: '1px solid #eee', padding: '0.5rem' }}>{a.name}</td>
                <td style={{ borderBottom: '1px solid #eee', padding: '0.5rem' }}>{a.type}</td>
                <td style={{ borderBottom: '1px solid #eee', padding: '0.5rem', textAlign: 'right' }}>
                  {a.initialBalance.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
