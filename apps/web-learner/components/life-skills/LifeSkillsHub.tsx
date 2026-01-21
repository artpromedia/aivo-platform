'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { SkillCard } from './SkillCard';
import { ProgressDashboard } from './ProgressDashboard';
import { SafetyPractice } from './SafetyPractice';
import {
  LifeSkill,
  SkillCategory,
  SKILL_CATEGORY_INFO,
  ProgressDashboardData,
} from './types';

interface LifeSkillsHubProps {
  tenantId: string;
  learnerId: string;
  apiBaseUrl: string;
  showSafetySection?: boolean;
  onSkillSelect?: (skill: LifeSkill) => void;
}

type TabType = 'learn' | 'progress' | 'safety';

export function LifeSkillsHub({
  tenantId,
  learnerId,
  apiBaseUrl,
  showSafetySection = true,
  onSkillSelect,
}: LifeSkillsHubProps) {
  const [activeTab, setActiveTab] = useState<TabType>('learn');
  const [skills, setSkills] = useState<LifeSkill[]>([]);
  const [categories, setCategories] = useState<Array<{ category: SkillCategory; count: number }>>([]);
  const [dashboard, setDashboard] = useState<ProgressDashboardData | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<SkillCategory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ tenantId });
      if (selectedCategory) {
        params.set('category', selectedCategory);
      }

      const [skillsRes, categoriesRes, dashboardRes] = await Promise.all([
        fetch(`${apiBaseUrl}/skills?${params}`),
        fetch(`${apiBaseUrl}/skills/categories`),
        fetch(`${apiBaseUrl}/progress/${learnerId}/dashboard?tenantId=${tenantId}`),
      ]);

      if (!skillsRes.ok || !categoriesRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const [skillsData, categoriesData, dashboardData] = await Promise.all([
        skillsRes.json(),
        categoriesRes.json(),
        dashboardRes.ok ? dashboardRes.json() : null,
      ]);

      setSkills(skillsData.skills || []);
      setCategories(categoriesData.categories || []);
      setDashboard(dashboardData?.dashboard || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [apiBaseUrl, tenantId, learnerId, selectedCategory]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const tabs: Array<{ id: TabType; label: string; icon: string }> = [
    { id: 'learn', label: 'Learn', icon: '📚' },
    { id: 'progress', label: 'Progress', icon: '📈' },
    ...(showSafetySection ? [{ id: 'safety' as TabType, label: 'Safety', icon: '🛡️' }] : []),
  ];

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <div className="text-red-500 text-5xl mb-4">⚠️</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h2>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <h1 className="text-2xl font-bold text-gray-900">Life Skills</h1>
          </div>

          {/* Tabs */}
          <div className="flex space-x-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {activeTab === 'learn' && (
              <LearnTab
                skills={skills}
                categories={categories}
                selectedCategory={selectedCategory}
                onCategorySelect={setSelectedCategory}
                onSkillSelect={onSkillSelect}
              />
            )}

            {activeTab === 'progress' && dashboard && (
              <ProgressDashboard
                data={dashboard}
                onCategorySelect={(category) => {
                  setSelectedCategory(category);
                  setActiveTab('learn');
                }}
              />
            )}

            {activeTab === 'safety' && (
              <SafetyPractice
                tenantId={tenantId}
                learnerId={learnerId}
                apiBaseUrl={apiBaseUrl}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

interface LearnTabProps {
  skills: LifeSkill[];
  categories: Array<{ category: SkillCategory; count: number }>;
  selectedCategory: SkillCategory | null;
  onCategorySelect: (category: SkillCategory | null) => void;
  onSkillSelect?: (skill: LifeSkill) => void;
}

function LearnTab({
  skills,
  categories,
  selectedCategory,
  onCategorySelect,
  onSkillSelect,
}: LearnTabProps) {
  return (
    <div className="space-y-8">
      {/* Category filters */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Categories</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onCategorySelect(null)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              selectedCategory === null
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          {categories.map(({ category, count }) => {
            const info = SKILL_CATEGORY_INFO[category];
            return (
              <button
                key={category}
                onClick={() => onCategorySelect(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
                  selectedCategory === category
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span>{info.icon}</span>
                <span>{info.label}</span>
                <span className="text-xs opacity-70">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Skills grid */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {selectedCategory
            ? SKILL_CATEGORY_INFO[selectedCategory].label
            : 'All Skills'}
        </h2>
        {skills.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <div className="text-4xl mb-4">📚</div>
            <p className="text-gray-600">No skills found in this category</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {skills.map((skill) => (
              <SkillCard
                key={skill.id}
                skill={skill}
                onClick={() => onSkillSelect?.(skill)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
