/**
 * IEP Comparison Results Component
 *
 * Displays the comparison between an uploaded IEP and the baseline assessment,
 * allowing parents to review and make a decision.
 */

'use client';

import { useState } from 'react';
import {
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
  ChevronDown,
  ChevronUp,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import type {
  IepComparisonResult,
  DomainComparison,
  GoalAlignment,
  Recommendation,
  IepComparisonDecision,
} from '@/lib/types/iep-upload';
import { useSubmitDecision } from '@/lib/hooks/useIepUpload';

interface IepComparisonResultsProps {
  comparison: IepComparisonResult;
  profileId: string;
  childName?: string;
  onDecisionMade?: (decision: IepComparisonDecision) => void;
}

export function IepComparisonResults({
  comparison,
  profileId,
  childName = 'your child',
  onDecisionMade,
}: IepComparisonResultsProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['summary', 'domains'])
  );
  const [selectedDecision, setSelectedDecision] = useState<Exclude<
    IepComparisonDecision,
    'PENDING'
  > | null>(null);
  const [decisionNotes, setDecisionNotes] = useState('');

  const submitDecision = useSubmitDecision();

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const handleSubmitDecision = async () => {
    if (!selectedDecision) return;

    try {
      await submitDecision.mutateAsync({
        comparisonId: comparison.id,
        decision: selectedDecision,
        notes: decisionNotes || undefined,
        profileId,
      });
      onDecisionMade?.(selectedDecision);
    } catch (error) {
      console.error('Failed to submit decision:', error);
    }
  };

  // If decision already made, show status
  if (comparison.decision !== 'PENDING') {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-6">
        <div className="flex items-start gap-4">
          <CheckCircle className="h-8 w-8 flex-shrink-0 text-green-600" />
          <div>
            <h3 className="text-lg font-semibold text-green-900">Decision Made</h3>
            <p className="mt-1 text-green-700">
              {getDecisionDescription(comparison.decision)}
            </p>
            {comparison.decisionAt && (
              <p className="mt-2 text-sm text-green-600">
                Decision made on {new Date(comparison.decisionAt).toLocaleDateString()}
              </p>
            )}
            {comparison.newIepGenerated && (
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-green-100 p-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-green-800">
                  New IEP has been generated and learning brain is being created!
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Match Score */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Comparison Results</h2>
            <p className="mt-1 text-gray-600">{comparison.summary.headline}</p>
          </div>
          <MatchScoreBadge score={comparison.overallMatchScore} />
        </div>

        {/* Key Insights */}
        {comparison.summary.keyInsights.length > 0 && (
          <div className="mt-4 space-y-2">
            {comparison.summary.keyInsights.map((insight, index) => (
              <div key={index} className="flex items-start gap-2 text-sm text-gray-700">
                <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500" />
                {insight}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary Section */}
      <CollapsibleSection
        title="Assessment Summary"
        isExpanded={expandedSections.has('summary')}
        onToggle={() => toggleSection('summary')}
      >
        <p className="mb-4 text-gray-700">{comparison.summary.overallAssessment}</p>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Strength Areas */}
          <div className="rounded-lg bg-green-50 p-4">
            <h4 className="flex items-center gap-2 font-medium text-green-800">
              <TrendingUp className="h-4 w-4" />
              Strength Areas
            </h4>
            <ul className="mt-2 space-y-1">
              {comparison.summary.strengthAreas.length > 0 ? (
                comparison.summary.strengthAreas.map((area, index) => (
                  <li key={index} className="text-sm text-green-700">
                    {area}
                  </li>
                ))
              ) : (
                <li className="text-sm text-green-600 italic">Areas to be assessed</li>
              )}
            </ul>
          </div>

          {/* Growth Areas */}
          <div className="rounded-lg bg-amber-50 p-4">
            <h4 className="flex items-center gap-2 font-medium text-amber-800">
              <TrendingDown className="h-4 w-4" />
              Growth Areas
            </h4>
            <ul className="mt-2 space-y-1">
              {comparison.summary.growthAreas.length > 0 ? (
                comparison.summary.growthAreas.map((area, index) => (
                  <li key={index} className="text-sm text-amber-700">
                    {area}
                  </li>
                ))
              ) : (
                <li className="text-sm text-amber-600 italic">Areas to be assessed</li>
              )}
            </ul>
          </div>
        </div>
      </CollapsibleSection>

      {/* Domain Comparisons */}
      <CollapsibleSection
        title="Domain-by-Domain Comparison"
        isExpanded={expandedSections.has('domains')}
        onToggle={() => toggleSection('domains')}
      >
        <div className="space-y-3">
          {comparison.domainComparisons.map((domain) => (
            <DomainComparisonRow key={domain.domain} comparison={domain} />
          ))}
        </div>
      </CollapsibleSection>

      {/* Goal Alignment */}
      <CollapsibleSection
        title="IEP Goal Alignment"
        isExpanded={expandedSections.has('goals')}
        onToggle={() => toggleSection('goals')}
      >
        <div className="space-y-3">
          {comparison.goalAlignment.map((goal) => (
            <GoalAlignmentRow key={goal.iepGoalId} alignment={goal} />
          ))}
        </div>
      </CollapsibleSection>

      {/* Recommendations */}
      {comparison.recommendations.length > 0 && (
        <CollapsibleSection
          title="Recommendations"
          isExpanded={expandedSections.has('recommendations')}
          onToggle={() => toggleSection('recommendations')}
        >
          <div className="space-y-3">
            {comparison.recommendations.map((rec, index) => (
              <RecommendationCard key={index} recommendation={rec} />
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Decision Section */}
      <div className="rounded-xl border-2 border-violet-200 bg-violet-50 p-6">
        <h3 className="text-lg font-bold text-gray-900">Make Your Decision</h3>
        <p className="mt-1 text-gray-600">
          Based on the comparison above, how would you like to proceed with {childName}'s
          learning plan?
        </p>

        <div className="mt-4 space-y-3">
          <DecisionOption
            value="AGREE_WITH_SYSTEM"
            selected={selectedDecision === 'AGREE_WITH_SYSTEM'}
            onSelect={setSelectedDecision}
            title="Use System Assessment"
            description="Create a new IEP based on the assessment results. Best if the assessment aligns well with or shows improvements from the existing IEP."
            recommended={comparison.overallMatchScore >= 0.7}
          />

          <DecisionOption
            value="PREFER_EXISTING"
            selected={selectedDecision === 'PREFER_EXISTING'}
            onSelect={setSelectedDecision}
            title="Keep Existing IEP Goals"
            description="Import goals from your existing IEP. Best if you're confident in the current goals and want to maintain continuity."
          />

          <DecisionOption
            value="MERGE_BOTH"
            selected={selectedDecision === 'MERGE_BOTH'}
            onSelect={setSelectedDecision}
            title="Combine Both Sources"
            description="Create a comprehensive plan using goals from both the existing IEP and assessment results."
          />

          <DecisionOption
            value="REQUEST_REVIEW"
            selected={selectedDecision === 'REQUEST_REVIEW'}
            onSelect={setSelectedDecision}
            title="Request Professional Review"
            description="Ask a specialist to review the comparison and provide guidance before proceeding."
            recommended={comparison.overallMatchScore < 0.4}
          />
        </div>

        {/* Notes */}
        <div className="mt-4">
          <label htmlFor="decision-notes" className="block text-sm font-medium text-gray-700">
            Additional Notes (optional)
          </label>
          <textarea
            id="decision-notes"
            value={decisionNotes}
            onChange={(e) => setDecisionNotes(e.target.value)}
            placeholder="Add any notes or concerns about your decision..."
            rows={2}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmitDecision}
          disabled={!selectedDecision || submitDecision.isPending}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-3 font-medium text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitDecision.isPending ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              Confirm Decision
              <ArrowRight className="h-5 w-5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ── Helper Components ───────────────────────────────────────────────────────

function MatchScoreBadge({ score }: { score: number }) {
  const percentage = Math.round(score * 100);
  let color: string;
  let label: string;

  if (percentage >= 80) {
    color = 'bg-green-100 text-green-800 border-green-300';
    label = 'Strong Match';
  } else if (percentage >= 60) {
    color = 'bg-blue-100 text-blue-800 border-blue-300';
    label = 'Good Match';
  } else if (percentage >= 40) {
    color = 'bg-amber-100 text-amber-800 border-amber-300';
    label = 'Moderate Match';
  } else {
    color = 'bg-red-100 text-red-800 border-red-300';
    label = 'Review Needed';
  }

  return (
    <div className={`rounded-lg border px-4 py-2 text-center ${color}`}>
      <div className="text-2xl font-bold">{percentage}%</div>
      <div className="text-xs font-medium">{label}</div>
    </div>
  );
}

function CollapsibleSection({
  title,
  isExpanded,
  onToggle,
  children,
}: {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <h3 className="font-semibold text-gray-900">{title}</h3>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        )}
      </button>
      {isExpanded && <div className="border-t border-gray-100 p-4">{children}</div>}
    </div>
  );
}

function DomainComparisonRow({ comparison }: { comparison: DomainComparison }) {
  const domainLabels: Record<string, string> = {
    ELA: 'English Language Arts',
    MATH: 'Mathematics',
    SCIENCE: 'Science',
    SPEECH: 'Speech & Language',
    SEL: 'Social-Emotional',
  };

  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium text-gray-900">
            {domainLabels[comparison.domain] || comparison.domain}
          </h4>
          <p className="mt-1 text-sm text-gray-600">{comparison.notes}</p>
        </div>
        <div className="flex items-center gap-4">
          <AlignmentIndicator alignment={comparison.alignment} />
          <div className="text-right">
            <div className="text-lg font-semibold text-gray-900">
              {Math.round(comparison.assessmentLevel)}%
            </div>
            <div className="text-xs text-gray-500">{comparison.assessmentLabel}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AlignmentIndicator({
  alignment,
}: {
  alignment: 'ALIGNED' | 'HIGHER' | 'LOWER' | 'UNKNOWN';
}) {
  switch (alignment) {
    case 'ALIGNED':
      return (
        <div className="flex items-center gap-1 text-green-600">
          <CheckCircle className="h-4 w-4" />
          <span className="text-xs font-medium">Aligned</span>
        </div>
      );
    case 'HIGHER':
      return (
        <div className="flex items-center gap-1 text-blue-600">
          <TrendingUp className="h-4 w-4" />
          <span className="text-xs font-medium">Higher</span>
        </div>
      );
    case 'LOWER':
      return (
        <div className="flex items-center gap-1 text-amber-600">
          <TrendingDown className="h-4 w-4" />
          <span className="text-xs font-medium">Lower</span>
        </div>
      );
    default:
      return (
        <div className="flex items-center gap-1 text-gray-400">
          <Minus className="h-4 w-4" />
          <span className="text-xs font-medium">N/A</span>
        </div>
      );
  }
}

function GoalAlignmentRow({ alignment }: { alignment: GoalAlignment }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="text-sm text-gray-900">{alignment.iepGoalDescription}</p>
          <p className="mt-1 text-xs text-gray-500">{alignment.notes}</p>
        </div>
        <div
          className={`flex-shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
            alignment.assessmentSupports
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          {alignment.assessmentSupports ? 'Supported' : 'Review'}
        </div>
      </div>
    </div>
  );
}

function RecommendationCard({ recommendation }: { recommendation: Recommendation }) {
  const priorityColors = {
    HIGH: 'border-red-200 bg-red-50',
    MEDIUM: 'border-amber-200 bg-amber-50',
    LOW: 'border-blue-200 bg-blue-50',
  };

  return (
    <div className={`rounded-lg border p-4 ${priorityColors[recommendation.priority]}`}>
      <div className="flex items-start gap-3">
        <AlertTriangle
          className={`h-5 w-5 flex-shrink-0 ${
            recommendation.priority === 'HIGH'
              ? 'text-red-500'
              : recommendation.priority === 'MEDIUM'
              ? 'text-amber-500'
              : 'text-blue-500'
          }`}
        />
        <div>
          <h4 className="font-medium text-gray-900">{recommendation.title}</h4>
          <p className="mt-1 text-sm text-gray-700">{recommendation.description}</p>
          <p className="mt-2 text-xs text-gray-500">{recommendation.rationale}</p>
        </div>
      </div>
    </div>
  );
}

function DecisionOption({
  value,
  selected,
  onSelect,
  title,
  description,
  recommended,
}: {
  value: Exclude<IepComparisonDecision, 'PENDING'>;
  selected: boolean;
  onSelect: (value: Exclude<IepComparisonDecision, 'PENDING'>) => void;
  title: string;
  description: string;
  recommended?: boolean;
}) {
  return (
    <button
      onClick={() => onSelect(value)}
      className={`w-full rounded-lg border-2 p-4 text-left transition ${
        selected
          ? 'border-violet-500 bg-violet-50'
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 ${
            selected ? 'border-violet-500 bg-violet-500' : 'border-gray-300'
          }`}
        >
          {selected && <CheckCircle className="h-3 w-3 text-white" />}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">{title}</span>
            {recommended && (
              <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                Recommended
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-600">{description}</p>
        </div>
      </div>
    </button>
  );
}

function getDecisionDescription(decision: IepComparisonDecision): string {
  switch (decision) {
    case 'AGREE_WITH_SYSTEM':
      return 'A new IEP is being generated based on the assessment results.';
    case 'PREFER_EXISTING':
      return 'Your existing IEP goals are being imported into the system.';
    case 'MERGE_BOTH':
      return 'A comprehensive IEP combining both sources is being created.';
    case 'REQUEST_REVIEW':
      return 'A specialist will review the comparison and contact you.';
    default:
      return 'Your decision has been recorded.';
  }
}
