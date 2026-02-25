import type { StatusLevel } from '@/lib/types';
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/types';

interface Props {
  status: StatusLevel;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'md' }: Props) {
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${sizeClasses} ${
        status === 'operational'
          ? 'bg-emerald-100 text-emerald-800'
          : status === 'degraded'
            ? 'bg-amber-100 text-amber-800'
            : status === 'partial_outage'
              ? 'bg-orange-100 text-orange-800'
              : status === 'major_outage'
                ? 'bg-red-100 text-red-800'
                : 'bg-indigo-100 text-indigo-800'
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${STATUS_COLORS[status]}`}
      />
      {STATUS_LABELS[status]}
    </span>
  );
}
