'use client';

import React from 'react';
import {
  LifeSkill,
  SKILL_CATEGORY_INFO,
  DIFFICULTY_INFO,
} from './types';

interface SkillCardProps {
  readonly skill: LifeSkill;
  readonly masteryProgress?: number;
  readonly onClick?: () => void;
}

export function SkillCard({ skill, masteryProgress, onClick }: SkillCardProps) {
  const categoryInfo = SKILL_CATEGORY_INFO[skill.category];

  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer group text-left w-full"
    >
      {/* Thumbnail */}
      <div className="relative h-40 bg-gray-100">
        {skill.thumbnailUrl ? (
          <img
            src={skill.thumbnailUrl}
            alt={skill.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-5xl">{categoryInfo.icon}</span>
          </div>
        )}

        {/* Category badge */}
        <div className="absolute top-3 left-3 px-2 py-1 bg-black/60 rounded-full flex items-center gap-1">
          <span className="text-sm">{categoryInfo.icon}</span>
          <span className="text-xs text-white font-medium">{categoryInfo.label}</span>
        </div>

        {/* Progress bar */}
        {masteryProgress !== undefined && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200">
            <div
              className={`h-full transition-all ${getMasteryColor(masteryProgress)}`}
              style={{ width: `${masteryProgress * 100}%` }}
            />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
          {skill.name}
        </h3>
        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{skill.description}</p>

        {/* Footer */}
        <div className="flex items-center justify-between mt-4">
          <DifficultyBadge difficulty={skill.difficulty} />
          {skill.estimatedMinutes && (
            <div className="flex items-center gap-1 text-gray-500 text-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{skill.estimatedMinutes}m</span>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

interface DifficultyBadgeProps {
  readonly difficulty: LifeSkill['difficulty'];
  readonly compact?: boolean;
}

export function DifficultyBadge({ difficulty, compact = false }: DifficultyBadgeProps) {
  const info = DIFFICULTY_INFO[difficulty];
  const colorClasses = getDifficultyColorClasses(difficulty);

  if (compact) {
    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded ${colorClasses}`}>
        {info.label}
      </span>
    );
  }

  return (
    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${colorClasses}`}>
      {info.label}
    </span>
  );
}

function getDifficultyColorClasses(difficulty: string): string {
  switch (difficulty) {
    case 'FOUNDATIONAL':
      return 'bg-green-100 text-green-700';
    case 'EMERGING':
      return 'bg-lime-100 text-lime-700';
    case 'DEVELOPING':
      return 'bg-orange-100 text-orange-700';
    case 'PROFICIENT':
      return 'bg-blue-100 text-blue-700';
    case 'ADVANCED':
      return 'bg-purple-100 text-purple-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

function getMasteryColor(mastery: number): string {
  if (mastery >= 0.8) return 'bg-green-500';
  if (mastery >= 0.5) return 'bg-orange-500';
  return 'bg-blue-500';
}
