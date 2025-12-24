/**
 * Student Risk Dashboard Components
 *
 * Production-ready components for viewing and managing at-risk student predictions.
 * Designed with educator oversight and FERPA compliance in mind.
 *
 * IMPORTANT: These predictions are tools to ASSIST educators, not replace their judgment.
 */

import React from 'react';

// ============================================================================
// Types
// ============================================================================

export type RiskLevel = 'low' | 'moderate' | 'high' | 'critical';
export type RiskTrend = 'increasing' | 'stable' | 'decreasing';
export type InterventionStatus =
  | 'pending_approval'
  | 'approved'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface RiskFactor {
  feature: string;
  category: 'academic' | 'engagement' | 'behavioral' | 'temporal';
  description: string;
  currentValue: number | string;
  contribution: number;
  severity: 'low' | 'medium' | 'high';
  recommendation?: string;
}

export interface ProtectiveFactor {
  feature: string;
  category: string;
  description: string;
  currentValue: number | string;
  contribution: number;
}

export interface StudentRiskPrediction {
  studentId: string;
  studentName: string;
  timestamp: string;
  riskScore: number;
  riskLevel: RiskLevel;
  confidence: number;
  categoryScores: {
    academic: number;
    engagement: number;
    behavioral: number;
    temporal: number;
  };
  topRiskFactors: RiskFactor[];
  protectiveFactors: ProtectiveFactor[];
  riskTrend: RiskTrend;
  previousRiskScore?: number;
  scoreChange?: number;
}

export interface InterventionRecommendation {
  interventionId: string;
  name: string;
  type: string;
  intensity: 'light' | 'moderate' | 'intensive';
  urgency: 'immediate' | 'short_term' | 'medium_term';
  relevanceScore: number;
  expectedEffectiveness: number;
  targetRiskFactors: string[];
  rationale: string;
  implementationNotes: string;
  estimatedDurationDays: number;
  requiresParentConsent: boolean;
  requiresEducatorApproval: boolean;
}

export interface ClassroomRiskSummary {
  totalStudents: number;
  riskDistribution: Record<RiskLevel, number>;
  averageRiskScore: number;
  studentsNeedingAttention: number;
  trendImproving: number;
  trendWorsening: number;
}

// ============================================================================
// Styling Utilities
// ============================================================================

const riskLevelColors: Record<RiskLevel, { bg: string; text: string; border: string }> = {
  low: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  moderate: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  high: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  critical: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
};

const trendIcons: Record<RiskTrend, { icon: string; color: string }> = {
  increasing: { icon: '↑', color: 'text-red-500' },
  stable: { icon: '→', color: 'text-gray-500' },
  decreasing: { icon: '↓', color: 'text-green-500' },
};

// ============================================================================
// Risk Level Badge Component
// ============================================================================

interface RiskLevelBadgeProps {
  level: RiskLevel;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function RiskLevelBadge({
  level,
  size = 'md',
  showLabel = true,
}: RiskLevelBadgeProps): React.JSX.Element {
  const colors = riskLevelColors[level];
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${colors.bg} ${colors.text} ${colors.border} border ${sizeClasses[size]}`}
      role="status"
      aria-label={`Risk level: ${level}`}
    >
      {showLabel && <span className="capitalize">{level}</span>}
    </span>
  );
}

// ============================================================================
// Risk Trend Indicator Component
// ============================================================================

interface RiskTrendIndicatorProps {
  trend: RiskTrend;
  scoreChange?: number;
}

export function RiskTrendIndicator({
  trend,
  scoreChange,
}: RiskTrendIndicatorProps): React.JSX.Element {
  const { icon, color } = trendIcons[trend];

  return (
    <span className={`inline-flex items-center gap-1 ${color}`}>
      <span className="text-lg font-bold">{icon}</span>
      {scoreChange !== undefined && (
        <span className="text-sm">
          ({scoreChange > 0 ? '+' : ''}
          {(scoreChange * 100).toFixed(1)}%)
        </span>
      )}
    </span>
  );
}

// ============================================================================
// Risk Score Gauge Component
// ============================================================================

interface RiskScoreGaugeProps {
  score: number;
  confidence: number;
  size?: 'sm' | 'md' | 'lg';
}

export function RiskScoreGauge({
  score,
  confidence,
  size = 'md',
}: RiskScoreGaugeProps): React.JSX.Element {
  const percentage = score * 100;
  const circumference = 2 * Math.PI * 45; // radius = 45
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const sizeMap = { sm: 80, md: 120, lg: 160 };
  const svgSize = sizeMap[size];

  // Determine color based on score
  let strokeColor = '#22c55e'; // green
  if (score >= 0.75)
    strokeColor = '#ef4444'; // red
  else if (score >= 0.5)
    strokeColor = '#f97316'; // orange
  else if (score >= 0.25) strokeColor = '#eab308'; // yellow

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={svgSize} height={svgSize} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={svgSize / 2}
          cy={svgSize / 2}
          r="45%"
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="10"
        />
        {/* Progress circle */}
        <circle
          cx={svgSize / 2}
          cy={svgSize / 2}
          r="45%"
          fill="none"
          stroke={strokeColor}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold">{Math.round(percentage)}%</span>
        <span className="text-xs text-gray-500">{Math.round(confidence * 100)}% conf.</span>
      </div>
    </div>
  );
}

// ============================================================================
// Risk Factor Card Component
// ============================================================================

interface RiskFactorCardProps {
  factor: RiskFactor;
  onViewDetails?: () => void;
}

export function RiskFactorCard({ factor, onViewDetails }: RiskFactorCardProps): React.JSX.Element {
  const severityColors = {
    low: 'border-yellow-200 bg-yellow-50',
    medium: 'border-orange-200 bg-orange-50',
    high: 'border-red-200 bg-red-50',
  };

  return (
    <div className={`rounded-lg border p-4 ${severityColors[factor.severity]}`} role="article">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-medium text-gray-900">{factor.description}</h4>
          <p className="mt-1 text-sm text-gray-600">
            Current: <span className="font-medium">{factor.currentValue}</span>
          </p>
          <p className="mt-1 text-xs text-gray-500 capitalize">Category: {factor.category}</p>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium">
            Impact: {Math.round(factor.contribution * 100)}%
          </div>
          <span
            className={`inline-block mt-1 px-2 py-0.5 text-xs rounded capitalize ${
              factor.severity === 'high'
                ? 'bg-red-100 text-red-700'
                : factor.severity === 'medium'
                  ? 'bg-orange-100 text-orange-700'
                  : 'bg-yellow-100 text-yellow-700'
            }`}
          >
            {factor.severity}
          </span>
        </div>
      </div>
      {factor.recommendation && (
        <div className="mt-3 p-2 bg-white rounded border border-gray-200">
          <p className="text-sm">
            <span className="font-medium">💡 Suggestion:</span> {factor.recommendation}
          </p>
        </div>
      )}
      {onViewDetails && (
        <button onClick={onViewDetails} className="mt-2 text-sm text-blue-600 hover:text-blue-800">
          View details →
        </button>
      )}
    </div>
  );
}

// ============================================================================
// Intervention Recommendation Card Component
// ============================================================================

interface InterventionCardProps {
  intervention: InterventionRecommendation;
  onApprove?: () => void;
  onDecline?: () => void;
  onViewDetails?: () => void;
  isLoading?: boolean;
}

export function InterventionCard({
  intervention,
  onApprove,
  onDecline,
  onViewDetails,
  isLoading = false,
}: InterventionCardProps): React.JSX.Element {
  const intensityColors = {
    light: 'bg-blue-100 text-blue-700',
    moderate: 'bg-purple-100 text-purple-700',
    intensive: 'bg-red-100 text-red-700',
  };

  const urgencyColors = {
    immediate: 'bg-red-100 text-red-700',
    short_term: 'bg-orange-100 text-orange-700',
    medium_term: 'bg-yellow-100 text-yellow-700',
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-semibold text-gray-900">{intervention.name}</h4>
          <p className="mt-1 text-sm text-gray-600">{intervention.type}</p>
        </div>
        <div className="flex gap-2">
          <span className={`px-2 py-1 text-xs rounded ${intensityColors[intervention.intensity]}`}>
            {intervention.intensity}
          </span>
          <span className={`px-2 py-1 text-xs rounded ${urgencyColors[intervention.urgency]}`}>
            {intervention.urgency.replace('_', ' ')}
          </span>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-gray-500">Relevance:</span>{' '}
          <span className="font-medium">{Math.round(intervention.relevanceScore * 100)}%</span>
        </div>
        <div>
          <span className="text-gray-500">Effectiveness:</span>{' '}
          <span className="font-medium">
            {Math.round(intervention.expectedEffectiveness * 100)}%
          </span>
        </div>
        <div>
          <span className="text-gray-500">Duration:</span>{' '}
          <span className="font-medium">{intervention.estimatedDurationDays} days</span>
        </div>
        <div>
          <span className="text-gray-500">Consent:</span>{' '}
          <span className="font-medium">
            {intervention.requiresParentConsent ? 'Required' : 'Not needed'}
          </span>
        </div>
      </div>

      <p className="mt-3 text-sm text-gray-600">{intervention.rationale}</p>

      <div className="mt-3 p-2 bg-gray-50 rounded text-xs text-gray-600">
        <strong>Targets:</strong> {intervention.targetRiskFactors.join(', ')}
      </div>

      <div className="mt-4 flex gap-2">
        {onApprove && (
          <button
            onClick={onApprove}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {isLoading ? 'Processing...' : 'Approve'}
          </button>
        )}
        {onDecline && (
          <button
            onClick={onDecline}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50"
          >
            Decline
          </button>
        )}
        {onViewDetails && (
          <button
            onClick={onViewDetails}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Details
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Student Risk Card Component
// ============================================================================

interface StudentRiskCardProps {
  prediction: StudentRiskPrediction;
  onViewStudent?: () => void;
  onViewInterventions?: () => void;
  compact?: boolean;
}

export function StudentRiskCard({
  prediction,
  onViewStudent,
  onViewInterventions,
  compact = false,
}: StudentRiskCardProps): React.JSX.Element {
  const colors = riskLevelColors[prediction.riskLevel];

  if (compact) {
    return (
      <div className={`rounded-lg border p-3 ${colors.bg} ${colors.border}`} role="article">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-sm font-medium">
              {prediction.studentName.charAt(0)}
            </div>
            <div>
              <p className="font-medium">{prediction.studentName}</p>
              <div className="flex items-center gap-2 text-sm">
                <RiskLevelBadge level={prediction.riskLevel} size="sm" />
                <RiskTrendIndicator
                  trend={prediction.riskTrend}
                  scoreChange={prediction.scoreChange}
                />
              </div>
            </div>
          </div>
          <button onClick={onViewStudent} className="text-blue-600 hover:text-blue-800 text-sm">
            View →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border bg-white shadow-sm ${colors.border}`}>
      <div className={`p-4 ${colors.bg} rounded-t-lg`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center text-lg font-medium">
              {prediction.studentName.charAt(0)}
            </div>
            <div>
              <h3 className="font-semibold text-lg">{prediction.studentName}</h3>
              <div className="flex items-center gap-2">
                <RiskLevelBadge level={prediction.riskLevel} />
                <RiskTrendIndicator
                  trend={prediction.riskTrend}
                  scoreChange={prediction.scoreChange}
                />
              </div>
            </div>
          </div>
          <RiskScoreGauge
            score={prediction.riskScore}
            confidence={prediction.confidence}
            size="sm"
          />
        </div>
      </div>

      <div className="p-4">
        {/* Category breakdown */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {Object.entries(prediction.categoryScores).map(([category, score]) => (
            <div key={category} className="text-center p-2 bg-gray-50 rounded">
              <div className="text-xs text-gray-500 capitalize">{category}</div>
              <div className="font-medium">{Math.round(score * 100)}%</div>
            </div>
          ))}
        </div>

        {/* Top risk factors */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Top Concerns ({prediction.topRiskFactors.length})
          </h4>
          <ul className="space-y-1">
            {prediction.topRiskFactors.slice(0, 3).map((factor, idx) => (
              <li key={idx} className="text-sm flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    factor.severity === 'high'
                      ? 'bg-red-500'
                      : factor.severity === 'medium'
                        ? 'bg-orange-500'
                        : 'bg-yellow-500'
                  }`}
                />
                {factor.description}
              </li>
            ))}
          </ul>
        </div>

        {/* Protective factors */}
        {prediction.protectiveFactors.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Protective Factors ({prediction.protectiveFactors.length})
            </h4>
            <ul className="space-y-1">
              {prediction.protectiveFactors.slice(0, 2).map((factor, idx) => (
                <li key={idx} className="text-sm flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  {factor.description}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t">
          {onViewStudent && (
            <button
              onClick={onViewStudent}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              View Profile
            </button>
          )}
          {onViewInterventions && (
            <button
              onClick={onViewInterventions}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Interventions
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Classroom Risk Overview Component
// ============================================================================

interface ClassroomRiskOverviewProps {
  summary: ClassroomRiskSummary;
  className?: string;
}

export function ClassroomRiskOverview({
  summary,
  className = '',
}: ClassroomRiskOverviewProps): React.JSX.Element {
  const riskLevels: RiskLevel[] = ['low', 'moderate', 'high', 'critical'];

  return (
    <div className={`rounded-lg border bg-white p-6 shadow-sm ${className}`}>
      <h3 className="text-lg font-semibold mb-4">Classroom Risk Overview</h3>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold">{summary.totalStudents}</div>
          <div className="text-sm text-gray-500">Total Students</div>
        </div>
        <div className="text-center p-3 bg-orange-50 rounded-lg">
          <div className="text-2xl font-bold text-orange-600">
            {summary.studentsNeedingAttention}
          </div>
          <div className="text-sm text-gray-500">Need Attention</div>
        </div>
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">
            {Math.round(summary.averageRiskScore * 100)}%
          </div>
          <div className="text-sm text-gray-500">Avg Risk Score</div>
        </div>
      </div>

      {/* Risk distribution */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Risk Distribution</h4>
        <div className="flex gap-1 h-8 rounded-lg overflow-hidden">
          {riskLevels.map((level) => {
            const count = summary.riskDistribution[level] || 0;
            const percentage = (count / summary.totalStudents) * 100;
            if (percentage === 0) return null;

            return (
              <div
                key={level}
                className={`${riskLevelColors[level].bg} flex items-center justify-center text-xs font-medium`}
                style={{ width: `${percentage}%` }}
                title={`${level}: ${count} students (${percentage.toFixed(1)}%)`}
              >
                {percentage > 10 && count}
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          {riskLevels.map((level) => (
            <span key={level} className="capitalize">
              {level}: {summary.riskDistribution[level] || 0}
            </span>
          ))}
        </div>
      </div>

      {/* Trends */}
      <div className="flex gap-4 pt-4 border-t">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-green-500">↓</span>
          <span>{summary.trendImproving} improving</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-red-500">↑</span>
          <span>{summary.trendWorsening} worsening</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Risk Alert Banner Component
// ============================================================================

interface RiskAlertBannerProps {
  criticalCount: number;
  highCount: number;
  onViewAll: () => void;
}

export function RiskAlertBanner({
  criticalCount,
  highCount,
  onViewAll,
}: RiskAlertBannerProps): React.JSX.Element | null {
  if (criticalCount === 0 && highCount === 0) return null;

  return (
    <div className="rounded-lg bg-red-50 border border-red-200 p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <h4 className="font-semibold text-red-800">Students Need Attention</h4>
            <p className="text-sm text-red-600">
              {criticalCount > 0 && <span className="font-medium">{criticalCount} critical</span>}
              {criticalCount > 0 && highCount > 0 && ' and '}
              {highCount > 0 && <span className="font-medium">{highCount} high-risk</span>} students
              require review
            </p>
          </div>
        </div>
        <button
          onClick={onViewAll}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
        >
          Review Now
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Disclaimer Component (FERPA/Ethical Use)
// ============================================================================

export function RiskPredictionDisclaimer(): React.JSX.Element {
  return (
    <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm">
      <div className="flex gap-3">
        <span className="text-xl">ℹ️</span>
        <div>
          <h4 className="font-medium text-blue-900">About Risk Predictions</h4>
          <p className="text-blue-800 mt-1">
            These predictions are meant to <strong>assist</strong> educators, not replace
            professional judgment. Risk scores are generated by analyzing engagement, performance,
            and behavioral patterns. Always consider the full context of each student&apos;s
            situation before taking action.
          </p>
          <p className="text-blue-700 mt-2 text-xs">
            Predictions are FERPA-compliant. Only authorized educators with legitimate educational
            interest can view this information.
          </p>
        </div>
      </div>
    </div>
  );
}
