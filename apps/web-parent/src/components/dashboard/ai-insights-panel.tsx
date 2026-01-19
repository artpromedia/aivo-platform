'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, TrendingUp, AlertTriangle, Trophy, Lightbulb, ChevronRight, Sparkles } from 'lucide-react';

export type InsightType = 'strength' | 'improvement' | 'concern' | 'celebration';
export type InsightPriority = 'high' | 'medium' | 'low';

export interface AIInsight {
  id: string;
  type: InsightType;
  title: string;
  description: string;
  actionable?: string;
  actionPath?: string;
  priority: InsightPriority;
  subject?: string;
  confidence: number;
  generatedAt: string;
}

interface AIInsightsPanelProps {
  insights: AIInsight[];
  childName?: string;
  isLoading?: boolean;
  onViewDetail?: (insight: AIInsight) => void;
  onDismiss?: (insightId: string) => void;
  onViewAllAnalysis?: () => void;
}

const insightConfig: Record<InsightType, { icon: typeof Brain; bgColor: string; borderColor: string; textColor: string; badgeColor: string }> = {
  strength: {
    icon: TrendingUp,
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    textColor: 'text-emerald-700',
    badgeColor: 'bg-emerald-100 text-emerald-800',
  },
  improvement: {
    icon: Lightbulb,
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-700',
    badgeColor: 'bg-blue-100 text-blue-800',
  },
  concern: {
    icon: AlertTriangle,
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-700',
    badgeColor: 'bg-amber-100 text-amber-800',
  },
  celebration: {
    icon: Trophy,
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    textColor: 'text-purple-700',
    badgeColor: 'bg-purple-100 text-purple-800',
  },
};

const priorityOrder: Record<InsightPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export function AIInsightsPanel({
  insights,
  childName,
  isLoading = false,
  onViewDetail,
  onDismiss,
  onViewAllAnalysis,
}: AIInsightsPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Sort insights by priority
  const sortedInsights = [...insights]
    .filter(i => !dismissedIds.has(i.id))
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  const handleDismiss = (insightId: string) => {
    setDismissedIds(prev => new Set([...prev, insightId]));
    onDismiss?.(insightId);
  };

  const getTypeLabel = (type: InsightType): string => {
    switch (type) {
      case 'strength': return 'Strength';
      case 'improvement': return 'Opportunity';
      case 'concern': return 'Needs Attention';
      case 'celebration': return 'Achievement';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">AI Insights</h2>
            <p className="text-sm text-gray-500">Analyzing learning patterns...</p>
          </div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse">
              <div className="h-24 bg-gray-100 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (sortedInsights.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">AI Insights</h2>
            <p className="text-sm text-gray-500">Powered by Aivo Brain</p>
          </div>
        </div>
        <div className="text-center py-8">
          <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">
            {childName ? `Great job! No new insights for ${childName} right now.` : 'No insights available yet.'}
          </p>
          <p className="text-sm text-gray-400 mt-1">Check back after more learning sessions.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">AI Insights</h2>
            <p className="text-sm text-gray-500">
              {childName ? `Personalized for ${childName}` : 'Powered by Aivo Brain'}
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 text-xs font-medium rounded-full">
          <Sparkles className="w-3 h-3" />
          {sortedInsights.length} insights
        </span>
      </div>

      {/* Insights List */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {sortedInsights.slice(0, 4).map((insight, index) => {
            const config = insightConfig[insight.type];
            const Icon = config.icon;
            const isExpanded = expandedId === insight.id;

            return (
              <motion.div
                key={insight.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: index * 0.05 }}
                layout
              >
                <div
                  className={`p-4 rounded-lg border-2 ${config.bgColor} ${config.borderColor} transition-all hover:shadow-md cursor-pointer`}
                  onClick={() => setExpandedId(isExpanded ? null : insight.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setExpandedId(isExpanded ? null : insight.id);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-expanded={isExpanded}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${config.badgeColor}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${config.badgeColor}`}>
                          {getTypeLabel(insight.type)}
                        </span>
                        {insight.subject && (
                          <span className="text-xs text-gray-500">{insight.subject}</span>
                        )}
                        {insight.priority === 'high' && (
                          <span className="text-xs text-red-600 font-medium">Priority</span>
                        )}
                      </div>
                      <h3 className={`font-semibold ${config.textColor} mb-1`}>{insight.title}</h3>
                      <p className="text-sm text-gray-600 line-clamp-2">{insight.description}</p>

                      {/* Expanded Content */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              {insight.actionable && (
                                <div className="flex items-center gap-2 mb-3">
                                  <Lightbulb className="w-4 h-4 text-amber-500" />
                                  <span className="text-sm font-medium text-gray-700">Suggested Action:</span>
                                </div>
                              )}
                              {insight.actionable && (
                                <p className="text-sm text-gray-600 mb-3">{insight.actionable}</p>
                              )}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                  {insight.actionPath && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onViewDetail?.(insight);
                                      }}
                                      className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                                    >
                                      Take Action
                                      <ChevronRight className="w-4 h-4" />
                                    </button>
                                  )}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDismiss(insight.id);
                                    }}
                                    className="text-sm text-gray-500 hover:text-gray-700"
                                  >
                                    Dismiss
                                  </button>
                                </div>
                                <span className="text-xs text-gray-400">
                                  {Math.round(insight.confidence * 100)}% confidence
                                </span>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <ChevronRight
                      className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ${
                        isExpanded ? 'rotate-90' : ''
                      }`}
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* View All Button */}
      {(sortedInsights.length > 4 || onViewAllAnalysis) && (
        <button
          onClick={onViewAllAnalysis}
          className="mt-4 w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all flex items-center justify-center gap-2"
        >
          <Brain className="w-4 h-4" />
          View Detailed Analysis
        </button>
      )}
    </div>
  );
}
