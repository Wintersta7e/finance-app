import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Transaction } from '../api/types';

function formatDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function TransactionsPage() {
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    api
      .getTransactions(formatDate(from), formatDate(to))
      .then((data) => {
        setTxs(data);
        setError(null);
      })
      .catch((err) => {
        setError(err.message);
      });
  }, []);

  return (
    <div>
      <h1>Transactions (current month)</h1>
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      {!error && txs.length === 0 && <p>No transactions in this period.</p>}
      {txs.length > 0 && (
        <table style={{ marginTop: '1rem', borderCollapse: 'collapse', minWidth: '600px' }}>
          <thead>
            <tr>
              <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left', padding: '0.5rem' }}>Date</th>
              <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left', padding: '0.5rem' }}>Type</th>
              <th style={{ borderBottom: '1px solid #ddd', textAlign: 'right', padding: '0.5rem' }}>Amount</th>
              <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left', padding: '0.5rem' }}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {txs.map((t) => (
              <tr key={t.id}>
                <td style={{ borderBottom: '1px solid #eee', padding: '0.5rem' }}>{t.date}</td>
                <td style={{ borderBottom: '1px solid #eee', padding: '0.5rem' }}>{t.type}</td>
                <td
                  style={{
                    borderBottom: '1px solid #eee',
                    padding: '0.5rem',
                    textAlign: 'right',
                    color: t.amount < 0 ? 'crimson' : 'green',
                  }}
                >
                  {t.amount.toFixed(2)}
                </td>
                <td style={{ borderBottom: '1px solid #eee', padding: '0.5rem' }}>{t.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
