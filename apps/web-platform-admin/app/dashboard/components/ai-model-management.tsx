/**
 * AI Model Management Component
 *
 * Manage AI models, cloning, and deployment across tenants.
 * Based on ModelCloning from aivo-pro.
 */

'use client';

import * as React from 'react';

interface AIModel {
  id: string;
  name: string;
  version: string;
  type: 'tutor' | 'assessment' | 'iep' | 'content' | 'translation';
  status: 'active' | 'training' | 'deprecated' | 'testing';
  tenantsUsing: number;
  accuracy: number;
  lastUpdated: string;
  parameters: string;
  description: string;
}

interface ModelMetrics {
  totalModels: number;
  activeModels: number;
  modelsInTraining: number;
  averageAccuracy: number;
  totalInferences: number;
}

// Mock data
const mockMetrics: ModelMetrics = {
  totalModels: 12,
  activeModels: 8,
  modelsInTraining: 2,
  averageAccuracy: 94.5,
  totalInferences: 1250000,
};

const mockModels: AIModel[] = [
  {
    id: '1',
    name: 'Aivo Tutor Core',
    version: '3.2.1',
    type: 'tutor',
    status: 'active',
    tenantsUsing: 45,
    accuracy: 96.2,
    lastUpdated: '2026-01-08',
    parameters: '7B',
    description: 'Primary tutoring model for K-12 education',
  },
  {
    id: '2',
    name: 'IEP Goal Generator',
    version: '2.1.0',
    type: 'iep',
    status: 'active',
    tenantsUsing: 38,
    accuracy: 94.8,
    lastUpdated: '2026-01-05',
    parameters: '3B',
    description: 'Generates personalized IEP goals based on student data',
  },
  {
    id: '3',
    name: 'Assessment Engine',
    version: '4.0.0',
    type: 'assessment',
    status: 'training',
    tenantsUsing: 0,
    accuracy: 92.1,
    lastUpdated: '2026-01-10',
    parameters: '5B',
    description: 'Next-gen adaptive assessment model (in training)',
  },
  {
    id: '4',
    name: 'Content Adapter',
    version: '1.5.2',
    type: 'content',
    status: 'active',
    tenantsUsing: 42,
    accuracy: 93.5,
    lastUpdated: '2025-12-20',
    parameters: '2B',
    description: 'Adapts content for different reading levels',
  },
  {
    id: '5',
    name: 'Multilingual Tutor',
    version: '2.0.0-beta',
    type: 'translation',
    status: 'testing',
    tenantsUsing: 3,
    accuracy: 91.2,
    lastUpdated: '2026-01-09',
    parameters: '8B',
    description: 'Supports tutoring in 15+ languages',
  },
  {
    id: '6',
    name: 'Legacy Tutor v2',
    version: '2.8.5',
    type: 'tutor',
    status: 'deprecated',
    tenantsUsing: 5,
    accuracy: 89.5,
    lastUpdated: '2025-06-15',
    parameters: '4B',
    description: 'Legacy model - migration recommended',
  },
];

const typeIcons = {
  tutor: '🎓',
  assessment: '📝',
  iep: '📋',
  content: '📚',
  translation: '🌐',
};

const typeColors = {
  tutor: 'bg-blue-100 text-blue-700',
  assessment: 'bg-green-100 text-green-700',
  iep: 'bg-purple-100 text-purple-700',
  content: 'bg-amber-100 text-amber-700',
  translation: 'bg-sky-100 text-sky-700',
};

const statusColors = {
  active: 'bg-green-100 text-green-700',
  training: 'bg-blue-100 text-blue-700',
  testing: 'bg-amber-100 text-amber-700',
  deprecated: 'bg-red-100 text-red-700',
};

export function AIModelManagement() {
  const [metrics] = React.useState<ModelMetrics>(mockMetrics);
  const [models] = React.useState<AIModel[]>(mockModels);
  const [selectedType, setSelectedType] = React.useState<string | null>(null);

  const filteredModels = React.useMemo(() => {
    if (!selectedType) return models;
    return models.filter((m) => m.type === selectedType);
  }, [models, selectedType]);

  const modelTypes = ['tutor', 'assessment', 'iep', 'content', 'translation'] as const;

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 text-xl text-white">
              🤖
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">AI Model Management</h2>
              <p className="text-sm text-gray-500">Deploy and monitor AI models</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              Clone Model
            </button>
            <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
              + Deploy New
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-5 gap-4 p-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50/30">
        <MetricBox
          icon="🧠"
          value={metrics.totalModels.toString()}
          label="Total Models"
        />
        <MetricBox
          icon="✅"
          value={metrics.activeModels.toString()}
          label="Active"
          color="green"
        />
        <MetricBox
          icon="⚙️"
          value={metrics.modelsInTraining.toString()}
          label="Training"
          color="blue"
        />
        <MetricBox
          icon="🎯"
          value={`${metrics.averageAccuracy}%`}
          label="Avg Accuracy"
          color="purple"
        />
        <MetricBox
          icon="⚡"
          value={`${(metrics.totalInferences / 1000000).toFixed(1)}M`}
          label="Inferences"
          color="amber"
        />
      </div>

      {/* Type Filter */}
      <div className="flex gap-2 p-4 border-b border-gray-200">
        <button
          onClick={() => setSelectedType(null)}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            !selectedType
              ? 'bg-gray-900 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          All Models
        </button>
        {modelTypes.map((type) => (
          <button
            key={type}
            onClick={() => setSelectedType(type)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors capitalize flex items-center gap-1 ${
              selectedType === type
                ? typeColors[type]
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <span>{typeIcons[type]}</span>
            {type}
          </button>
        ))}
      </div>

      {/* Models Grid */}
      <div className="p-4 grid gap-4 lg:grid-cols-2">
        {filteredModels.map((model) => (
          <ModelCard key={model.id} model={model} />
        ))}
      </div>

      {filteredModels.length === 0 && (
        <div className="p-8 text-center text-gray-500">
          No models match the current filter.
        </div>
      )}
    </div>
  );
}

function MetricBox({
  icon,
  value,
  label,
  color,
}: {
  icon: string;
  value: string;
  label: string;
  color?: 'green' | 'blue' | 'purple' | 'amber';
}) {
  const colorClasses = {
    green: 'text-green-600',
    blue: 'text-blue-600',
    purple: 'text-purple-600',
    amber: 'text-amber-600',
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-2xl">{icon}</span>
      <div>
        <p className={`text-xl font-bold ${color ? colorClasses[color] : 'text-gray-900'}`}>
          {value}
        </p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  );
}

function ModelCard({ model }: { model: AIModel }) {
  return (
    <div className="rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`flex h-12 w-12 items-center justify-center rounded-lg text-xl ${typeColors[model.type]}`}>
            {typeIcons[model.type]}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900">{model.name}</h3>
              <span className="text-xs text-gray-500">v{model.version}</span>
            </div>
            <p className="text-sm text-gray-500">{model.description}</p>
          </div>
        </div>
        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium capitalize ${statusColors[model.status]}`}>
          {model.status}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-3">
        <div>
          <p className="text-xs text-gray-500">Tenants</p>
          <p className="font-semibold text-gray-900">{model.tenantsUsing}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Accuracy</p>
          <p className={`font-semibold ${model.accuracy >= 95 ? 'text-green-600' : model.accuracy >= 90 ? 'text-amber-600' : 'text-red-600'}`}>
            {model.accuracy}%
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Parameters</p>
          <p className="font-semibold text-gray-900">{model.parameters}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Updated</p>
          <p className="font-semibold text-gray-900">
            {new Date(model.lastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </p>
        </div>
      </div>

      <div className="flex gap-2 pt-3 border-t border-gray-100">
        <button className="flex-1 py-1.5 rounded text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors">
          View Details
        </button>
        <button className="flex-1 py-1.5 rounded text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors">
          Clone
        </button>
        {model.status === 'active' && (
          <button className="flex-1 py-1.5 rounded text-sm font-medium text-purple-600 hover:bg-purple-50 transition-colors">
            Configure
          </button>
        )}
      </div>
    </div>
  );
}

export default AIModelManagement;
