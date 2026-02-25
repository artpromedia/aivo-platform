import { CheckCircle2, AlertTriangle, XCircle, Wrench, AlertOctagon } from 'lucide-react';

import type { StatusLevel } from '@/lib/types';
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/types';

const STATUS_ICONS: Record<StatusLevel, React.ReactNode> = {
  operational: <CheckCircle2 className="w-8 h-8 text-status-operational" />,
  degraded: <AlertTriangle className="w-8 h-8 text-status-degraded" />,
  partial_outage: <AlertOctagon className="w-8 h-8 text-status-partial_outage" />,
  major_outage: <XCircle className="w-8 h-8 text-status-major_outage" />,
  maintenance: <Wrench className="w-8 h-8 text-status-maintenance" />,
};

const BANNER_STYLES: Record<StatusLevel, string> = {
  operational: 'bg-emerald-50 border-emerald-200',
  degraded: 'bg-amber-50 border-amber-200',
  partial_outage: 'bg-orange-50 border-orange-200',
  major_outage: 'bg-red-50 border-red-200',
  maintenance: 'bg-indigo-50 border-indigo-200',
};

interface Props {
  status: StatusLevel;
  updatedAt: string;
}

export function OverallStatus({ status, updatedAt }: Props) {
  return (
    <div className={`rounded-xl border-2 p-6 ${BANNER_STYLES[status]}`}>
      <div className="flex items-center gap-4">
        {STATUS_ICONS[status]}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {status === 'operational'
              ? 'All Systems Operational'
              : STATUS_LABELS[status]}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Last updated {new Date(updatedAt).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
