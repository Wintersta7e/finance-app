interface SparkLineProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}

export function SparkLine({
  data,
  color = 'var(--color-neon-green)',
  width = 48,
  height = 16,
}: SparkLineProps) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;

  const points = data
    .map((val, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * height;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.2"
        opacity="0.5"
      />
    </svg>
  );
}
