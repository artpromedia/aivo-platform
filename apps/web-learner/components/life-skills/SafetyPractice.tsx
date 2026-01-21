'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { SafetyScenario } from './SafetyScenario';
import {
  SafetyScenario as SafetyScenarioType,
  SafetyScenarioType as SafetyScenarioTypeEnum,
  SAFETY_SCENARIO_INFO,
} from './types';

interface SafetyPracticeProps {
  tenantId: string;
  learnerId: string;
  apiBaseUrl: string;
}

export function SafetyPractice({
  tenantId,
  learnerId,
  apiBaseUrl,
}: SafetyPracticeProps) {
  const [scenarios, setScenarios] = useState<SafetyScenarioType[]>([]);
  const [recommendedScenario, setRecommendedScenario] = useState<SafetyScenarioType | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<SafetyScenarioType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchScenarios = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [scenariosRes, recommendedRes] = await Promise.all([
        fetch(`${apiBaseUrl}/safety/scenarios?tenantId=${tenantId}`),
        fetch(
          `${apiBaseUrl}/safety/next-practice?tenantId=${tenantId}&learnerId=${learnerId}`
        ).catch(() => null),
      ]);

      if (!scenariosRes.ok) {
        throw new Error('Failed to fetch scenarios');
      }

      const scenariosData = await scenariosRes.json();
      setScenarios(scenariosData.scenarios || []);

      if (recommendedRes?.ok) {
        const recommendedData = await recommendedRes.json();
        setRecommendedScenario(recommendedData.scenario || null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [apiBaseUrl, tenantId, learnerId]);

  useEffect(() => {
    fetchScenarios();
  }, [fetchScenarios]);

  // If a scenario is selected, show the scenario view
  if (selectedScenario) {
    return (
      <SafetyScenario
        tenantId={tenantId}
        learnerId={learnerId}
        scenario={selectedScenario}
        apiBaseUrl={apiBaseUrl}
        onComplete={() => {
          setSelectedScenario(null);
          fetchScenarios(); // Refresh to update recommendations
        }}
        onBack={() => setSelectedScenario(null)}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <div className="text-red-500 text-5xl mb-4">⚠️</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Could not load safety scenarios</h2>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={fetchScenarios}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Group scenarios by type
  const groupedScenarios = scenarios.reduce(
    (acc, scenario) => {
      const type = scenario.scenarioType;
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(scenario);
      return acc;
    },
    {} as Record<SafetyScenarioTypeEnum, SafetyScenarioType[]>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Safety Training</h2>
        <p className="text-gray-600">
          Practice making safe choices in different situations
        </p>
      </div>

      {/* Recommended scenario */}
      {recommendedScenario && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recommended for You</h3>
          <ScenarioCard
            scenario={recommendedScenario}
            isRecommended
            onClick={() => setSelectedScenario(recommendedScenario)}
          />
        </div>
      )}

      {/* All scenarios by type */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">All Safety Scenarios</h3>

        <div className="space-y-6">
          {Object.entries(groupedScenarios).map(([type, typeScenarios]) => {
            const info = SAFETY_SCENARIO_INFO[type as SafetyScenarioTypeEnum];

            return (
              <div key={type}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">{info.icon}</span>
                  <h4 className="font-medium text-gray-900">{info.label}</h4>
                  <span className="text-sm text-gray-500">({typeScenarios.length})</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {typeScenarios.map((scenario) => (
                    <ScenarioCard
                      key={scenario.id}
                      scenario={scenario}
                      onClick={() => setSelectedScenario(scenario)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {scenarios.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <div className="text-4xl mb-4">🛡️</div>
            <p className="text-gray-600">No safety scenarios available yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

interface ScenarioCardProps {
  scenario: SafetyScenarioType;
  isRecommended?: boolean;
  onClick: () => void;
}

function ScenarioCard({ scenario, isRecommended = false, onClick }: ScenarioCardProps) {
  const info = SAFETY_SCENARIO_INFO[scenario.scenarioType];

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border overflow-hidden hover:shadow-md transition-shadow cursor-pointer ${
        isRecommended ? 'border-blue-300 shadow-sm' : 'border-gray-200'
      }`}
    >
      <div className="flex">
        {/* Image/Icon */}
        <div
          className="w-24 h-24 flex-shrink-0 flex items-center justify-center"
          style={{ backgroundColor: `${info.color}15` }}
        >
          {scenario.imageUrl ? (
            <img
              src={scenario.imageUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-4xl">{info.icon}</span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-4">
          {isRecommended && (
            <span className="inline-block px-2 py-0.5 bg-blue-600 text-white text-xs font-semibold rounded mb-2">
              RECOMMENDED
            </span>
          )}
          <h4 className="font-semibold text-gray-900 line-clamp-1">{scenario.title}</h4>
          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
            {scenario.situationDescription}
          </p>
        </div>

        {/* Arrow */}
        <div className="flex items-center pr-4">
          <svg
            className="w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
