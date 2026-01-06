import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import type { Budget, Category } from '../api/types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { FormField } from '../components/ui/FormField';
import { Modal } from '../components/ui/Modal';
import { Page } from '../components/ui/Page';
import { useCategories } from '../hooks/useCategories';
import { tokens } from '../theme';

type BudgetForm = Omit<Budget, 'id' | 'categoryId' | 'amount'> & { categoryId: number | null; amount: string };
type CategoryDraft = Omit<Category, 'id'>;

const ADD_NEW_CATEGORY_VALUE = '__add_new__';

function emptyForm(categories: Category[]): BudgetForm {
  return {
    categoryId: categories[0]?.id ?? null,
    amount: '',
    period: 'MONTHLY',
    effectiveFrom: new Date().toISOString().slice(0, 10),
    effectiveTo: '',
  };
}

export function BudgetsPage() {
  const { categories, loading: categoriesLoading, error: categoriesError, reload: reloadCategories, createCategoryInline } = useCategories();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [form, setForm] = useState<BudgetForm | null>(null);
  const [editing, setEditing] = useState<Budget | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categoryDraft, setCategoryDraft] = useState<CategoryDraft>({ name: '', kind: 'EXPENSE', fixedCost: false });

  const categoryNames = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const b = await api.getBudgets();
      setBudgets(b);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm(categories));
  };

  const openEdit = (budget: Budget) => {
    setEditing(budget);
    setForm({
      ...budget,
      amount: budget.amount.toString(),
      effectiveTo: budget.effectiveTo ?? '',
    });
  };

  const closeModal = () => {
    setForm(null);
    setEditing(null);
  };

  const handleSubmit = () => {
    if (!form) return;
    if (form.categoryId == null) {
      setError('Select a category');
      return;
    }

    const parsedAmount = parseAmount(form.amount);
    if (Number.isNaN(parsedAmount) || parsedAmount === 0) {
      setError('Enter a valid amount');
      return;
    }

    const payload: Omit<Budget, 'id'> = {
      ...form,
      categoryId: form.categoryId as number,
      amount: parsedAmount,
      effectiveTo: form.effectiveTo || null,
    };
    setSaving(true);
    const request = editing ? api.updateBudget(editing.id, payload) : api.createBudget(payload);
    request
      .then(() => {
        closeModal();
        load();
      })
      .catch((err) => setError(err.message))
      .finally(() => setSaving(false));
  };

  const handleDelete = (budget: Budget) => {
    if (!window.confirm('Delete this budget?')) return;
    setSaving(true);
    api
      .deleteBudget(budget.id)
      .then(load)
      .catch((err) => setError(err.message))
      .finally(() => setSaving(false));
  };

  const handleCategoryChange = (value: string) => {
    if (!form) return;
    if (value === ADD_NEW_CATEGORY_VALUE) {
      setCategoryDraft({ name: '', kind: 'EXPENSE', fixedCost: true });
      setCategoryModalOpen(true);
      return;
    }
    setForm({ ...form, categoryId: value ? Number(value) : null });
  };

  const handleCreateCategory = async () => {
    if (!categoryDraft.name.trim()) {
      setError('Category name is required');
      return;
    }
    try {
      const created = await createCategoryInline(categoryDraft);
      await reloadCategories();
      setForm((prev) => (prev ? { ...prev, categoryId: created.id } : prev));
      setCategoryModalOpen(false);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const showModal = form !== null;

  return (
    <Page
      title="Budgets"
      subtitle="Keep spending in line"
      actions={
        <Button onClick={openCreate} disabled={loading}>
          + Add budget
        </Button>
      }
    >
      {error && <Card><span style={{ color: tokens.colors.danger }}>Error: {error}</span></Card>}
      {categoriesError && <Card><span style={{ color: tokens.colors.danger }}>Error: {categoriesError}</span></Card>}

      <Card title="Active budgets" subtitle="Current and scheduled">
        {loading && <span style={{ color: tokens.colors.textMuted }}>Loading budgets…</span>}
        {!loading && budgets.length === 0 && <span style={{ color: tokens.colors.textMuted }}>No budgets yet.</span>}

        {budgets.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ minWidth: '780px' }}>
              <thead>
                <tr>
                  {['Category', 'Period', 'Amount', 'Effective from', 'Effective to', 'Actions'].map((header) => (
                    <th key={header}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {budgets.map((b) => (
                  <tr key={b.id}>
                    <td>{categoryNames.get(b.categoryId) ?? `Category ${b.categoryId}`}</td>
                    <td>{b.period}</td>
                    <td>{b.amount.toFixed(2)}</td>
                    <td>{b.effectiveFrom}</td>
                    <td>{b.effectiveTo ?? '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.45rem' }}>
                        <Button variant="ghost" onClick={() => openEdit(b)} disabled={saving} style={{ padding: '0.4rem 0.65rem' }}>
                          Edit
                        </Button>
                        <Button variant="danger" onClick={() => handleDelete(b)} disabled={saving} style={{ padding: '0.4rem 0.65rem' }}>
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        title={editing ? 'Edit budget' : 'Add budget'}
        open={showModal && !!form}
        onClose={closeModal}
        footer={
          <>
            <Button variant="ghost" onClick={closeModal} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </>
        }
      >
        {form && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <FormField label="Category">
              <select
                value={form.categoryId ?? ''}
                onChange={(e) => handleCategoryChange(e.target.value)}
                disabled={categoriesLoading}
              >
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
                <option value={ADD_NEW_CATEGORY_VALUE}>+ Add new category…</option>
              </select>
            </FormField>
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
            <FormField label="Period">
              <select value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })}>
                <option value="MONTHLY">MONTHLY</option>
              </select>
            </FormField>
            <FormField label="Effective from">
              <input
                type="date"
                value={form.effectiveFrom}
                onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })}
              />
            </FormField>
            <FormField label="Effective to (optional)">
              <input
                type="date"
                value={form.effectiveTo ?? ''}
                onChange={(e) => setForm({ ...form, effectiveTo: e.target.value })}
              />
            </FormField>
          </div>
        )}
      </Modal>

      <Modal
        title="Add category"
        open={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        zIndex={60}
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
    </Page>
  );
}

function parseAmount(value: string) {
  if (value == null) return Number.NaN;
  const normalized = value.replace(',', '.');
  return Number(normalized);
}
