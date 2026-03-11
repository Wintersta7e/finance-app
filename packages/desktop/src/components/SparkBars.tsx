import { motion } from 'framer-motion';

interface SparkBarsProps {
  data: number[];
  color?: string;
  height?: number;
}

export function SparkBars({ data, color = 'var(--color-neon-green)', height = 28 }: SparkBarsProps) {
  if (data.length === 0) return null;
  const max = Math.max(...data, 1);

  return (
    <div className="flex items-end gap-[2px]" style={{ height }}>
      {data.map((val, i) => {
        const pct = (val / max) * 100;
        const opacity = 0.2 + (i / (data.length - 1)) * 0.4;
        const isLast = i === data.length - 1;

        return (
          <motion.div
            key={i}
            className="flex-1 rounded-[1px]"
            style={{
              background: color,
              opacity,
              boxShadow: isLast ? `0 0 6px ${color}` : undefined,
            }}
            initial={{ height: 0 }}
            animate={{ height: `${pct}%` }}
            transition={{ duration: 0.4, delay: i * 0.04, ease: 'easeOut' }}
          />
        );
      })}
    </div>
  );
}
