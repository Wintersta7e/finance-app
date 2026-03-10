import { motion } from 'framer-motion';

interface OrbitalRingProps {
  /** Progress value between 0 and 1 */
  value: number;
  /** Pixel size (width and height) */
  size?: number;
  /** Ring color — a CSS color string */
  color?: string;
  /** Stroke width */
  strokeWidth?: number;
  /** Optional second ring (inner) */
  innerValue?: number;
  innerColor?: string;
  /** Center label */
  label?: string;
}

export function OrbitalRing({
  value,
  size = 60,
  color = 'var(--color-neon-green)',
  strokeWidth = 3,
  innerValue,
  innerColor = 'var(--color-neon-indigo)',
  label,
}: OrbitalRingProps) {
  const center = size / 2;
  const outerRadius = center - strokeWidth;
  const outerCircumference = 2 * Math.PI * outerRadius;
  const outerOffset = outerCircumference * (1 - Math.min(value, 1));

  const innerRadius = outerRadius - strokeWidth - 2;
  const innerCircumference = 2 * Math.PI * innerRadius;
  const innerOffset = innerValue != null
    ? innerCircumference * (1 - Math.min(innerValue, 1))
    : innerCircumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90" style={{ width: size, height: size }}>
        {/* Outer track */}
        <circle cx={center} cy={center} r={outerRadius}
          fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={strokeWidth} />
        {/* Outer progress */}
        <motion.circle cx={center} cy={center} r={outerRadius}
          fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={outerCircumference}
          initial={{ strokeDashoffset: outerCircumference }}
          animate={{ strokeDashoffset: outerOffset }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{ filter: `drop-shadow(0 0 4px ${color})` }}
        />
        {/* Inner track (if innerValue provided) */}
        {innerValue != null && (
          <>
            <circle cx={center} cy={center} r={innerRadius}
              fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={strokeWidth} />
            <motion.circle cx={center} cy={center} r={innerRadius}
              fill="none" stroke={innerColor} strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={innerCircumference}
              initial={{ strokeDashoffset: innerCircumference }}
              animate={{ strokeDashoffset: innerOffset }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
              style={{ filter: `drop-shadow(0 0 4px ${innerColor})` }}
            />
          </>
        )}
      </svg>
      {label && (
        <div className="absolute inset-0 flex items-center justify-center
                        text-[10px] font-bold text-neon-text-secondary">
          {label}
        </div>
      )}
    </div>
  );
}
