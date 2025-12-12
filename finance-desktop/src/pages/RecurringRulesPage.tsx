import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import type { Account, Category, RecurringRule } from '../api/types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { FormField } from '../components/ui/FormField';
import { Modal } from '../components/ui/Modal';
import { Page } from '../components/ui/Page';
import { useCategories } from '../hooks/useCategories';
import { tokens } from '../theme';

type RuleForm = Omit<RecurringRule, 'id' | 'amount' | 'categoryId' | 'note'> & {
  amount: string;
  categoryId: number | null;
  note: string;
};
type CategoryDraft = Omit<Category, 'id'>;

const ADD_NEW_CATEGORY_VALUE = '__add_new__';

function buildEmptyForm(accounts: Account[], categories: Category[]): RuleForm {
  return {
    accountId: accounts[0]?.id ?? 0,
    categoryId: categories[0]?.id ?? null,
    amount: '',
    direction: 'EXPENSE',
    period: 'MONTHLY',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: '',
    autoPost: false,
    note: '',
  };
}

export function RecurringRulesPage() {
  const { categories, loading: categoriesLoading, error: categoriesError, reload: reloadCategories, createCategoryInline } = useCategories();
  const [rules, setRules] = useState<RecurringRule[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [form, setForm] = useState<RuleForm | null>(null);
  const [editingRule, setEditingRule] = useState<RecurringRule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categoryDraft, setCategoryDraft] = useState<CategoryDraft>({ name: '', kind: 'EXPENSE', fixedCost: false });

  const accountNames = useMemo(() => new Map(accounts.map((a) => [a.id, a.name])), [accounts]);
  const categoryNames = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [fetchedRules, fetchedAccounts] = await Promise.all([api.getRecurringRules(), api.getAccounts()]);
      setRules(fetchedRules);
      setAccounts(fetchedAccounts);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const openCreate = () => {
    setEditingRule(null);
    setForm(buildEmptyForm(accounts, categories));
  };

  const openEdit = (rule: RecurringRule) => {
    setEditingRule(rule);
    setForm({
      ...rule,
      endDate: rule.endDate ?? '',
      amount: rule.amount.toString(),
      note: rule.note ?? '',
    });
  };

  const closeModal = () => {
    setForm(null);
    setEditingRule(null);
  };

  const handleSubmit = () => {
    if (!form) {
      return;
    }

    const parsedAmount = parseAmount(form.amount);
    if (Number.isNaN(parsedAmount) || parsedAmount === 0) {
      setError('Enter a valid amount');
      return;
    }

    const payload = {
      ...form,
      amount: parsedAmount,
      endDate: form.endDate || null,
      note: form.note.trim() || null,
    };

    setSaving(true);
    const request = editingRule ? api.updateRecurringRule(editingRule.id, payload) : api.createRecurringRule(payload);

    request
      .then(() => {
        closeModal();
        loadAll();
      })
      .catch((err) => setError(err.message))
      .finally(() => setSaving(false));
  };

  const handleDelete = (rule: RecurringRule) => {
    if (!window.confirm(`Delete recurring rule for ${accountNames.get(rule.accountId) ?? 'account'}?`)) {
      return;
    }
    setSaving(true);
    api
      .deleteRecurringRule(rule.id)
      .then(loadAll)
      .catch((err) => setError(err.message))
      .finally(() => setSaving(false));
  };

  const handleGenerateNext = (rule: RecurringRule) => {
    setSaving(true);
    api
      .generateNextRecurringRule(rule.id)
      .then(() => loadAll())
      .catch((err) => setError(err.message))
      .finally(() => setSaving(false));
  };

  const handleCategoryChange = (value: string) => {
    if (!form) return;
    if (value === ADD_NEW_CATEGORY_VALUE) {
      const inferredKind: CategoryDraft['kind'] = form.direction === 'INCOME' ? 'INCOME' : 'EXPENSE';
      setCategoryDraft({ name: '', kind: inferredKind, fixedCost: inferredKind === 'EXPENSE' });
      setCategoryModalOpen(true);
      return;
    }
    setForm({ ...form, categoryId: Number(value) });
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
      title="Recurring rules"
      subtitle="Automate predictable transactions"
      actions={
        <Button onClick={openCreate} disabled={accounts.length === 0 || loading}>
          + Add rule
        </Button>
      }
    >
      {error && <Card><span style={{ color: tokens.colors.danger }}>Error: {error}</span></Card>}
      {categoriesError && <Card><span style={{ color: tokens.colors.danger }}>Error: {categoriesError}</span></Card>}

      <Card title="Rules" subtitle="Upcoming automation">
        {loading && <span style={{ color: tokens.colors.textMuted }}>Loading rules…</span>}
        {!loading && rules.length === 0 && <span style={{ color: tokens.colors.textMuted }}>No recurring rules yet.</span>}
        {rules.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ minWidth: '1020px' }}>
              <thead>
                <tr>
                  {['Account', 'Category', 'Amount', 'Direction', 'Period', 'Start', 'End', 'Note', 'Auto-post', 'Actions'].map((header) => (
                    <th key={header}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rules.map((rule) => (
                  <tr key={rule.id}>
                    <td>{accountNames.get(rule.accountId) ?? `Account ${rule.accountId}`}</td>
                    <td>{categoryNames.get(rule.categoryId) ?? `Category ${rule.categoryId}`}</td>
                    <td>{rule.amount.toFixed(2)}</td>
                    <td>{rule.direction}</td>
                    <td>{rule.period}</td>
                    <td>{rule.startDate}</td>
                    <td>{rule.endDate ?? '—'}</td>
                    <td>{rule.note || '—'}</td>
                    <td>{rule.autoPost ? 'Yes' : 'No'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                        <Button variant="ghost" onClick={() => handleGenerateNext(rule)} disabled={saving} style={{ padding: '0.4rem 0.65rem' }}>
                          Generate
                        </Button>
                        <Button variant="ghost" onClick={() => openEdit(rule)} disabled={saving} style={{ padding: '0.4rem 0.65rem' }}>
                          Edit
                        </Button>
                        <Button variant="danger" onClick={() => handleDelete(rule)} disabled={saving} style={{ padding: '0.4rem 0.65rem' }}>
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
        title={editingRule ? 'Edit rule' : 'Add rule'}
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
            <FormField label="Account">
              <select value={form.accountId} onChange={(e) => setForm({ ...form, accountId: Number(e.target.value) })}>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </FormField>

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

            <FormField label="Direction">
              <select
                value={form.direction}
                onChange={(e) => setForm({ ...form, direction: e.target.value as RuleForm['direction'] })}
              >
                <option value="INCOME">INCOME</option>
                <option value="EXPENSE">EXPENSE</option>
              </select>
            </FormField>

            <FormField label="Period">
              <select value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value as RuleForm['period'] })}>
                <option value="DAILY">DAILY</option>
                <option value="WEEKLY">WEEKLY</option>
                <option value="MONTHLY">MONTHLY</option>
                <option value="YEARLY">YEARLY</option>
              </select>
            </FormField>

            <FormField label="Start date">
              <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </FormField>

            <FormField label="End date (optional)">
              <input type="date" value={form.endDate ?? ''} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            </FormField>

            <FormField label="Note (optional)">
              <textarea
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                rows={2}
                maxLength={200}
                placeholder="e.g., Rent for downtown apartment"
              />
            </FormField>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: tokens.colors.textMuted, fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={form.autoPost}
                onChange={(e) => setForm({ ...form, autoPost: e.target.checked })}
                style={{ width: 18, height: 18 }}
              />
              Auto-post
            </label>
          </div>
        )}
      </Modal>

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
    </Page>
  );
}

function parseAmount(value: string) {
  if (value == null) return Number.NaN;
  const normalized = value.replace(',', '.');
  return Number(normalized);
}
