interface EmptyStateProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <p className="text-sm text-neon-text-muted">{message}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-4 rounded-md bg-neon-green/10 border border-neon-green/15
                     px-4 py-2 text-xs font-medium text-neon-green
                     hover:bg-neon-green/15 transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
