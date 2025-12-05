import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Transaction } from '../api/types';
import { Card } from '../components/ui/Card';
import { Page } from '../components/ui/Page';
import { tokens } from '../theme';
import { Button } from '../components/ui/Button';
import { QuickTransactionForm } from '../components/transactions/QuickTransactionForm';

function formatDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

interface TransactionsPageProps {
  onDataChanged: () => void;
}

export function TransactionsPage({ onDataChanged }: TransactionsPageProps) {
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadTransactions = useCallback(() => {
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

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const handleTransactionAdded = () => {
    loadTransactions();
    onDataChanged();
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this transaction?')) return;
    setDeletingId(id);
    try {
      await api.deleteTransaction(id);
      loadTransactions();
      onDataChanged();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Page title="Transactions" subtitle="Current month">
      <QuickTransactionForm onChange={handleTransactionAdded} />
      <Card>
        {error && <span style={{ color: tokens.colors.danger }}>Error: {error}</span>}
        {!error && txs.length === 0 && <span style={{ color: tokens.colors.textMuted }}>No transactions in this period.</span>}
        {txs.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ minWidth: '820px' }}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th>Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {txs.map((t) => (
                  <tr key={t.id}>
                    <td>{t.date}</td>
                    <td>{t.type}</td>
                    <td style={{ textAlign: 'right', color: t.amount < 0 ? tokens.colors.danger : tokens.colors.success }}>
                      {t.amount.toFixed(2)}
                    </td>
                    <td style={{ color: tokens.colors.textMuted }}>{t.notes}</td>
                    <td>
                      <Button
                        variant="danger"
                        onClick={() => handleDelete(t.id)}
                        disabled={deletingId === t.id}
                        style={{ padding: '0.4rem 0.65rem' }}
                      >
                        {deletingId === t.id ? 'Deleting…' : 'Delete'}
                      </Button>
                    </td>
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
