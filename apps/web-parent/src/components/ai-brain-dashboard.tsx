/**
 * AI Brain Dashboard Component
 *
 * Allows parents to monitor and control the AI learning system's autonomy level,
 * view learning goals, proactive interventions, and AI reasoning traces.
 * Inspired by aivo-agentic-ai-learning-app/apps/parent-portal/src/pages/AIBrainDashboard.tsx
 */

'use client';

import { useState } from 'react';
import {
  Brain,
  Target,
  Lightbulb,
  History,
  Settings,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Pause,
  ThumbsUp,
  ThumbsDown,
  Clock,
  Zap,
  Heart,
  Coffee,
  HelpCircle,
  Sparkles,
} from 'lucide-react';

// Types
interface LearningGoal {
  id: string;
  goalType: 'skill_mastery' | 'confidence_building' | 'engagement' | 'breakthrough';
  title: string;
  description: string;
  status: 'active' | 'achieved' | 'revised' | 'abandoned';
  confidenceScore: number;
  progress: number;
  aiReasoning: string;
  createdAt: string;
  updatedAt: string;
}

interface ProactiveIntervention {
  id: string;
  triggerType: 'frustration' | 'disengagement' | 'success_momentum' | 'fatigue' | 'stuck' | 'breakthrough';
  interventionType: 'hint' | 'encouragement' | 'break_suggestion' | 'difficulty_adjustment' | 'celebration' | 'reflection_prompt';
  message: string;
  severity: number;
  learnerResponse?: 'accepted' | 'rejected' | 'ignored' | 'modified';
  timestamp: string;
}

interface ReasoningTrace {
  id: string;
  decision: string;
  reasoning: string[];
  confidence: number;
  alternativesConsidered: string[];
  timestamp: string;
}

interface AIBrainDashboardProps {
  studentId: string;
  studentName: string;
  brainId?: string;
  goals?: LearningGoal[];
  interventions?: ProactiveIntervention[];
  reasoningTraces?: ReasoningTrace[];
  autonomyLevel?: 1 | 2 | 3;
  onAutonomyChange?: (level: 1 | 2 | 3) => void;
  summary?: {
    totalGoals: number;
    activeGoals: number;
    achievedGoals: number;
    totalInterventions: number;
    acceptanceRate: number;
    avgConfidence: number;
  };
}

// Mock data for development
const mockGoals: LearningGoal[] = [
  {
    id: 'goal-1',
    goalType: 'skill_mastery',
    title: 'Master Fraction Operations',
    description: 'Build fluency in adding, subtracting, and comparing fractions',
    status: 'active',
    confidenceScore: 0.85,
    progress: 68,
    aiReasoning: 'Based on recent performance patterns showing strong conceptual understanding but slower procedural execution.',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'goal-2',
    goalType: 'confidence_building',
    title: 'Build Reading Confidence',
    description: 'Increase comfort with longer passages through scaffolded practice',
    status: 'active',
    confidenceScore: 0.72,
    progress: 45,
    aiReasoning: 'Detected hesitation patterns when encountering texts over 200 words. Building confidence through gradual exposure.',
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'goal-3',
    goalType: 'engagement',
    title: 'Sustain Science Interest',
    description: 'Maintain high engagement in science through interactive experiments',
    status: 'achieved',
    confidenceScore: 0.92,
    progress: 100,
    aiReasoning: 'Strong intrinsic motivation detected. Goal achieved through consistent engagement over 3 weeks.',
    createdAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const mockInterventions: ProactiveIntervention[] = [
  {
    id: 'int-1',
    triggerType: 'frustration',
    interventionType: 'hint',
    message: 'Would you like a hint? Try breaking the problem into smaller steps.',
    severity: 0.6,
    learnerResponse: 'accepted',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'int-2',
    triggerType: 'success_momentum',
    interventionType: 'celebration',
    message: 'Amazing work! You solved 5 problems in a row correctly!',
    severity: 0.3,
    learnerResponse: 'accepted',
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'int-3',
    triggerType: 'fatigue',
    interventionType: 'break_suggestion',
    message: 'You\'ve been working hard! How about a 5-minute break?',
    severity: 0.5,
    learnerResponse: 'rejected',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
];

const mockReasoningTraces: ReasoningTrace[] = [
  {
    id: 'trace-1',
    decision: 'Increased difficulty level for fraction problems',
    reasoning: [
      'Student achieved 92% accuracy on current level',
      'Response time decreased by 15% over last 10 problems',
      'Confidence indicators show readiness for challenge',
    ],
    confidence: 0.88,
    alternativesConsidered: ['Maintain current level', 'Introduce new topic instead'],
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'trace-2',
    decision: 'Suggested a reading break activity',
    reasoning: [
      'Detected 3 consecutive incorrect answers',
      'Response time increased significantly',
      'Student requested hint on last 2 problems',
    ],
    confidence: 0.75,
    alternativesConsidered: ['Provide scaffolded hint', 'Switch to easier problem'],
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
];

export function AIBrainDashboard({
  studentId,
  studentName,
  brainId,
  goals = mockGoals,
  interventions = mockInterventions,
  reasoningTraces = mockReasoningTraces,
  autonomyLevel = 2,
  onAutonomyChange,
  summary = {
    totalGoals: 8,
    activeGoals: 3,
    achievedGoals: 5,
    totalInterventions: 47,
    acceptanceRate: 78,
    avgConfidence: 82,
  },
}: AIBrainDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'goals' | 'interventions' | 'reasoning' | 'settings'>('overview');
  const [currentAutonomy, setCurrentAutonomy] = useState(autonomyLevel);
  const [goalFilter, setGoalFilter] = useState<'all' | 'active' | 'achieved'>('all');

  const handleAutonomyChange = (level: 1 | 2 | 3) => {
    setCurrentAutonomy(level);
    onAutonomyChange?.(level);
  };

  const autonomyLevels = [
    { level: 1 as const, name: 'Ask First', description: 'AI asks permission before helping', icon: HelpCircle },
    { level: 2 as const, name: 'Balanced', description: 'AI helps proactively with limits', icon: Zap },
    { level: 3 as const, name: 'Full Trust', description: 'AI acts independently', icon: Sparkles },
  ];

  const getTriggerIcon = (trigger: ProactiveIntervention['triggerType']) => {
    switch (trigger) {
      case 'frustration': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'disengagement': return <Pause className="w-4 h-4 text-amber-500" />;
      case 'success_momentum': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'fatigue': return <Coffee className="w-4 h-4 text-orange-500" />;
      case 'stuck': return <HelpCircle className="w-4 h-4 text-blue-500" />;
      case 'breakthrough': return <Sparkles className="w-4 h-4 text-purple-500" />;
    }
  };

  const getGoalTypeIcon = (type: LearningGoal['goalType']) => {
    switch (type) {
      case 'skill_mastery': return <Target className="w-4 h-4" />;
      case 'confidence_building': return <Heart className="w-4 h-4" />;
      case 'engagement': return <Zap className="w-4 h-4" />;
      case 'breakthrough': return <Sparkles className="w-4 h-4" />;
    }
  };

  const filteredGoals = goals.filter(goal => {
    if (goalFilter === 'all') return true;
    if (goalFilter === 'active') return goal.status === 'active';
    if (goalFilter === 'achieved') return goal.status === 'achieved';
    return true;
  });

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-xl">
            <Brain className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">AI Learning Brain</h2>
            <p className="text-sm text-gray-500">{studentName}'s personalized AI tutor</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          Active
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg mb-6">
        {[
          { id: 'overview' as const, label: 'Overview', icon: Brain },
          { id: 'goals' as const, label: 'Goals', icon: Target },
          { id: 'interventions' as const, label: 'Interventions', icon: Lightbulb },
          { id: 'reasoning' as const, label: 'Reasoning', icon: History },
          { id: 'settings' as const, label: 'Settings', icon: Settings },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="p-4 bg-purple-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-700">{summary.activeGoals}</p>
              <p className="text-sm text-purple-600">Active Goals</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-700">{summary.achievedGoals}</p>
              <p className="text-sm text-green-600">Goals Achieved</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-700">{summary.acceptanceRate}%</p>
              <p className="text-sm text-blue-600">Help Acceptance</p>
            </div>
          </div>

          {/* Recent Activity */}
          <div>
            <h3 className="font-medium text-gray-900 mb-3">Recent AI Activity</h3>
            <div className="space-y-3">
              {interventions.slice(0, 3).map(intervention => (
                <div key={intervention.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  {getTriggerIcon(intervention.triggerType)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{intervention.message}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(intervention.timestamp).toLocaleString()}
                    </p>
                  </div>
                  {intervention.learnerResponse && (
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      intervention.learnerResponse === 'accepted'
                        ? 'bg-green-100 text-green-700'
                        : intervention.learnerResponse === 'rejected'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {intervention.learnerResponse}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Active Goals Preview */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-900">Active Goals</h3>
              <button
                onClick={() => setActiveTab('goals')}
                className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
              >
                View All <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              {goals.filter(g => g.status === 'active').slice(0, 2).map(goal => (
                <div key={goal.id} className="p-3 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    {getGoalTypeIcon(goal.goalType)}
                    <span className="font-medium text-gray-900">{goal.title}</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                      style={{ width: `${goal.progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{goal.progress}% complete</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'goals' && (
        <div className="space-y-4">
          {/* Filter */}
          <div className="flex gap-2">
            {(['all', 'active', 'achieved'] as const).map(filter => (
              <button
                key={filter}
                onClick={() => setGoalFilter(filter)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  goalFilter === filter
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>

          {/* Goals List */}
          <div className="space-y-4">
            {filteredGoals.map(goal => (
              <div key={goal.id} className="p-4 border border-gray-200 rounded-xl">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${
                      goal.goalType === 'skill_mastery' ? 'bg-blue-100 text-blue-600' :
                      goal.goalType === 'confidence_building' ? 'bg-pink-100 text-pink-600' :
                      goal.goalType === 'engagement' ? 'bg-amber-100 text-amber-600' :
                      'bg-purple-100 text-purple-600'
                    }`}>
                      {getGoalTypeIcon(goal.goalType)}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{goal.title}</h4>
                      <p className="text-sm text-gray-500">{goal.description}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                    goal.status === 'achieved' ? 'bg-green-100 text-green-700' :
                    goal.status === 'active' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {goal.status}
                  </span>
                </div>

                <div className="mb-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Progress</span>
                    <span className="font-medium">{goal.progress}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        goal.status === 'achieved'
                          ? 'bg-green-500'
                          : 'bg-gradient-to-r from-indigo-500 to-purple-500'
                      }`}
                      style={{ width: `${goal.progress}%` }}
                    />
                  </div>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">AI Reasoning</p>
                  <p className="text-sm text-gray-700">{goal.aiReasoning}</p>
                </div>

                <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                  <span>Confidence: {Math.round(goal.confidenceScore * 100)}%</span>
                  <span>Updated {new Date(goal.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'interventions' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="p-3 bg-gray-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-gray-900">{summary.totalInterventions}</p>
              <p className="text-sm text-gray-500">Total Interventions</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-green-600">{summary.acceptanceRate}%</p>
              <p className="text-sm text-gray-500">Acceptance Rate</p>
            </div>
          </div>

          <div className="space-y-3">
            {interventions.map(intervention => (
              <div key={intervention.id} className="p-4 border border-gray-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${
                    intervention.triggerType === 'frustration' ? 'bg-red-100' :
                    intervention.triggerType === 'success_momentum' ? 'bg-green-100' :
                    intervention.triggerType === 'fatigue' ? 'bg-orange-100' :
                    intervention.triggerType === 'breakthrough' ? 'bg-purple-100' :
                    'bg-blue-100'
                  }`}>
                    {getTriggerIcon(intervention.triggerType)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-900 capitalize">
                        {intervention.triggerType.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-gray-500">triggered</span>
                      <span className="text-sm font-medium text-indigo-600 capitalize">
                        {intervention.interventionType.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{intervention.message}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Severity:</span>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map(i => (
                            <div
                              key={i}
                              className={`w-1.5 h-3 rounded-sm ${
                                i <= intervention.severity * 5 ? 'bg-amber-400' : 'bg-gray-200'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      {intervention.learnerResponse && (
                        <div className="flex items-center gap-1">
                          {intervention.learnerResponse === 'accepted' ? (
                            <ThumbsUp className="w-3 h-3 text-green-500" />
                          ) : intervention.learnerResponse === 'rejected' ? (
                            <ThumbsDown className="w-3 h-3 text-red-500" />
                          ) : null}
                          <span className={`text-xs ${
                            intervention.learnerResponse === 'accepted' ? 'text-green-600' :
                            intervention.learnerResponse === 'rejected' ? 'text-red-600' :
                            'text-gray-500'
                          }`}>
                            {intervention.learnerResponse}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2 text-right">
                  {new Date(intervention.timestamp).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'reasoning' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 mb-4">
            See how the AI makes decisions about {studentName}'s learning journey.
          </p>

          <div className="space-y-4">
            {reasoningTraces.map(trace => (
              <div key={trace.id} className="p-4 border border-gray-200 rounded-xl">
                <div className="flex items-start justify-between mb-3">
                  <h4 className="font-medium text-gray-900">{trace.decision}</h4>
                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full">
                    {Math.round(trace.confidence * 100)}% confident
                  </span>
                </div>

                <div className="mb-3">
                  <p className="text-xs text-gray-500 mb-2">Reasoning Steps:</p>
                  <ol className="space-y-1">
                    {trace.reasoning.map((step, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="w-5 h-5 flex items-center justify-center bg-gray-100 rounded-full text-xs text-gray-600 flex-shrink-0">
                          {index + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Alternatives Considered:</p>
                  <ul className="space-y-1">
                    {trace.alternativesConsidered.map((alt, index) => (
                      <li key={index} className="text-sm text-gray-600 flex items-center gap-2">
                        <span className="w-1 h-1 bg-gray-400 rounded-full" />
                        {alt}
                      </li>
                    ))}
                  </ul>
                </div>

                <p className="text-xs text-gray-400 mt-3">
                  {new Date(trace.timestamp).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* Autonomy Level */}
          <div>
            <h3 className="font-medium text-gray-900 mb-2">AI Autonomy Level</h3>
            <p className="text-sm text-gray-500 mb-4">
              Control how independently the AI can help {studentName}.
            </p>

            <div className="space-y-3">
              {autonomyLevels.map(({ level, name, description, icon: Icon }) => (
                <button
                  key={level}
                  onClick={() => handleAutonomyChange(level)}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                    currentAutonomy === level
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      currentAutonomy === level ? 'bg-indigo-100' : 'bg-gray-100'
                    }`}>
                      <Icon className={`w-5 h-5 ${
                        currentAutonomy === level ? 'text-indigo-600' : 'text-gray-500'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{name}</span>
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                          Level {level}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">{description}</p>
                    </div>
                    {currentAutonomy === level && (
                      <CheckCircle className="w-5 h-5 text-indigo-500" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Intervention Preferences */}
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Intervention Settings</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">Break Reminders</p>
                  <p className="text-xs text-gray-500">Suggest breaks when fatigue is detected</p>
                </div>
                <div className="w-10 h-6 bg-indigo-500 rounded-full relative cursor-pointer">
                  <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">Celebration Messages</p>
                  <p className="text-xs text-gray-500">Celebrate achievements and milestones</p>
                </div>
                <div className="w-10 h-6 bg-indigo-500 rounded-full relative cursor-pointer">
                  <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">Difficulty Adjustments</p>
                  <p className="text-xs text-gray-500">Auto-adjust problem difficulty</p>
                </div>
                <div className="w-10 h-6 bg-gray-300 rounded-full relative cursor-pointer">
                  <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AIBrainDashboard;
