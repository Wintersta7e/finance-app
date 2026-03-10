import { motion } from 'framer-motion';

interface GlowBarProps {
  /** Progress 0-1+ (can exceed 1 for over-budget) */
  value: number;
  /** Auto color: green <0.75, amber 0.75-1, red >1. Or provide explicit color. */
  color?: string;
  height?: number;
}

function autoColor(value: number): string {
  if (value > 1) return 'var(--color-neon-red)';
  if (value > 0.75) return 'var(--color-neon-amber)';
  return 'var(--color-neon-green)';
}

export function GlowBar({ value, color, height = 6 }: GlowBarProps) {
  const c = color ?? autoColor(value);
  const pct = Math.min(value, 1) * 100;

  return (
    <div className="w-full rounded-full overflow-hidden"
      style={{ height, background: 'rgba(255,255,255,0.04)' }}>
      <motion.div
        className="h-full rounded-full"
        style={{ background: c, boxShadow: `0 0 8px ${c}` }}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      />
    </div>
  );
}
