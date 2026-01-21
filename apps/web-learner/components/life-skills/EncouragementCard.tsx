'use client';

import React, { useState, useEffect } from 'react';
import { Encouragement } from './types';

interface EncouragementCardProps {
  tenantId: string;
  learnerId: string;
  skillId: string;
  apiBaseUrl: string;
}

export function EncouragementCard({
  tenantId,
  learnerId,
  skillId,
  apiBaseUrl,
}: EncouragementCardProps) {
  const [encouragement, setEncouragement] = useState<Encouragement | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchEncouragement() {
      try {
        const res = await fetch(
          `${apiBaseUrl}/ai-coach/encouragement?` +
            new URLSearchParams({
              tenantId,
              learnerId,
              skillId,
            })
        );

        if (res.ok) {
          const data = await res.json();
          setEncouragement(data.encouragement);
        }
      } catch (err) {
        console.error('Failed to fetch encouragement:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchEncouragement();
  }, [apiBaseUrl, tenantId, learnerId, skillId]);

  if (isLoading || !encouragement) {
    return null;
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-6">
      <div className="flex items-start gap-4">
        <span className="text-3xl">{encouragement.celebrationEmoji || '🌟'}</span>
        <div className="flex-1">
          <p className="text-amber-900 font-medium text-lg mb-2">
            {encouragement.message}
          </p>

          {encouragement.motivationalFact && (
            <div className="bg-amber-100 rounded-lg p-3 mb-3">
              <div className="flex items-start gap-2">
                <span>📚</span>
                <p className="text-amber-800 text-sm">{encouragement.motivationalFact}</p>
              </div>
            </div>
          )}

          {encouragement.nextStepSuggestion && (
            <p className="text-amber-700 text-sm italic">
              💡 {encouragement.nextStepSuggestion}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

interface StaticEncouragementCardProps {
  encouragement: Encouragement;
}

export function StaticEncouragementCard({ encouragement }: StaticEncouragementCardProps) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
      <div className="flex items-start gap-4">
        <span className="text-3xl">{encouragement.celebrationEmoji || '🌟'}</span>
        <div className="flex-1">
          <p className="text-amber-900 font-medium text-lg mb-2">
            {encouragement.message}
          </p>

          {encouragement.motivationalFact && (
            <div className="bg-amber-100 rounded-lg p-3 mb-3">
              <div className="flex items-start gap-2">
                <span>📚</span>
                <p className="text-amber-800 text-sm">{encouragement.motivationalFact}</p>
              </div>
            </div>
          )}

          {encouragement.nextStepSuggestion && (
            <p className="text-amber-700 text-sm italic">
              💡 {encouragement.nextStepSuggestion}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
