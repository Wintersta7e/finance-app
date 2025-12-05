import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client';
import type { Account, Category, Transaction } from '../../api/types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { FormField } from '../ui/FormField';
import { Modal } from '../ui/Modal';
import { useCategories } from '../../hooks/useCategories';
import { tokens } from '../../theme';

interface QuickTransactionFormProps {
  onChange?: () => void;
}

const ADD_NEW_CATEGORY_VALUE = '__add_new__';

type TransactionKind = 'INCOME' | 'EXPENSE' | 'TRANSFER';

interface TransactionFormState {
  accountId: number;
  categoryId: number | null;
  date: string;
  type: TransactionKind;
  amount: string;
  notes: string;
}

const defaultForm: TransactionFormState = {
  accountId: 0,
  categoryId: null,
  date: new Date().toISOString().slice(0, 10),
  type: 'EXPENSE',
  amount: '',
  notes: '',
};

type CategoryDraft = Omit<Category, 'id'>;

export function QuickTransactionForm({ onChange }: QuickTransactionFormProps) {
  const { categories, loading: categoriesLoading, error: categoriesError, reload: reloadCategories, createCategoryInline } = useCategories();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountsError, setAccountsError] = useState<string | null>(null);
  const [form, setForm] = useState<TransactionFormState>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categoryDraft, setCategoryDraft] = useState<CategoryDraft>({ name: '', kind: 'EXPENSE', fixedCost: false });

  useEffect(() => {
    api
      .getAccounts()
      .then((data) => {
        setAccounts(data);
        setAccountsError(null);
        setForm((prev) => (data.length > 0 && prev.accountId === 0 ? { ...prev, accountId: data[0].id } : prev));
      })
      .catch((err) => setAccountsError(err.message));
  }, []);

  const incomeCategories = useMemo(() => categories.filter((c) => c.kind === 'INCOME'), [categories]);
  const expenseCategories = useMemo(() => categories.filter((c) => c.kind === 'EXPENSE'), [categories]);

  const validate = () => {
    const parsedAmount = parseAmount(form.amount);
    if (!form.accountId) return 'Choose an account';
    if (form.type !== 'TRANSFER' && !form.categoryId) return 'Choose a category';
    if (!form.amount || Number.isNaN(parsedAmount)) return 'Enter an amount';
    if (parsedAmount === 0) return 'Amount must not be zero';
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    const parsedAmount = parseAmount(form.amount);
    const signedAmount =
      form.type === 'EXPENSE' ? -Math.abs(parsedAmount) : Math.abs(parsedAmount);

    const payload: Omit<Transaction, 'id'> = {
      date: form.date,
        amount: signedAmount,
      type: form.type === 'EXPENSE' ? 'EXPENSE' : form.type === 'INCOME' ? 'INCOME' : 'TRANSFER',
      accountId: form.accountId,
      categoryId: form.type === 'TRANSFER' ? null : form.categoryId,
      notes: form.notes.trim() ? form.notes.trim() : null,
      recurringRuleId: null,
    };

    setSaving(true);
    setError(null);
    try {
      await api.createTransaction(payload);
      setForm((prev) => ({
        ...prev,
        amount: '',
        notes: '',
        date: new Date().toISOString().slice(0, 10),
        categoryId: prev.type === 'TRANSFER' ? null : prev.categoryId,
      }));
      onChange?.();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const openCategoryModal = (kind: CategoryDraft['kind']) => {
    setCategoryDraft({ name: '', kind, fixedCost: kind === 'EXPENSE' });
    setCategoryModalOpen(true);
  };

  const handleCreateCategory = async () => {
    if (!categoryDraft.name.trim()) {
      setError('Category name is required');
      return;
    }
    try {
      const created = await createCategoryInline(categoryDraft);
      await reloadCategories();
      setForm((prev) => ({ ...prev, categoryId: created.id }));
      setCategoryModalOpen(false);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleCategoryChange = (value: string) => {
    if (value === ADD_NEW_CATEGORY_VALUE) {
      openCategoryModal(form.type === 'INCOME' ? 'INCOME' : 'EXPENSE');
      return;
    }
    setForm((prev) => ({ ...prev, categoryId: Number(value) }));
  };

  const categoryOptions = form.type === 'INCOME' ? incomeCategories : expenseCategories;

  return (
    <Card title="Add transaction" subtitle="Record an income or expense quickly">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '0.75rem',
          alignItems: 'end',
        }}
      >
        <FormField label="Account">
          <select value={form.accountId} onChange={(e) => setForm({ ...form, accountId: Number(e.target.value) })}>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
          {accountsError && <span style={{ color: tokens.colors.danger }}>{accountsError}</span>}
        </FormField>

        <FormField label="Date">
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </FormField>

        <FormField label="Type">
          <select
            value={form.type}
            onChange={(e) => {
              const nextType = e.target.value as TransactionKind;
              setForm((prev) => ({
                ...prev,
                type: nextType,
                categoryId: nextType === 'TRANSFER' ? null : prev.categoryId,
              }));
            }}
          >
            <option value="INCOME">Income</option>
            <option value="EXPENSE">Expense</option>
            <option value="TRANSFER">Transfer</option>
          </select>
        </FormField>

        {form.type !== 'TRANSFER' && (
          <FormField label="Category">
            <select
              value={form.categoryId ?? ''}
              onChange={(e) => handleCategoryChange(e.target.value)}
              disabled={categoriesLoading}
            >
              <option value="">Select category</option>
              {categoryOptions.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
              <option value={ADD_NEW_CATEGORY_VALUE}>+ Add new category…</option>
            </select>
            {categoriesError && <span style={{ color: tokens.colors.danger }}>{categoriesError}</span>}
          </FormField>
        )}

        <FormField label="Amount">
          <input
            type="text"
            inputMode="decimal"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            autoComplete="off"
            pattern="[0-9]*[.,]?[0-9]*"
          />
        </FormField>

        <FormField label="Notes">
          <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional" />
        </FormField>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button onClick={handleSubmit} disabled={saving || accounts.length === 0}>
            {saving ? 'Adding…' : 'Add transaction'}
          </Button>
        </div>
      </div>
      {error && <div style={{ color: tokens.colors.danger, marginTop: '0.5rem' }}>{error}</div>}

      <Modal
        title="Add category"
        open={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setCategoryModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCategory}>Save</Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <FormField label="Name">
            <input value={categoryDraft.name} onChange={(e) => setCategoryDraft({ ...categoryDraft, name: e.target.value })} />
          </FormField>
          <FormField label="Kind">
            <select
              value={categoryDraft.kind}
              onChange={(e) => setCategoryDraft({ ...categoryDraft, kind: e.target.value as CategoryDraft['kind'] })}
            >
              <option value="INCOME">Income</option>
              <option value="EXPENSE">Expense</option>
            </select>
          </FormField>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: tokens.colors.textMuted, fontWeight: 600 }}>
            <input
              type="checkbox"
              checked={categoryDraft.fixedCost}
              onChange={(e) => setCategoryDraft({ ...categoryDraft, fixedCost: e.target.checked })}
              style={{ width: 18, height: 18 }}
            />
            Fixed cost
          </label>
        </div>
      </Modal>
    </Card>
  );
}

function parseAmount(value: string) {
  if (value == null) return Number.NaN;
  const normalized = value.replace(',', '.');
  return Number(normalized);
}
