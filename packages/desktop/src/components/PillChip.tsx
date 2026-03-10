interface PillChipProps {
  label: string;
  color?: string;
  onRemove?: () => void;
}

export function PillChip({ label, color = 'var(--color-neon-indigo)', onRemove }: PillChipProps) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-medium"
      style={{
        background: `color-mix(in srgb, ${color} 12%, transparent)`,
        color,
      }}
    >
      {label}
      {onRemove && (
        <button onClick={onRemove} className="ml-0.5 opacity-50 hover:opacity-100 transition-opacity">×</button>
      )}
    </span>
  );
}
