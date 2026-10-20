export interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  className?: string;
}

/** A small trend line with a soft area and an emphasised last point. Colour comes from `color` (defaults to lens via className). */
export function Sparkline({ values, width = 96, height = 32, className = "text-lens" }: SparklineProps) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const span = Math.max(...values) - min || 1;
  const pts = values.map((y, i) => [(i / (values.length - 1)) * (width - 4) + 2, height - 3 - ((y - min) / span) * (height - 6)]);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const [lx, ly] = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className={`shrink min-w-0 ${className}`} preserveAspectRatio="none" aria-hidden>
      <path d={`${d} L${lx.toFixed(1)} ${height} L2 ${height} Z`} fill="currentColor" opacity={0.1} />
      <path d={d} fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lx} cy={ly} r={3} fill="currentColor" stroke="var(--surface-raised)" strokeWidth={2} />
    </svg>
  );
}
