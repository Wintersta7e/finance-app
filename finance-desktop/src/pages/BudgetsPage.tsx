import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import type { Budget, Category } from '../api/types';

type BudgetForm = Omit<Budget, 'id'>;

function emptyForm(categories: Category[]): BudgetForm {
  return {
    categoryId: categories[0]?.id ?? 0,
    amount: 0,
    period: 'MONTHLY',
    effectiveFrom: new Date().toISOString().slice(0, 10),
    effectiveTo: '',
  };
}

export function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<BudgetForm | null>(null);
  const [editing, setEditing] = useState<Budget | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const categoryNames = useMemo(
    () => new Map(categories.map((c) => [c.id, c.name])),
    [categories],
  );

  useEffect(() => {
    load();
  }, []);

  function load() {
    setLoading(true);
    Promise.all([api.getBudgets(), api.getCategories()])
      .then(([b, c]) => {
        setBudgets(b);
        setCategories(c);
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyForm(categories));
  }

  function openEdit(budget: Budget) {
    setEditing(budget);
    setForm({
      ...budget,
      effectiveTo: budget.effectiveTo ?? '',
    });
  }

  function handleSubmit() {
    if (!form) return;

    const payload = { ...form, effectiveTo: form.effectiveTo || null };
    setSaving(true);
    const request = editing ? api.updateBudget(editing.id, payload) : api.createBudget(payload);
    request
      .then(() => {
        setForm(null);
        setEditing(null);
        load();
      })
      .catch((err) => setError(err.message))
      .finally(() => setSaving(false));
  }

  function handleDelete(budget: Budget) {
    if (!window.confirm('Delete this budget?')) return;
    setSaving(true);
    api
      .deleteBudget(budget.id)
      .then(load)
      .catch((err) => setError(err.message))
      .finally(() => setSaving(false));
  }

  const showModal = form !== null;

  return (
    <div>
      <h1>Budgets</h1>
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      {loading && <p>Loading budgets…</p>}

      <div style={{ marginBottom: '1rem' }}>
        <button onClick={openCreate} disabled={categories.length === 0}>
          + Add budget
        </button>
      </div>

      {!loading && budgets.length === 0 && <p>No budgets yet.</p>}

      {budgets.length > 0 && (
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: '760px' }}>
          <thead>
            <tr>
              {['Category', 'Period', 'Amount', 'Effective from', 'Effective to', 'Actions'].map((header) => (
                <th key={header} style={{ borderBottom: '1px solid #ddd', textAlign: 'left', padding: '0.5rem' }}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {budgets.map((b) => (
              <tr key={b.id}>
                <td style={{ borderBottom: '1px solid #eee', padding: '0.5rem' }}>
                  {categoryNames.get(b.categoryId) ?? `Category ${b.categoryId}`}
                </td>
                <td style={{ borderBottom: '1px solid #eee', padding: '0.5rem' }}>{b.period}</td>
                <td style={{ borderBottom: '1px solid #eee', padding: '0.5rem' }}>{b.amount.toFixed(2)}</td>
                <td style={{ borderBottom: '1px solid #eee', padding: '0.5rem' }}>{b.effectiveFrom}</td>
                <td style={{ borderBottom: '1px solid #eee', padding: '0.5rem' }}>{b.effectiveTo ?? '—'}</td>
                <td style={{ borderBottom: '1px solid #eee', padding: '0.5rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => openEdit(b)} disabled={saving}>
                      Edit
                    </button>
                    <button onClick={() => handleDelete(b)} disabled={saving}>
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
            <h2 style={{ marginTop: 0 }}>{editing ? 'Edit budget' : 'Add budget'}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
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
                Period
                <select
                  value={form.period}
                  onChange={(e) => setForm({ ...form, period: e.target.value })}
                >
                  <option value="MONTHLY">MONTHLY</option>
                </select>
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                Effective from
                <input
                  type="date"
                  value={form.effectiveFrom}
                  onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                Effective to (optional)
                <input
                  type="date"
                  value={form.effectiveTo ?? ''}
                  onChange={(e) => setForm({ ...form, effectiveTo: e.target.value })}
                />
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
