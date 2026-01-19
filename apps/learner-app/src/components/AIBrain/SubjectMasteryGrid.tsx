'use client';

import type { SubjectMasteryGridProps } from './types';
import { MasteryMeter } from './MasteryMeter';

/**
 * Grid display of mastery levels across all subjects
 */
export function SubjectMasteryGrid({
  masteryLevels,
  onSubjectClick,
  className = '',
}: SubjectMasteryGridProps) {
  const subjects = Object.entries(masteryLevels);

  if (subjects.length === 0) {
    return (
      <div className={`rounded-xl border-2 border-dashed border-gray-300 p-8 text-center ${className}`}>
        <span className="text-5xl mb-3 block">📊</span>
        <p className="text-gray-500 font-medium">No subjects tracked yet</p>
        <p className="text-sm text-gray-400">Complete lessons to see your progress!</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
        {subjects.map(([subject, data]) => (
          <button
            key={subject}
            onClick={() => onSubjectClick?.(subject)}
            className="group flex flex-col items-center rounded-xl border border-gray-200 bg-white p-4 transition-all hover:border-purple-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-purple-400"
            disabled={!onSubjectClick}
          >
            <MasteryMeter
              subject={subject}
              currentLevel={data.current_level}
              targetLevel={data.target_level}
              streak={data.streak}
              size="sm"
              showLabel={true}
            />
            {onSubjectClick && (
              <span className="mt-2 text-xs text-gray-400 opacity-0 transition-opacity group-hover:opacity-100">
                Click for details →
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
