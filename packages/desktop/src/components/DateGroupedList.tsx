import { type ReactNode } from 'react';

interface DateGroupedListProps<T> {
  items: T[];
  getDate: (item: T) => string; // ISO date string
  renderItem: (item: T) => ReactNode;
  keyExtractor: (item: T) => string | number;
}

function formatDateGroup(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const itemDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((today.getTime() - itemDate.getTime()) / 86400000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return itemDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function DateGroupedList<T>({ items, getDate, renderItem, keyExtractor }: DateGroupedListProps<T>) {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const dateKey = getDate(item).slice(0, 10); // YYYY-MM-DD
    const list = groups.get(dateKey) ?? [];
    list.push(item);
    groups.set(dateKey, list);
  }

  return (
    <div className="space-y-4">
      {[...groups.entries()].map(([dateKey, groupItems]) => (
        <div key={dateKey}>
          <div className="text-[10px] uppercase tracking-[2px] text-neon-text-faint mb-2">
            {formatDateGroup(dateKey)}
          </div>
          <div className="space-y-px">
            {groupItems.map((item) => (
              <div key={keyExtractor(item)}>{renderItem(item)}</div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
