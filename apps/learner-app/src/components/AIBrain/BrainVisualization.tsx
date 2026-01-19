'use client';

import { useEffect, useState } from 'react';
import type { BrainVisualizationProps } from './types';
import { useBrainAPI, type BrainState } from '@/hooks/useBrainAPI';
import { getSubjectConfig } from './types';

/**
 * Interactive brain visualization showing knowledge graph
 */
export function BrainVisualization({
  learnerId,
  showDetails = true,
  className = '',
}: BrainVisualizationProps) {
  const { getBrain, loading } = useBrainAPI();
  const [brain, setBrain] = useState<BrainState | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  useEffect(() => {
    const fetchBrain = async () => {
      const data = await getBrain(learnerId);
      setBrain(data);
    };
    fetchBrain();
  }, [learnerId, getBrain]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-12 ${className}`}>
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-24 w-24 animate-pulse items-center justify-center rounded-full bg-gradient-to-br from-purple-100 to-teal-100">
            <span className="text-5xl animate-bounce">🧠</span>
          </div>
          <p className="text-gray-500">Loading your brain...</p>
        </div>
      </div>
    );
  }

  if (!brain) {
    return (
      <div className={`flex items-center justify-center p-12 ${className}`}>
        <div className="text-center">
          <span className="text-6xl mb-4 block">🧠</span>
          <p className="text-gray-600 font-medium">Brain not initialized</p>
          <p className="text-sm text-gray-400">Complete the baseline assessment first!</p>
        </div>
      </div>
    );
  }

  const nodes = brain.knowledge_graph.nodes;
  const selectedNodeData = selectedNode
    ? nodes.find(n => n.id === selectedNode)
    : null;

  // Calculate positions for nodes in a circular layout
  const getNodePosition = (index: number, total: number) => {
    const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
    const radius = 120;
    return {
      x: 150 + radius * Math.cos(angle),
      y: 150 + radius * Math.sin(angle),
    };
  };

  // Get color based on mastery
  const getMasteryColor = (mastery: number) => {
    if (mastery >= 0.8) return '#22c55e'; // green-500
    if (mastery >= 0.6) return '#eab308'; // yellow-500
    if (mastery >= 0.4) return '#f97316'; // orange-500
    return '#ef4444'; // red-500
  };

  return (
    <div className={`rounded-2xl bg-white shadow-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-teal-500 p-4 text-white">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🧠</span>
          <div>
            <h2 className="font-bold text-lg">Knowledge Brain</h2>
            <p className="text-white/80 text-sm">
              {nodes.length} concepts • v{brain.version}
            </p>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Brain visualization */}
          <div className="flex-1">
            <svg
              viewBox="0 0 300 300"
              className="w-full max-w-[300px] mx-auto"
            >
              {/* Draw edges */}
              {brain.knowledge_graph.edges.map((edge, idx) => {
                const sourceIdx = nodes.findIndex(n => n.id === edge.source);
                const targetIdx = nodes.findIndex(n => n.id === edge.target);
                if (sourceIdx === -1 || targetIdx === -1) return null;

                const source = getNodePosition(sourceIdx, nodes.length);
                const target = getNodePosition(targetIdx, nodes.length);

                return (
                  <line
                    key={idx}
                    x1={source.x}
                    y1={source.y}
                    x2={target.x}
                    y2={target.y}
                    stroke="#e5e7eb"
                    strokeWidth="2"
                    strokeDasharray={edge.relationship === 'prerequisite' ? '5,5' : undefined}
                  />
                );
              })}

              {/* Draw nodes */}
              {nodes.map((node, idx) => {
                const pos = getNodePosition(idx, nodes.length);
                const config = getSubjectConfig(node.id);
                const isSelected = selectedNode === node.id;

                return (
                  <g
                    key={node.id}
                    className="cursor-pointer transition-transform"
                    transform={`translate(${pos.x}, ${pos.y})`}
                    onClick={() => setSelectedNode(isSelected ? null : node.id)}
                  >
                    {/* Outer ring showing mastery */}
                    <circle
                      r={isSelected ? 35 : 30}
                      fill="white"
                      stroke={getMasteryColor(node.mastery)}
                      strokeWidth={isSelected ? 4 : 3}
                      className="transition-all"
                    />

                    {/* Inner circle */}
                    <circle
                      r={isSelected ? 28 : 24}
                      fill={`${getMasteryColor(node.mastery)}20`}
                    />

                    {/* Emoji */}
                    <text
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={isSelected ? 20 : 16}
                      className="select-none"
                    >
                      {config.emoji}
                    </text>

                    {/* Mastery percentage */}
                    <text
                      textAnchor="middle"
                      y={isSelected ? 45 : 40}
                      fontSize="10"
                      fill={getMasteryColor(node.mastery)}
                      fontWeight="bold"
                    >
                      {Math.round(node.mastery * 100)}%
                    </text>
                  </g>
                );
              })}

              {/* Central brain */}
              <g transform="translate(150, 150)">
                <circle r="35" fill="url(#brainGradient)" />
                <text
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="24"
                  className="select-none"
                >
                  🧠
                </text>
              </g>

              {/* Gradient definition */}
              <defs>
                <linearGradient id="brainGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#a855f7" />
                  <stop offset="100%" stopColor="#14b8a6" />
                </linearGradient>
              </defs>
            </svg>

            {/* Legend */}
            <div className="flex justify-center gap-4 mt-4 text-xs">
              <div className="flex items-center gap-1">
                <span className="h-3 w-3 rounded-full bg-green-500"></span>
                <span>Mastered</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="h-3 w-3 rounded-full bg-yellow-500"></span>
                <span>Good</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="h-3 w-3 rounded-full bg-orange-500"></span>
                <span>Learning</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="h-3 w-3 rounded-full bg-red-500"></span>
                <span>Needs Work</span>
              </div>
            </div>
          </div>

          {/* Details panel */}
          {showDetails && (
            <div className="lg:w-64 space-y-4">
              {selectedNodeData ? (
                <div className="rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">{getSubjectConfig(selectedNodeData.id).emoji}</span>
                    <h3 className="font-bold">{getSubjectConfig(selectedNodeData.id).name}</h3>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Mastery</span>
                      <span className="font-medium" style={{ color: getMasteryColor(selectedNodeData.mastery) }}>
                        {Math.round(selectedNodeData.mastery * 100)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Type</span>
                      <span className="font-medium capitalize">{selectedNodeData.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Updated</span>
                      <span className="font-medium">
                        {new Date(selectedNodeData.last_updated).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <button
                    className="w-full mt-4 rounded-lg bg-purple-500 px-4 py-2 text-sm font-medium text-white hover:bg-purple-600 transition-colors"
                    onClick={() => {
                      // Navigate to practice for this subject
                      console.log('Practice:', selectedNodeData.id);
                    }}
                  >
                    Practice Now ✨
                  </button>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-gray-300 p-4 text-center">
                  <p className="text-gray-500 text-sm">
                    Click a node to see details
                  </p>
                </div>
              )}

              {/* Brain stats */}
              <div className="rounded-xl bg-gray-50 p-4">
                <h4 className="font-medium text-gray-700 mb-2">Brain Stats</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total Concepts</span>
                    <span className="font-medium">{nodes.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Connections</span>
                    <span className="font-medium">{brain.knowledge_graph.edges.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Avg Mastery</span>
                    <span className="font-medium">
                      {Math.round(
                        (nodes.reduce((sum, n) => sum + n.mastery, 0) / nodes.length) * 100
                      )}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
