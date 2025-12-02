import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import type { Account, Category, RecurringRule } from '../api/types';

type RuleForm = Omit<RecurringRule, 'id'>;

function buildEmptyForm(accounts: Account[], categories: Category[]): RuleForm {
  return {
    accountId: accounts[0]?.id ?? 0,
    categoryId: categories[0]?.id ?? 0,
    amount: 0,
    direction: 'EXPENSE',
    period: 'MONTHLY',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: '',
    autoPost: false,
  };
}

export function RecurringRulesPage() {
  const [rules, setRules] = useState<RecurringRule[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<RuleForm | null>(null);
  const [editingRule, setEditingRule] = useState<RecurringRule | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  const accountNames = useMemo(
    () => new Map(accounts.map((a) => [a.id, a.name])),
    [accounts],
  );
  const categoryNames = useMemo(
    () => new Map(categories.map((c) => [c.id, c.name])),
    [categories],
  );

  function loadAll() {
    setLoading(true);
    Promise.all([api.getRecurringRules(), api.getAccounts(), api.getCategories()])
      .then(([fetchedRules, fetchedAccounts, fetchedCategories]) => {
        setRules(fetchedRules);
        setAccounts(fetchedAccounts);
        setCategories(fetchedCategories);
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  function openCreate() {
    setEditingRule(null);
    setForm(buildEmptyForm(accounts, categories));
  }

  function openEdit(rule: RecurringRule) {
    setEditingRule(rule);
    setForm({
      ...rule,
      endDate: rule.endDate ?? '',
    });
  }

  function handleSubmit() {
    if (!form) {
      return;
    }

    const payload = {
      ...form,
      amount: Number(form.amount),
      endDate: form.endDate || null,
    };

    setSaving(true);
    const request = editingRule
      ? api.updateRecurringRule(editingRule.id, payload)
      : api.createRecurringRule(payload);

    request
      .then(() => {
        setForm(null);
        setEditingRule(null);
        loadAll();
      })
      .catch((err) => setError(err.message))
      .finally(() => setSaving(false));
  }

  function handleDelete(rule: RecurringRule) {
    if (!window.confirm(`Delete recurring rule for ${accountNames.get(rule.accountId) ?? 'account'}?`)) {
      return;
    }
    setSaving(true);
    api
      .deleteRecurringRule(rule.id)
      .then(loadAll)
      .catch((err) => setError(err.message))
      .finally(() => setSaving(false));
  }

  function handleGenerateNext(rule: RecurringRule) {
    setSaving(true);
    api
      .generateNextRecurringRule(rule.id)
      .then(() => loadAll())
      .catch((err) => setError(err.message))
      .finally(() => setSaving(false));
  }

  const showModal = form !== null;

  return (
    <div>
      <h1>Recurring Rules</h1>
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      {loading && <p>Loading rules…</p>}

      <div style={{ marginBottom: '1rem' }}>
        <button onClick={openCreate} disabled={accounts.length === 0 || categories.length === 0}>
          + Add rule
        </button>
      </div>

      {!loading && rules.length === 0 && <p>No recurring rules yet.</p>}

      {rules.length > 0 && (
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: '800px' }}>
          <thead>
            <tr>
              {['Account', 'Category', 'Amount', 'Direction', 'Period', 'Start', 'End', 'Auto-post', 'Actions'].map(
                (header) => (
                  <th key={header} style={{ borderBottom: '1px solid #ddd', textAlign: 'left', padding: '0.5rem' }}>
                    {header}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {rules.map((rule) => (
              <tr key={rule.id}>
                <td style={{ borderBottom: '1px solid #eee', padding: '0.5rem' }}>
                  {accountNames.get(rule.accountId) ?? `Account ${rule.accountId}`}
                </td>
                <td style={{ borderBottom: '1px solid #eee', padding: '0.5rem' }}>
                  {categoryNames.get(rule.categoryId) ?? `Category ${rule.categoryId}`}
                </td>
                <td style={{ borderBottom: '1px solid #eee', padding: '0.5rem' }}>{rule.amount.toFixed(2)}</td>
                <td style={{ borderBottom: '1px solid #eee', padding: '0.5rem' }}>{rule.direction}</td>
                <td style={{ borderBottom: '1px solid #eee', padding: '0.5rem' }}>{rule.period}</td>
                <td style={{ borderBottom: '1px solid #eee', padding: '0.5rem' }}>{rule.startDate}</td>
                <td style={{ borderBottom: '1px solid #eee', padding: '0.5rem' }}>{rule.endDate ?? '—'}</td>
                <td style={{ borderBottom: '1px solid #eee', padding: '0.5rem' }}>{rule.autoPost ? 'Yes' : 'No'}</td>
                <td style={{ borderBottom: '1px solid #eee', padding: '0.5rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button onClick={() => handleGenerateNext(rule)} disabled={saving}>
                      Generate next
                    </button>
                    <button onClick={() => openEdit(rule)} disabled={saving}>
                      Edit
                    </button>
                    <button onClick={() => handleDelete(rule)} disabled={saving}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showModal && form && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '8px', width: '420px' }}>
            <h2 style={{ marginTop: 0 }}>{editingRule ? 'Edit rule' : 'Add rule'}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                Account
                <select
                  value={form.accountId}
                  onChange={(e) => setForm({ ...form, accountId: Number(e.target.value) })}
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                Category
                <select
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: Number(e.target.value) })}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                Amount
                <input
                  type="number"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                Direction
                <select
                  value={form.direction}
                  onChange={(e) => setForm({ ...form, direction: e.target.value as RuleForm['direction'] })}
                >
                  <option value="INCOME">INCOME</option>
                  <option value="EXPENSE">EXPENSE</option>
                </select>
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                Period
                <select
                  value={form.period}
                  onChange={(e) => setForm({ ...form, period: e.target.value as RuleForm['period'] })}
                >
                  <option value="WEEKLY">WEEKLY</option>
                  <option value="MONTHLY">MONTHLY</option>
                  <option value="YEARLY">YEARLY</option>
                </select>
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                Start date
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                End date (optional)
                <input
                  type="date"
                  value={form.endDate ?? ''}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                />
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={form.autoPost}
                  onChange={(e) => setForm({ ...form, autoPost: e.target.checked })}
                />
                Auto-post
              </label>
            </div>

            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setForm(null)} disabled={saving}>
                Cancel
              </button>
              <button onClick={handleSubmit} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
