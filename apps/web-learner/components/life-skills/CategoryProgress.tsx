/**
 * Category Progress Component
 * Displays progress for a life skills category
 */

import React from 'react';

export interface CategoryProgressProps {
  category: string;
  progress: number;
  totalSkills: number;
  completedSkills: number;
}

export const CategoryProgress: React.FC<CategoryProgressProps> = ({
  category,
  progress,
  totalSkills,
  completedSkills,
}) => {
  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="font-medium text-lg mb-2">{category}</h3>
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{completedSkills} of {totalSkills} skills</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};
