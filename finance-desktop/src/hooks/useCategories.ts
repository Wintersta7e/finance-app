import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Category } from '../api/types';

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getCategories();
      setCategories(data);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const createCategoryInline = useCallback(async (payload: Omit<Category, 'id'>) => {
    const created = await api.createCategory(payload);
    setCategories((prev) => [...prev, created]);
    return created;
  }, []);

  return { categories, loading, error, reload, createCategoryInline };
}
