'use client';

interface Subject {
  subject: string;
  average: number;
  timeSpent: number;
  trend: 'up' | 'down' | 'stable';
}

interface SubjectProgressProps {
  subjects: Subject[];
}

export function SubjectProgress({ subjects }: SubjectProgressProps) {
  const getProgressColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getTrendSymbol = (trend: string) => {
    switch (trend) {
      case 'up':
        return '↑';
      case 'down':
        return '↓';
      default:
        return '→';
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className="space-y-4">
      {subjects.map((subject) => (
        <div key={subject.subject} className="flex items-center gap-4">
          <div className="w-24 text-sm font-medium text-gray-700 truncate">
            {subject.subject}
          </div>
          <div className="flex-1">
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${getProgressColor(subject.average)} transition-all duration-500 progress-animated`}
                style={{ width: `${subject.average}%` }}
                role="progressbar"
                aria-valuenow={subject.average}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${subject.subject}: ${subject.average}%`}
              />
            </div>
          </div>
          <div className="w-12 text-sm font-medium text-gray-900 text-right">
            {subject.average}%
          </div>
          <div className={`w-6 text-center ${getTrendColor(subject.trend)}`}>
            {getTrendSymbol(subject.trend)}
          </div>
        </div>
      ))}
    </div>
  );
}
