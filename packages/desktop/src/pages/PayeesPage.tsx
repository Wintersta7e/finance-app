import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Payee } from '../api/types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { FormField } from '../components/ui/FormField';
import { Modal } from '../components/ui/Modal';
import { Page } from '../components/ui/Page';
import { tokens } from '../theme';

type PayeeForm = Omit<Payee, 'id'>;

const emptyForm: PayeeForm = { name: '', notes: '' };

export function PayeesPage() {
  const [payees, setPayees] = useState<Payee[]>([]);
  const [form, setForm] = useState<PayeeForm | null>(null);
  const [editing, setEditing] = useState<Payee | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setPayees(await api.getPayees());
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); };
  const openEdit = (payee: Payee) => { setEditing(payee); setForm({ name: payee.name, notes: payee.notes }); };
  const closeModal = () => { setForm(null); setEditing(null); setError(null); };

  const handleSubmit = async () => {
    if (!form || !form.name.trim()) return;
    setError(null);
    setSaving(true);
    try {
      if (editing) {
        await api.updatePayee(editing.id, form);
      } else {
        await api.createPayee(form);
      }
      closeModal();
      void load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (payee: Payee) => {
    if (!window.confirm(`Delete payee "${payee.name}"?`)) return;
    setError(null);
    setSaving(true);
    try {
      await api.deletePayee(payee.id);
      void load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page
      title="Payees"
      subtitle="Manage merchants and recipients"
      actions={<Button onClick={openCreate} disabled={loading || saving}>+ Add payee</Button>}
    >
      <Card>
        {error && <span style={{ color: tokens.colors.danger }}>Error: {error}</span>}
        {loading && <span style={{ color: tokens.colors.textMuted }}>Loading payees…</span>}
        {!loading && payees.length === 0 && <span style={{ color: tokens.colors.textMuted }}>No payees yet.</span>}

        {payees.length > 0 && (
          <div style={{ overflowX: 'auto', marginTop: '0.5rem' }}>
            <table style={{ minWidth: '540px' }}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payees.map((payee) => (
                  <tr key={payee.id}>
                    <td>{payee.name}</td>
                    <td style={{ color: payee.notes ? tokens.colors.textPrimary : tokens.colors.textMuted }}>
                      {payee.notes || '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.45rem' }}>
                        <Button variant="ghost" onClick={() => openEdit(payee)} style={{ padding: '0.35rem 0.6rem' }}>Edit</Button>
                        <Button variant="danger" onClick={() => handleDelete(payee)} style={{ padding: '0.35rem 0.6rem' }}>Delete</Button>
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
        title={editing ? 'Edit payee' : 'Add payee'}
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
            <FormField label="Notes (optional)">
              <textarea
                value={form.notes || ''}
                onChange={(e) => setForm(prev => prev ? { ...prev, notes: e.target.value || null } : prev)}
                rows={3}
                style={{ resize: 'vertical' }}
              />
            </FormField>
          </div>
        )}
      </Modal>
    </Page>
  );
}
