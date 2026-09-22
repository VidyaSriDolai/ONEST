import { useId } from 'react';
import { cn } from '@/lib/cn';

/**
 * Small hand-drawn SVG charts.
 *
 * Deliberately not a charting library: the dashboards need three simple shapes
 * and a library would add far more bundle weight than the charts are worth.
 * Each chart renders an accessible table-equivalent summary for screen readers,
 * because an SVG of bars communicates nothing to them on its own.
 */

export interface SeriesPoint {
  label: string;
  value: number;
}

function niceMax(values: number[]): number {
  const max = Math.max(...values, 0);
  if (max === 0) return 1;
  // Round up to a clean-looking axis top.
  const magnitude = Math.pow(10, Math.floor(Math.log10(max)));
  return Math.ceil(max / magnitude) * magnitude;
}

export function BarChart({
  data,
  height = 180,
  tone = 'brand',
  className,
  caption,
}: {
  data: SeriesPoint[];
  height?: number;
  tone?: 'brand' | 'valid' | 'accent';
  className?: string;
  caption: string;
}) {
  const max = niceMax(data.map((d) => d.value));
  const fill =
    tone === 'valid' ? 'fill-valid-500' : tone === 'accent' ? 'fill-accent-500' : 'fill-brand-500';

  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-ink-500">No data yet.</p>;
  }

  return (
    <figure className={className}>
      <div className="flex items-end gap-1.5" style={{ height }} aria-hidden="true">
        {data.map((point) => {
          const ratio = max === 0 ? 0 : point.value / max;
          return (
            <div key={point.label} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
              <div className="relative flex w-full flex-1 items-end">
                <svg className="w-full" height={height - 28} preserveAspectRatio="none">
                  <rect
                    x="10%"
                    y={(1 - ratio) * (height - 28)}
                    width="80%"
                    height={Math.max(ratio * (height - 28), point.value > 0 ? 3 : 0)}
                    rx="4"
                    className={cn(fill, 'transition-all duration-700')}
                  />
                </svg>
                {point.value > 0 && (
                  <span className="absolute inset-x-0 -top-0.5 text-center text-[10px] font-semibold text-ink-600">
                    {point.value}
                  </span>
                )}
              </div>
              <span className="w-full truncate text-center text-[10px] text-ink-500">
                {point.label}
              </span>
            </div>
          );
        })}
      </div>
      <figcaption className="sr-only">
        {caption}. {data.map((d) => d.label + ': ' + d.value).join('. ')}.
      </figcaption>
    </figure>
  );
}

export function LineChart({
  data,
  height = 180,
  className,
  caption,
}: {
  data: SeriesPoint[];
  height?: number;
  className?: string;
  caption: string;
}) {
  const gradientId = useId();
  const max = niceMax(data.map((d) => d.value));

  if (data.length < 2) {
    return <p className="py-8 text-center text-sm text-ink-500">Not enough data yet.</p>;
  }

  const width = 100;
  const plotHeight = height - 24;
  const points = data.map((point, index) => ({
    x: (index / (data.length - 1)) * width,
    y: plotHeight - (point.value / max) * plotHeight,
  }));

  const line = points.map((p, i) => (i === 0 ? 'M' : 'L') + p.x + ' ' + p.y).join(' ');
  const area = line + ' L' + width + ' ' + plotHeight + ' L0 ' + plotHeight + ' Z';

  return (
    <figure className={className}>
      <svg
        viewBox={'0 0 ' + width + ' ' + plotHeight}
        preserveAspectRatio="none"
        style={{ height: plotHeight, width: '100%' }}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={'url(#' + gradientId + ')'} />
        <path
          d={line}
          fill="none"
          stroke="#4f46e5"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="mt-1.5 flex justify-between" aria-hidden="true">
        {data.map((point, index) =>
          // Thin the labels out so they never collide on a narrow screen.
          index % Math.ceil(data.length / 7) === 0 ? (
            <span key={point.label + index} className="text-[10px] text-ink-500">
              {point.label}
            </span>
          ) : null,
        )}
      </div>
      <figcaption className="sr-only">
        {caption}. {data.map((d) => d.label + ': ' + d.value).join('. ')}.
      </figcaption>
    </figure>
  );
}

const DONUT_COLOURS = ['#4f46e5', '#10b981', '#f59e0b', '#f43f5e', '#6366f1', '#64748b'];

export function DonutChart({
  data,
  size = 160,
  className,
  caption,
}: {
  data: SeriesPoint[];
  size?: number;
  className?: string;
  caption: string;
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  if (total === 0) {
    return <p className="py-8 text-center text-sm text-ink-500">No data yet.</p>;
  }

  const stroke = 22;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <figure className={cn('flex flex-wrap items-center gap-6', className)}>
      <svg width={size} height={size} className="-rotate-90 shrink-0" aria-hidden="true">
        {data.map((point, index) => {
          const fraction = point.value / total;
          const dash = fraction * circumference;
          const element = (
            <circle
              key={point.label}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={DONUT_COLOURS[index % DONUT_COLOURS.length]}
              strokeWidth={stroke}
              strokeDasharray={dash + ' ' + (circumference - dash)}
              strokeDashoffset={-offset}
            />
          );
          offset += dash;
          return element;
        })}
      </svg>

      <ul className="min-w-0 flex-1 space-y-2">
        {data.map((point, index) => (
          <li key={point.label} className="flex items-center gap-2.5 text-sm">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ background: DONUT_COLOURS[index % DONUT_COLOURS.length] }}
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1 truncate text-ink-700">{point.label}</span>
            <span className="font-semibold text-ink-900">{point.value}</span>
            <span className="w-10 text-right text-xs text-ink-500">
              {Math.round((point.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
      <figcaption className="sr-only">
        {caption}. {data.map((d) => d.label + ': ' + d.value).join('. ')}.
      </figcaption>
    </figure>
  );
}
