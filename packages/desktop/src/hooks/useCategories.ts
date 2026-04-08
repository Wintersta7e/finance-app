import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Category } from '../api/types';
import { useIsMounted } from './useIsMounted';

export function useCategories() {
  const isMounted = useIsMounted();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getCategories();
      if (!isMounted()) return;
      setCategories(data);
      setError(null);
    } catch (err) {
      if (!isMounted()) return;
      setError((err as Error).message);
    } finally {
      if (isMounted()) setLoading(false);
    }
  }, [isMounted]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const createCategoryInline = useCallback(async (payload: Omit<Category, 'id'>) => {
    const created = await api.createCategory(payload);
    if (isMounted()) {
      setCategories((prev) => [...prev, created]);
    }
    return created;
  }, [isMounted]);

  return { categories, loading, error, reload, createCategoryInline };
}
