import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Calendar } from 'lucide-react';

export type DateRange = '24h' | '7d' | '1m' | '3m' | 'all';

export interface DateRangeOption {
  value: DateRange;
  label: string;
}

export const DATE_RANGE_OPTIONS: DateRangeOption[] = [
  { value: '24h', label: '24 hrs' },
  { value: '7d',  label: '7 days' },
  { value: '1m',  label: '1 month' },
  { value: '3m',  label: '3 months' },
  { value: 'all', label: 'All time' },
];

/** Returns a Date representing the start of the given range from now. */
export function getRangeStart(range: DateRange): Date | null {
  const now = Date.now();
  switch (range) {
    case '24h': return new Date(now - 86_400_000);
    case '7d':  return new Date(now - 7  * 86_400_000);
    case '1m':  return new Date(now - 30 * 86_400_000);
    case '3m':  return new Date(now - 90 * 86_400_000);
    case 'all': return null;
  }
}

/** Filter a list of records by a timestamp field. */
export function filterByRange<T extends Record<string, any>>(
  items: T[],
  range: DateRange,
  field = 'timestamp',
): T[] {
  const start = getRangeStart(range);
  if (!start) return items;
  return items.filter(item => {
    const ts = item[field];
    if (!ts) return false;
    return new Date(ts).getTime() >= start.getTime();
  });
}

/** Bucket items into daily/weekly labels based on range. */
export function bucketByDay<T extends Record<string, any>>(
  items: T[],
  range: DateRange,
  field = 'timestamp',
): { label: string; count: number; date: string }[] {
  const start = getRangeStart(range);
  const buckets: Record<string, number> = {};

  items.forEach(item => {
    const ts = item[field];
    if (!ts) return;
    const d = new Date(ts);
    if (start && d.getTime() < start.getTime()) return;
    const key = d.toISOString().split('T')[0]; // YYYY-MM-DD
    buckets[key] = (buckets[key] || 0) + 1;
  });

  return Object.entries(buckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({
      date,
      count,
      label: new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
        month: 'short', day: 'numeric',
      }),
    }));
}

interface Props {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

export function DateRangeFilter({ value, onChange, className }: Props) {
  return (
    <div className={cn('flex items-center gap-1 bg-background/50 border border-border/40 rounded-lg p-1', className)}>
      <Calendar className="w-3.5 h-3.5 text-muted-foreground ml-1 shrink-0" />
      {DATE_RANGE_OPTIONS.map(opt => (
        <Button
          key={opt.value}
          variant="ghost"
          size="sm"
          onClick={() => onChange(opt.value)}
          className={cn(
            'h-7 px-2.5 text-xs rounded-md transition-all',
            value === opt.value
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {opt.label}
        </Button>
      ))}
    </div>
  );
}
