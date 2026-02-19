import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Tag } from '../api/types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { FormField } from '../components/ui/FormField';
import { Modal } from '../components/ui/Modal';
import { Page } from '../components/ui/Page';
import { tokens } from '../theme';

type TagForm = Omit<Tag, 'id'>;

const emptyForm: TagForm = { name: '', color: '#38bdf8' };

export function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [form, setForm] = useState<TagForm | null>(null);
  const [editing, setEditing] = useState<Tag | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setTags(await api.getTags());
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); };
  const openEdit = (tag: Tag) => { setEditing(tag); setForm({ name: tag.name, color: tag.color ?? '#38bdf8' }); };
  const closeModal = () => { setForm(null); setEditing(null); setError(null); };

  const handleSubmit = async () => {
    if (!form || !form.name.trim()) return;
    setError(null);
    setSaving(true);
    try {
      if (editing) {
        await api.updateTag(editing.id, form);
      } else {
        await api.createTag(form);
      }
      closeModal();
      void load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (tag: Tag) => {
    if (!window.confirm(`Delete tag "${tag.name}"?`)) return;
    setError(null);
    setSaving(true);
    try {
      await api.deleteTag(tag.id);
      void load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page
      title="Tags"
      subtitle="Label transactions with custom tags"
      actions={<Button onClick={openCreate} disabled={loading || saving}>+ Add tag</Button>}
    >
      <Card>
        {error && <span style={{ color: tokens.colors.danger }}>Error: {error}</span>}
        {loading && <span style={{ color: tokens.colors.textMuted }}>Loading tags…</span>}
        {!loading && tags.length === 0 && <span style={{ color: tokens.colors.textMuted }}>No tags yet.</span>}

        {tags.length > 0 && (
          <div style={{ overflowX: 'auto', marginTop: '0.5rem' }}>
            <table style={{ minWidth: '480px' }}>
              <thead>
                <tr>
                  <th>Color</th>
                  <th>Name</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tags.map((tag) => (
                  <tr key={tag.id}>
                    <td>
                      <span
                        style={{
                          display: 'inline-block',
                          width: 18,
                          height: 18,
                          borderRadius: tokens.radii.sm,
                          background: tag.color || tokens.colors.accent,
                          border: `1px solid ${tokens.colors.borderSoft}`,
                          verticalAlign: 'middle',
                        }}
                      />
                    </td>
                    <td>{tag.name}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.45rem' }}>
                        <Button variant="ghost" onClick={() => openEdit(tag)} style={{ padding: '0.35rem 0.6rem' }}>Edit</Button>
                        <Button variant="danger" onClick={() => handleDelete(tag)} style={{ padding: '0.35rem 0.6rem' }}>Delete</Button>
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
        title={editing ? 'Edit tag' : 'Add tag'}
        open={form !== null}
        onClose={closeModal}
        footer={
          <>
            <Button variant="ghost" onClick={closeModal} disabled={saving}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving || !form?.name.trim()}>{saving ? 'Saving…' : 'Save'}</Button>
          </>
        }
      >
        {form && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <FormField label="Name">
              <input value={form.name} onChange={(e) => setForm(prev => prev ? { ...prev, name: e.target.value } : prev)} />
            </FormField>
            <FormField label="Color">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <input
                  type="color"
                  value={form.color || '#38bdf8'}
                  onChange={(e) => setForm(prev => prev ? { ...prev, color: e.target.value } : prev)}
                  style={{ width: 40, height: 34, padding: 0, border: 'none', cursor: 'pointer' }}
                />
                <input
                  value={form.color || ''}
                  onChange={(e) => setForm(prev => prev ? { ...prev, color: e.target.value } : prev)}
                  placeholder="#38bdf8"
                  style={{ flex: 1 }}
                />
              </div>
            </FormField>
          </div>
        )}
      </Modal>
    </Page>
  );
}
