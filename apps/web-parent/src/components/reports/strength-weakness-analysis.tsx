'use client';

import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  AlertCircle,
  Brain,
  Lightbulb,
  Star,
} from 'lucide-react';
import type { StrengthWeaknessData, SkillAnalysis, SkillProfile } from './types';

interface StrengthWeaknessAnalysisProps {
  data: StrengthWeaknessData;
}

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  if (trend === 'up') return <TrendingUp className="w-4 h-4 text-green-500" />;
  if (trend === 'down') return <TrendingDown className="w-4 h-4 text-red-500" />;
  return <Minus className="w-4 h-4 text-gray-400" />;
}

function SkillCard({ skill, type }: { skill: SkillAnalysis; type: 'strength' | 'weakness' }) {
  const isStrength = type === 'strength';
  const bgColor = isStrength ? 'bg-green-50' : 'bg-amber-50';
  const borderColor = isStrength ? 'border-green-100' : 'border-amber-100';
  const iconColor = isStrength ? 'text-green-600' : 'text-amber-600';
  const scoreColor = isStrength ? 'text-green-700' : 'text-amber-700';

  return (
    <div className={`p-4 rounded-lg border ${bgColor} ${borderColor}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {isStrength ? (
            <Star className={`w-5 h-5 ${iconColor}`} />
          ) : (
            <Target className={`w-5 h-5 ${iconColor}`} />
          )}
          <span className="font-medium text-gray-900">{skill.skill}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className={`font-semibold ${scoreColor}`}>{skill.score}%</span>
          <TrendIcon trend={skill.trend} />
        </div>
      </div>

      <p className="text-sm text-gray-500 mb-1">{skill.subject}</p>
      <p className="text-sm text-gray-700">{skill.description}</p>

      {skill.evidence.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-500 mb-1">Evidence:</p>
          <ul className="text-xs text-gray-600 space-y-1">
            {skill.evidence.map((item, index) => (
              <li key={index} className="flex items-start gap-1">
                <span className="text-gray-400">•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function SkillRadar({ profiles }: { profiles: SkillProfile[] }) {
  const maxScore = 100;

  return (
    <div className="mt-6">
      <h4 className="text-sm font-medium text-gray-700 mb-4">Skills Profile</h4>
      <div className="space-y-4">
        {profiles.map((profile) => (
          <div key={profile.category}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">{profile.category}</span>
              <span className="text-sm text-gray-500">
                {profile.score}/{profile.maxScore}
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${(profile.score / profile.maxScore) * 100}%` }}
              />
            </div>

            {profile.subSkills.length > 0 && (
              <div className="mt-2 ml-4 space-y-2">
                {profile.subSkills.map((subSkill) => (
                  <div key={subSkill.name} className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-32 truncate">{subSkill.name}</span>
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-400 rounded-full transition-all duration-500"
                        style={{ width: `${(subSkill.score / subSkill.maxScore) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-8 text-right">
                      {Math.round((subSkill.score / subSkill.maxScore) * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function StrengthWeaknessAnalysis({ data }: StrengthWeaknessAnalysisProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-purple-100 rounded-lg">
          <Sparkles className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Strength & Weakness Analysis</h2>
          <p className="text-sm text-gray-500">AI-powered learning insights</p>
        </div>
      </div>

      {/* Learning Style */}
      <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-100">
        <div className="flex items-center gap-2 mb-2">
          <Brain className="w-5 h-5 text-purple-600" />
          <h3 className="font-medium text-gray-900">Learning Style</h3>
        </div>
        <p className="text-sm text-gray-700">
          <span className="font-semibold text-purple-700">{data.learningStyle.primary}</span>
          {data.learningStyle.secondary && (
            <> with <span className="font-semibold text-indigo-700">{data.learningStyle.secondary}</span> tendencies</>
          )}
        </p>
        <p className="text-sm text-gray-600 mt-2">{data.learningStyle.description}</p>
      </div>

      {/* Strengths & Weaknesses Grid */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Strengths */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-5 h-5 text-green-600" />
            <h3 className="font-medium text-gray-900">Strengths</h3>
          </div>
          <div className="space-y-3">
            {data.strengths.length > 0 ? (
              data.strengths.map((skill, index) => (
                <SkillCard key={index} skill={skill} type="strength" />
              ))
            ) : (
              <p className="text-sm text-gray-500 py-4 text-center">
                Continue learning to identify strengths
              </p>
            )}
          </div>
        </div>

        {/* Areas for Improvement */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-5 h-5 text-amber-600" />
            <h3 className="font-medium text-gray-900">Areas for Improvement</h3>
          </div>
          <div className="space-y-3">
            {data.weaknesses.length > 0 ? (
              data.weaknesses.map((skill, index) => (
                <SkillCard key={index} skill={skill} type="weakness" />
              ))
            ) : (
              <p className="text-sm text-gray-500 py-4 text-center">
                No areas of concern identified
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Skills Profile */}
      {data.skillsProfile.length > 0 && <SkillRadar profiles={data.skillsProfile} />}

      {/* Recommendations */}
      {data.recommendations.length > 0 && (
        <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-100">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-5 h-5 text-amber-600" />
            <h3 className="font-medium text-gray-900">Personalized Recommendations</h3>
          </div>
          <ul className="space-y-2">
            {data.recommendations.map((rec, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-amber-500 mt-1">•</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
