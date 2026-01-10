/**
 * Virtual Brain Component
 *
 * Interactive visualization of a student's skill network showing
 * strengths, developing areas, and challenges with connections.
 * Inspired by aivo-pro/apps/parent-portal/src/pages/VirtualBrain.tsx
 */

'use client';

import { useState } from 'react';
import {
  Brain,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  BookOpen,
  Calculator,
  Microscope,
  Palette,
  MessageSquare,
  Users,
  Lightbulb,
  Target,
} from 'lucide-react';

interface BrainNode {
  id: string;
  label: string;
  category: 'strength' | 'developing' | 'challenge';
  score: number;
  icon: string;
  connections: string[];
  description: string;
  recentChange: number;
  subject: string;
}

interface VirtualBrainProps {
  studentName: string;
  nodes?: BrainNode[];
  viewMode?: 'cognitive' | 'academic' | 'social';
  onNodeClick?: (node: BrainNode) => void;
  insights?: string[];
}

// Mock data for development
const mockNodes: BrainNode[] = [
  // Strengths
  {
    id: 'pattern-recognition',
    label: 'Pattern Recognition',
    category: 'strength',
    score: 92,
    icon: 'sparkles',
    connections: ['math-operations', 'problem-solving'],
    description: 'Excellent at identifying patterns and sequences',
    recentChange: 5,
    subject: 'Math',
  },
  {
    id: 'creative-thinking',
    label: 'Creative Thinking',
    category: 'strength',
    score: 88,
    icon: 'palette',
    connections: ['writing-expression', 'problem-solving'],
    description: 'Strong imagination and original ideas',
    recentChange: 3,
    subject: 'Writing',
  },
  {
    id: 'verbal-comprehension',
    label: 'Verbal Comprehension',
    category: 'strength',
    score: 85,
    icon: 'book',
    connections: ['reading-fluency', 'vocabulary'],
    description: 'Strong understanding of verbal information',
    recentChange: 2,
    subject: 'Reading',
  },
  // Developing
  {
    id: 'math-operations',
    label: 'Math Operations',
    category: 'developing',
    score: 72,
    icon: 'calculator',
    connections: ['pattern-recognition', 'problem-solving'],
    description: 'Building fluency with arithmetic operations',
    recentChange: 8,
    subject: 'Math',
  },
  {
    id: 'reading-fluency',
    label: 'Reading Fluency',
    category: 'developing',
    score: 68,
    icon: 'book',
    connections: ['verbal-comprehension', 'vocabulary'],
    description: 'Improving reading speed and accuracy',
    recentChange: 4,
    subject: 'Reading',
  },
  {
    id: 'writing-expression',
    label: 'Written Expression',
    category: 'developing',
    score: 65,
    icon: 'message',
    connections: ['creative-thinking', 'vocabulary'],
    description: 'Developing ability to express ideas in writing',
    recentChange: 6,
    subject: 'Writing',
  },
  // Challenges
  {
    id: 'problem-solving',
    label: 'Multi-Step Problems',
    category: 'challenge',
    score: 52,
    icon: 'lightbulb',
    connections: ['math-operations', 'pattern-recognition'],
    description: 'Working on breaking down complex problems',
    recentChange: 3,
    subject: 'Math',
  },
  {
    id: 'vocabulary',
    label: 'Advanced Vocabulary',
    category: 'challenge',
    score: 48,
    icon: 'book',
    connections: ['reading-fluency', 'verbal-comprehension'],
    description: 'Building knowledge of complex words',
    recentChange: -2,
    subject: 'Reading',
  },
  {
    id: 'social-collaboration',
    label: 'Group Collaboration',
    category: 'developing',
    score: 70,
    icon: 'users',
    connections: ['creative-thinking'],
    description: 'Learning to work effectively in teams',
    recentChange: 5,
    subject: 'Social',
  },
];

const mockInsights = [
  'Strong pattern recognition is helping with math concept understanding',
  'Creative thinking transfers well to writing assignments',
  'Focus on vocabulary building will support reading comprehension',
  'Multi-step problem solving is the key area for growth this month',
];

export function VirtualBrain({
  studentName,
  nodes = mockNodes,
  viewMode: initialViewMode = 'academic',
  onNodeClick,
  insights = mockInsights,
}: VirtualBrainProps) {
  const [viewMode, setViewMode] = useState<'cognitive' | 'academic' | 'social'>(initialViewMode);
  const [selectedNode, setSelectedNode] = useState<BrainNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'sparkles': return Sparkles;
      case 'calculator': return Calculator;
      case 'book': return BookOpen;
      case 'palette': return Palette;
      case 'message': return MessageSquare;
      case 'users': return Users;
      case 'lightbulb': return Lightbulb;
      case 'microscope': return Microscope;
      default: return Target;
    }
  };

  const getCategoryColor = (category: BrainNode['category']) => {
    switch (category) {
      case 'strength': return { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300', ring: 'ring-green-400' };
      case 'developing': return { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300', ring: 'ring-blue-400' };
      case 'challenge': return { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300', ring: 'ring-amber-400' };
    }
  };

  const strengths = nodes.filter(n => n.category === 'strength');
  const developing = nodes.filter(n => n.category === 'developing');
  const challenges = nodes.filter(n => n.category === 'challenge');

  const handleNodeClick = (node: BrainNode) => {
    setSelectedNode(selectedNode?.id === node.id ? null : node);
    onNodeClick?.(node);
  };

  // Filter nodes based on view mode
  const filteredNodes = nodes.filter(node => {
    if (viewMode === 'academic') return ['Math', 'Reading', 'Writing', 'Science'].includes(node.subject);
    if (viewMode === 'social') return node.subject === 'Social';
    return true; // cognitive shows all
  });

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl">
            <Brain className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Virtual Brain</h2>
            <p className="text-sm text-gray-500">{studentName}'s skill network</p>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
          {(['cognitive', 'academic', 'social'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === mode
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-3 bg-green-50 rounded-lg text-center">
          <p className="text-2xl font-bold text-green-700">{strengths.length}</p>
          <p className="text-xs text-green-600">Strengths</p>
        </div>
        <div className="p-3 bg-blue-50 rounded-lg text-center">
          <p className="text-2xl font-bold text-blue-700">{developing.length}</p>
          <p className="text-xs text-blue-600">Developing</p>
        </div>
        <div className="p-3 bg-amber-50 rounded-lg text-center">
          <p className="text-2xl font-bold text-amber-700">{challenges.length}</p>
          <p className="text-xs text-amber-600">Challenges</p>
        </div>
      </div>

      {/* Brain Visualization */}
      <div className="relative bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 mb-6 min-h-[300px]">
        {/* Connection Lines (SVG) */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
          {filteredNodes.map(node =>
            node.connections.map(connId => {
              const connNode = filteredNodes.find(n => n.id === connId);
              if (!connNode) return null;

              // Calculate positions based on node index for demo
              const nodeIndex = filteredNodes.indexOf(node);
              const connIndex = filteredNodes.indexOf(connNode);
              const totalNodes = filteredNodes.length;

              // Arrange in a circle
              const centerX = 150;
              const centerY = 150;
              const radius = 100;

              const angle1 = (nodeIndex / totalNodes) * 2 * Math.PI - Math.PI / 2;
              const angle2 = (connIndex / totalNodes) * 2 * Math.PI - Math.PI / 2;

              const x1 = centerX + radius * Math.cos(angle1);
              const y1 = centerY + radius * Math.sin(angle1);
              const x2 = centerX + radius * Math.cos(angle2);
              const y2 = centerY + radius * Math.sin(angle2);

              const isHighlighted = hoveredNode === node.id || hoveredNode === connId;

              return (
                <line
                  key={`${node.id}-${connId}`}
                  x1={`${(x1 / 300) * 100}%`}
                  y1={`${(y1 / 300) * 100}%`}
                  x2={`${(x2 / 300) * 100}%`}
                  y2={`${(y2 / 300) * 100}%`}
                  stroke={isHighlighted ? '#6366f1' : '#d1d5db'}
                  strokeWidth={isHighlighted ? 2 : 1}
                  strokeDasharray={isHighlighted ? 'none' : '4,4'}
                  className="transition-all duration-300"
                />
              );
            })
          )}
        </svg>

        {/* Skill Nodes */}
        <div className="relative grid grid-cols-3 gap-4" style={{ zIndex: 1 }}>
          {filteredNodes.map((node) => {
            const colors = getCategoryColor(node.category);
            const Icon = getIcon(node.icon);
            const isSelected = selectedNode?.id === node.id;
            const isConnected = hoveredNode && (node.id === hoveredNode || node.connections.includes(hoveredNode));

            return (
              <button
                key={node.id}
                onClick={() => handleNodeClick(node)}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                className={`relative p-3 rounded-xl border-2 transition-all duration-200 ${colors.bg} ${colors.border} ${
                  isSelected ? `ring-2 ${colors.ring} shadow-lg scale-105` : ''
                } ${isConnected ? 'opacity-100 scale-105' : hoveredNode ? 'opacity-50' : 'opacity-100'}
                hover:shadow-md hover:scale-105`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`p-1.5 rounded-lg bg-white/50`}>
                    <Icon className={`w-4 h-4 ${colors.text}`} />
                  </div>
                  <span className={`text-xs font-medium ${colors.text}`}>
                    {node.score}%
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-900 text-left">{node.label}</p>

                {/* Trend indicator */}
                <div className="absolute top-2 right-2">
                  {node.recentChange > 0 ? (
                    <TrendingUp className="w-3 h-3 text-green-500" />
                  ) : node.recentChange < 0 ? (
                    <TrendingDown className="w-3 h-3 text-red-500" />
                  ) : (
                    <Minus className="w-3 h-3 text-gray-400" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Node Details */}
      {selectedNode && (
        <div className="mb-6 p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              {(() => {
                const Icon = getIcon(selectedNode.icon);
                const colors = getCategoryColor(selectedNode.category);
                return (
                  <div className={`p-2 rounded-lg ${colors.bg}`}>
                    <Icon className={`w-5 h-5 ${colors.text}`} />
                  </div>
                );
              })()}
              <div>
                <h3 className="font-medium text-gray-900">{selectedNode.label}</h3>
                <p className="text-sm text-gray-500">{selectedNode.subject}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">{selectedNode.score}%</p>
              <div className="flex items-center gap-1 text-sm">
                {selectedNode.recentChange > 0 ? (
                  <>
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    <span className="text-green-600">+{selectedNode.recentChange}%</span>
                  </>
                ) : selectedNode.recentChange < 0 ? (
                  <>
                    <TrendingDown className="w-4 h-4 text-red-500" />
                    <span className="text-red-600">{selectedNode.recentChange}%</span>
                  </>
                ) : (
                  <span className="text-gray-500">No change</span>
                )}
              </div>
            </div>
          </div>

          <p className="text-sm text-gray-600 mb-3">{selectedNode.description}</p>

          <div className="flex flex-wrap gap-2">
            <span className={`px-2 py-1 text-xs rounded-full ${getCategoryColor(selectedNode.category).bg} ${getCategoryColor(selectedNode.category).text}`}>
              {selectedNode.category}
            </span>
            <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">
              {selectedNode.connections.length} connections
            </span>
          </div>
        </div>
      )}

      {/* AI Insights */}
      <div className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="w-5 h-5 text-indigo-600" />
          <h3 className="font-medium text-indigo-900">AI Insights</h3>
        </div>
        <ul className="space-y-2">
          {insights.map((insight, index) => (
            <li key={index} className="flex items-start gap-2 text-sm text-indigo-800">
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full mt-1.5 flex-shrink-0" />
              {insight}
            </li>
          ))}
        </ul>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-6 mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-400" />
          <span className="text-xs text-gray-600">Strength</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-400" />
          <span className="text-xs text-gray-600">Developing</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-400" />
          <span className="text-xs text-gray-600">Challenge</span>
        </div>
      </div>
    </div>
  );
}

export default VirtualBrain;
