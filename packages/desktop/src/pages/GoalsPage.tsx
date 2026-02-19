import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Goal } from '../api/types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { FormField } from '../components/ui/FormField';
import { Modal } from '../components/ui/Modal';
import { Page } from '../components/ui/Page';
import { tokens } from '../theme';

type GoalForm = {
  name: string;
  targetAmount: string;
  targetDate: string;
  color: string;
};

const emptyForm: GoalForm = { name: '', targetAmount: '', targetDate: '', color: '#22d3ee' };

export function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [form, setForm] = useState<GoalForm | null>(null);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [contributeGoal, setContributeGoal] = useState<Goal | null>(null);
  const [contributeAmount, setContributeAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setGoals(await api.getGoals());
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); };
  const openEdit = (goal: Goal) => {
    setEditing(goal);
    setForm({
      name: goal.name,
      targetAmount: goal.targetAmount.toString(),
      targetDate: goal.targetDate ? goal.targetDate.slice(0, 10) : '',
      color: goal.color || '#22d3ee',
    });
  };
  const closeModal = () => { setForm(null); setEditing(null); setError(null); };

  const handleSubmit = async () => {
    if (!form || !form.name.trim()) return;
    const target = parseFloat(form.targetAmount.replace(',', '.'));
    if (isNaN(target) || target <= 0) { setError('Enter a valid target amount'); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        targetAmount: target,
        targetDate: form.targetDate || null,
        color: form.color || null,
      };
      if (editing) {
        await api.updateGoal(editing.id, payload);
      } else {
        await api.createGoal(payload);
      }
      closeModal();
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (goal: Goal) => {
    if (!window.confirm(`Delete goal "${goal.name}"?`)) return;
    setSaving(true);
    try {
      await api.deleteGoal(goal.id);
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleContribute = async () => {
    if (!contributeGoal) return;
    const amount = parseFloat(contributeAmount.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) { setError('Enter a valid amount'); return; }
    setSaving(true);
    try {
      await api.contributeToGoal(contributeGoal.id, amount);
      setContributeGoal(null);
      setContributeAmount('');
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page
      title="Goals"
      subtitle="Track progress toward savings targets"
      actions={<Button onClick={openCreate} disabled={loading || saving}>+ Add goal</Button>}
    >
      {error && <Card><span style={{ color: tokens.colors.danger }}>Error: {error}</span></Card>}

      <Card>
        {loading && <span style={{ color: tokens.colors.textMuted }}>Loading goals…</span>}
        {!loading && goals.length === 0 && <span style={{ color: tokens.colors.textMuted }}>No goals yet.</span>}

        {goals.length > 0 && (
          <div style={{ overflowX: 'auto', marginTop: '0.5rem' }}>
            <table style={{ minWidth: '780px' }}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Progress</th>
                  <th>Current</th>
                  <th>Target</th>
                  <th>Target date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {goals.map((goal) => {
                  const pct = goal.targetAmount > 0 ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100) : 0;
                  return (
                    <tr key={goal.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              width: 10,
                              height: 10,
                              borderRadius: '50%',
                              background: goal.color || tokens.colors.accent,
                            }}
                          />
                          {goal.name}
                        </div>
                      </td>
                      <td style={{ minWidth: 140 }}>
                        <div style={{
                          background: 'rgba(255,255,255,0.06)',
                          borderRadius: tokens.radii.sm,
                          height: 8,
                          overflow: 'hidden',
                        }}>
                          <div style={{
                            width: `${pct}%`,
                            height: '100%',
                            background: pct >= 100 ? tokens.colors.success : (goal.color || tokens.colors.accent),
                            borderRadius: tokens.radii.sm,
                            transition: 'width 0.3s ease',
                          }} />
                        </div>
                        <span style={{ fontSize: '0.75rem', color: tokens.colors.textMuted }}>{pct.toFixed(0)}%</span>
                      </td>
                      <td>{goal.currentAmount.toFixed(2)}</td>
                      <td>{goal.targetAmount.toFixed(2)}</td>
                      <td>{goal.targetDate ? goal.targetDate.slice(0, 10) : '—'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.45rem' }}>
                          <Button variant="ghost" onClick={() => { setContributeGoal(goal); setContributeAmount(''); }} style={{ padding: '0.35rem 0.6rem' }}>
                            Contribute
                          </Button>
                          <Button variant="ghost" onClick={() => openEdit(goal)} style={{ padding: '0.35rem 0.6rem' }}>Edit</Button>
                          <Button variant="danger" onClick={() => handleDelete(goal)} style={{ padding: '0.35rem 0.6rem' }}>Delete</Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create / Edit modal */}
      <Modal
        title={editing ? 'Edit goal' : 'Add goal'}
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
            <FormField label="Target amount">
              <input
                type="text"
                value={form.targetAmount}
                onChange={(e) => setForm(prev => prev ? { ...prev, targetAmount: e.target.value } : prev)}
                autoComplete="off"
              />
            </FormField>
            <FormField label="Target date (optional)">
              <input
                type="date"
                value={form.targetDate}
                onChange={(e) => setForm(prev => prev ? { ...prev, targetDate: e.target.value } : prev)}
              />
            </FormField>
            <FormField label="Color">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm(prev => prev ? { ...prev, color: e.target.value } : prev)}
                  style={{ width: 40, height: 34, padding: 0, border: 'none', cursor: 'pointer' }}
                />
                <input
                  value={form.color}
                  onChange={(e) => setForm(prev => prev ? { ...prev, color: e.target.value } : prev)}
                  placeholder="#22d3ee"
                  style={{ flex: 1 }}
                />
              </div>
            </FormField>
          </div>
        )}
      </Modal>

      {/* Contribute modal */}
      <Modal
        title={`Contribute to "${contributeGoal?.name}"`}
        open={contributeGoal !== null}
        onClose={() => setContributeGoal(null)}
        zIndex={60}
        footer={
          <>
            <Button variant="ghost" onClick={() => setContributeGoal(null)} disabled={saving}>Cancel</Button>
            <Button onClick={handleContribute} disabled={saving}>{saving ? 'Saving…' : 'Add funds'}</Button>
          </>
        }
      >
        <FormField label="Amount">
          <input
            type="text"
            value={contributeAmount}
            onChange={(e) => setContributeAmount(e.target.value)}
            autoComplete="off"
            placeholder="0.00"
          />
        </FormField>
      </Modal>
    </Page>
  );
}
