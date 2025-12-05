import { useState } from 'react';
import { api } from '../api/client';
import type { Category } from '../api/types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { FormField } from '../components/ui/FormField';
import { Modal } from '../components/ui/Modal';
import { Page } from '../components/ui/Page';
import { useCategories } from '../hooks/useCategories';
import { tokens } from '../theme';

type CategoryForm = Omit<Category, 'id'>;

const emptyForm: CategoryForm = { name: '', kind: 'EXPENSE', fixedCost: false };

export function CategoriesPage() {
  const { categories, loading, error, reload, createCategoryInline } = useCategories();
  const [form, setForm] = useState<CategoryForm | null>(null);
  const [editing, setEditing] = useState<Category | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
  };

  const openEdit = (category: Category) => {
    setEditing(category);
    setForm({ name: category.name, kind: category.kind, fixedCost: category.fixedCost });
  };

  const closeModal = () => {
    setForm(null);
    setEditing(null);
    setActionError(null);
  };

  const handleSubmit = async () => {
    if (!form) return;
    setSaving(true);
    try {
      if (editing) {
        await api.updateCategory(editing.id, form);
      } else {
        await createCategoryInline(form);
      }
      closeModal();
      reload();
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (category: Category) => {
    if (!window.confirm(`Delete category “${category.name}”?`)) return;
    setSaving(true);
    try {
      await api.deleteCategory(category.id);
      reload();
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const modalOpen = form !== null;

  return (
    <Page
      title="Categories"
      subtitle="Manage the labels that appear across budgets, recurring rules, and transactions"
      actions={
        <Button onClick={openCreate} disabled={loading || saving}>
          + Add category
        </Button>
      }
    >
      <Card>
        {error && <span style={{ color: tokens.colors.danger }}>Error: {error}</span>}
        {actionError && !error && <span style={{ color: tokens.colors.danger }}>Error: {actionError}</span>}
        {loading && <span style={{ color: tokens.colors.textMuted }}>Loading categories…</span>}
        {!loading && categories.length === 0 && <span style={{ color: tokens.colors.textMuted }}>No categories yet.</span>}

        {categories.length > 0 && (
          <div style={{ overflowX: 'auto', marginTop: '0.5rem' }}>
            <table style={{ minWidth: '640px' }}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Kind</th>
                  <th>Fixed cost</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat.id}>
                    <td>{cat.name}</td>
                    <td>{cat.kind}</td>
                    <td>{cat.fixedCost ? 'Yes' : 'No'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.45rem' }}>
                        <Button variant="ghost" onClick={() => openEdit(cat)} style={{ padding: '0.35rem 0.6rem' }}>
                          Edit
                        </Button>
                        <Button variant="danger" onClick={() => handleDelete(cat)} style={{ padding: '0.35rem 0.6rem' }}>
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
        title={editing ? 'Edit category' : 'Add category'}
        open={modalOpen}
        onClose={closeModal}
        footer={
          <>
            <Button variant="ghost" onClick={closeModal} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving || !form?.name.trim()}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </>
        }
      >
        {form && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <FormField label="Name">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </FormField>
            <FormField label="Kind">
              <select
                value={form.kind}
                onChange={(e) => setForm({ ...form, kind: e.target.value as CategoryForm['kind'] })}
              >
                <option value="INCOME">Income</option>
                <option value="EXPENSE">Expense</option>
              </select>
            </FormField>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: tokens.colors.textMuted, fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={form.fixedCost}
                onChange={(e) => setForm({ ...form, fixedCost: e.target.checked })}
                style={{ width: 18, height: 18 }}
              />
              Fixed cost
            </label>
          </div>
        )}
      </Modal>
    </Page>
  );
}
