import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Tag } from '../api/types';
import { EmptyState } from '../components/EmptyState';
import { SidePanel } from '../components/SidePanel';

const ACCENT_COLORS = ['neon-green', 'neon-indigo', 'neon-amber', 'neon-cyan', 'neon-orange', 'neon-rose'];
const ACCENT_HEX = ['#00ff88', '#818cf8', '#f59e0b', '#22d3ee', '#f97316', '#f472b6'];

type TagForm = { name: string; color: string };

const DEFAULT_COLOR = '#00ff88';

export function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [selected, setSelected] = useState<Tag | null>(null);
  const [form, setForm] = useState<TagForm | null>(null);
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

  const openCreate = () => {
    setSelected(null);
    setForm({ name: '', color: DEFAULT_COLOR });
  };

  const openEdit = (tag: Tag) => {
    setSelected(tag);
    setForm({ name: tag.name, color: tag.color ?? DEFAULT_COLOR });
  };

  const closePanel = () => {
    setForm(null);
    setSelected(null);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!form || !form.name.trim()) return;
    setError(null);
    setSaving(true);
    try {
      const payload = { name: form.name, color: form.color || null };
      if (selected) {
        await api.updateTag(selected.id, payload);
      } else {
        await api.createTag(payload);
      }
      closePanel();
      void load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    if (!window.confirm(`Delete tag "${selected.name}"?`)) return;
    setError(null);
    setSaving(true);
    try {
      await api.deleteTag(selected.id);
      closePanel();
      void load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-neon-text">Tags</h1>
          <p className="text-[11px] text-neon-text-muted mt-0.5">Label transactions with custom tags</p>
        </div>
        <button
          onClick={openCreate}
          disabled={loading || saving}
          className="flex h-8 w-8 items-center justify-center rounded-lg
                     bg-neon-green/10 border border-neon-green/20
                     text-neon-green text-lg font-bold
                     hover:bg-neon-green/20 transition-colors
                     disabled:opacity-40 disabled:cursor-not-allowed"
        >
          +
        </button>
      </div>

      {/* Error banner */}
      {error && !form && (
        <div className="rounded-lg border border-neon-red/20 bg-neon-red/5 px-4 py-2.5 text-xs text-neon-red">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <p className="text-xs text-neon-text-muted py-8 text-center">Loading tags...</p>
      )}

      {/* Empty state */}
      {!loading && tags.length === 0 && (
        <EmptyState message="No tags yet" actionLabel="Create your first tag" onAction={openCreate} />
      )}

      {/* Tag list - horizontal strips */}
      {!loading && tags.length > 0 && (
        <div className="flex flex-col">
          {tags.map((tag, i) => {
            const accent = tag.color ?? ACCENT_HEX[i % ACCENT_HEX.length];
            const isActive = selected?.id === tag.id;
            return (
              <button
                key={tag.id}
                onClick={() => openEdit(tag)}
                className={`group flex items-center gap-3 px-4 py-3
                           border-l-2 text-left transition-all
                           ${isActive
                             ? 'bg-[rgba(255,255,255,0.04)] border-l-current'
                             : 'border-l-transparent hover:bg-[rgba(255,255,255,0.02)] hover:border-l-current'
                           }`}
                style={{ borderLeftColor: isActive ? accent : undefined, ['--tw-border-opacity' as string]: 1 }}
              >
                {/* Color dot */}
                <span
                  className="h-3 w-3 shrink-0 rounded-full ring-1 ring-white/10"
                  style={{ background: accent }}
                />
                {/* Name */}
                <span className="text-sm text-neon-text">{tag.name}</span>
                {/* Subtle hover indicator */}
                <span className="ml-auto text-[10px] text-neon-text-muted opacity-0 group-hover:opacity-60 transition-opacity">
                  edit
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Side Panel */}
      <SidePanel open={form !== null} onClose={closePanel}>
        {form && (
          <div className="flex flex-col gap-5">
            {/* Panel title */}
            <h2 className="text-sm font-semibold text-neon-text">
              {selected ? 'Edit tag' : 'New tag'}
            </h2>

            {/* Error inside panel */}
            {error && (
              <div className="rounded-lg border border-neon-red/20 bg-neon-red/5 px-3 py-2 text-xs text-neon-red">
                {error}
              </div>
            )}

            {/* Color preview */}
            <div className="flex items-center gap-3">
              <span
                className="h-8 w-8 rounded-full ring-2 ring-white/10"
                style={{ background: form.color || DEFAULT_COLOR }}
              />
              <span className="text-sm font-medium text-neon-text">
                {form.name || 'Untitled'}
              </span>
            </div>

            {/* Name input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] uppercase tracking-[2px] text-neon-text-muted">Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm(prev => prev ? { ...prev, name: e.target.value } : prev)}
                placeholder="e.g. Groceries"
                className="w-full rounded-md border border-neon-border bg-neon-elevated px-3 py-2
                           text-sm text-neon-text placeholder:text-neon-text-muted/40
                           focus:border-neon-border-active focus:outline-none transition-colors"
              />
            </div>

            {/* Color picker */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] uppercase tracking-[2px] text-neon-text-muted">Color</label>
              <div className="flex items-center gap-2.5">
                <input
                  type="color"
                  value={form.color || DEFAULT_COLOR}
                  onChange={(e) => setForm(prev => prev ? { ...prev, color: e.target.value } : prev)}
                  className="h-9 w-9 cursor-pointer rounded border-0 bg-transparent p-0"
                />
                <input
                  value={form.color}
                  onChange={(e) => setForm(prev => prev ? { ...prev, color: e.target.value } : prev)}
                  placeholder="#00ff88"
                  className="flex-1 rounded-md border border-neon-border bg-neon-elevated px-3 py-2
                             text-sm text-neon-text font-mono placeholder:text-neon-text-muted/40
                             focus:border-neon-border-active focus:outline-none transition-colors"
                />
              </div>
              {/* Preset swatches */}
              <div className="flex gap-1.5 mt-1">
                {ACCENT_HEX.map((hex, i) => (
                  <button
                    key={ACCENT_COLORS[i]}
                    onClick={() => setForm(prev => prev ? { ...prev, color: hex } : prev)}
                    className={`h-5 w-5 rounded-full transition-transform hover:scale-125
                               ${form.color === hex ? 'ring-2 ring-white/30 scale-110' : 'ring-1 ring-white/10'}`}
                    style={{ background: hex }}
                    title={ACCENT_COLORS[i]}
                  />
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 mt-2">
              <button
                onClick={() => void handleSubmit()}
                disabled={saving || !form.name.trim()}
                className="w-full rounded-md bg-neon-green/10 border border-neon-green/20
                           px-4 py-2 text-xs font-medium text-neon-green
                           hover:bg-neon-green/20 transition-colors
                           disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              {selected && (
                <button
                  onClick={() => void handleDelete()}
                  disabled={saving}
                  className="w-full rounded-md bg-neon-red/5 border border-neon-red/15
                             px-4 py-2 text-xs font-medium text-neon-red
                             hover:bg-neon-red/10 transition-colors
                             disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        )}
      </SidePanel>
    </div>
  );
}
