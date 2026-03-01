/**
 * AI Model Management Component
 *
 * Manage AI models, cloning, and deployment across tenants.
 * Now connected to real API endpoints via React Query hooks.
 */

'use client';

import * as React from 'react';
import { useAIModels, useModelSummary } from '@/hooks/use-admin-data';
import type { AIModel as APIModel, ModelSummaryMetrics, ModelType, ModelStatus } from '@/lib/api/models.api';
import { useHasWriteAccess } from '../../providers';

// Map API types to display types
type DisplayModelType = 'tutor' | 'assessment' | 'iep' | 'content' | 'translation' | 'embedding' | 'speech';

interface DisplayModel {
  id: string;
  name: string;
  version: string;
  type: DisplayModelType;
  status: ModelStatus;
  tenantsUsing: number;
  accuracy: number;
  lastUpdated: string;
  parameters: string;
  description: string;
}

const typeIcons: Record<string, string> = {
  tutor: '🎓',
  assessment: '📝',
  iep: '📋',
  content: '📚',
  translation: '🌐',
  embedding: '🔢',
  speech: '🎤',
};

const typeColors: Record<string, string> = {
  tutor: 'bg-blue-100 text-blue-700',
  assessment: 'bg-green-100 text-green-700',
  iep: 'bg-purple-100 text-purple-700',
  content: 'bg-amber-100 text-amber-700',
  translation: 'bg-sky-100 text-sky-700',
  embedding: 'bg-indigo-100 text-indigo-700',
  speech: 'bg-pink-100 text-pink-700',
};

const statusColors: Record<ModelStatus, string> = {
  active: 'bg-green-100 text-green-700',
  training: 'bg-blue-100 text-blue-700',
  testing: 'bg-amber-100 text-amber-700',
  deprecated: 'bg-red-100 text-red-700',
  pending: 'bg-gray-100 text-gray-700',
};

// Transform API model to display model
function toDisplayModel(model: APIModel): DisplayModel {
  return {
    id: model.id,
    name: model.displayName || model.name,
    version: model.version,
    type: model.type as DisplayModelType,
    status: model.status,
    tenantsUsing: model.tenantsUsing,
    accuracy: model.safetyRating * 100, // Convert to percentage
    lastUpdated: model.lastUpdated,
    parameters: model.parameters,
    description: model.description,
  };
}

export function AIModelManagement() {
  const [selectedType, setSelectedType] = React.useState<string | null>(null);
  const canWrite = useHasWriteAccess();

  // Fetch real data from API
  const { data: modelsData, isLoading: modelsLoading, error: modelsError, refetch: refetchModels } = useAIModels(
    selectedType ? { type: selectedType as ModelType } : undefined
  );
  const { data: metrics, isLoading: metricsLoading, error: metricsError } = useModelSummary();

  const models: DisplayModel[] = React.useMemo(() => {
    if (!modelsData?.data) return [];
    return modelsData.data.map(toDisplayModel);
  }, [modelsData]);

  const isLoading = modelsLoading || metricsLoading;
  const error = modelsError || metricsError;

  const modelTypes = ['tutor', 'assessment', 'iep', 'content', 'translation'] as const;

  // Error state
  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <h3 className="font-semibold text-red-800">Failed to load AI models</h3>
            <p className="text-sm text-red-600">
              {error instanceof Error ? error.message : 'Unable to connect to model registry'}
            </p>
          </div>
          <button
            onClick={() => refetchModels()}
            className="ml-auto rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

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
            {canWrite && (
              <>
                <button className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                  Clone Model
                </button>
                <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
                  + Deploy New
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-5 gap-4 p-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50/30">
        {metricsLoading ? (
          <>
            <MetricBoxSkeleton />
            <MetricBoxSkeleton />
            <MetricBoxSkeleton />
            <MetricBoxSkeleton />
            <MetricBoxSkeleton />
          </>
        ) : (
          <>
            <MetricBox
              icon="🧠"
              value={(metrics?.totalModels ?? 0).toString()}
              label="Total Models"
            />
            <MetricBox
              icon="✅"
              value={(metrics?.activeModels ?? 0).toString()}
              label="Active"
              color="green"
            />
            <MetricBox
              icon="⚙️"
              value={(metrics?.modelsInTraining ?? 0).toString()}
              label="Training"
              color="blue"
            />
            <MetricBox
              icon="🎯"
              value={`${(metrics?.averageAccuracy ?? 0).toFixed(1)}%`}
              label="Avg Accuracy"
              color="purple"
            />
            <MetricBox
              icon="⚡"
              value={`${((metrics?.totalInferences ?? 0) / 1000000).toFixed(1)}M`}
              label="Inferences"
              color="amber"
            />
          </>
        )}
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
        {modelsLoading ? (
          <>
            <ModelCardSkeleton />
            <ModelCardSkeleton />
            <ModelCardSkeleton />
            <ModelCardSkeleton />
          </>
        ) : (
          models.map((model) => (
            <ModelCard key={model.id} model={model} />
          ))
        )}
      </div>

      {!modelsLoading && models.length === 0 && (
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

function MetricBoxSkeleton() {
  return (
    <div className="flex items-center gap-3 animate-pulse">
      <div className="h-8 w-8 rounded bg-gray-200" />
      <div>
        <div className="h-6 w-16 rounded bg-gray-200 mb-1" />
        <div className="h-3 w-12 rounded bg-gray-200" />
      </div>
    </div>
  );
}

function ModelCard({ model }: { model: DisplayModel }) {
  const typeColor = typeColors[model.type] || 'bg-gray-100 text-gray-700';
  const typeIcon = typeIcons[model.type] || '🤖';
  const statusColor = statusColors[model.status] || 'bg-gray-100 text-gray-700';

  return (
    <div className="rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`flex h-12 w-12 items-center justify-center rounded-lg text-xl ${typeColor}`}>
            {typeIcon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900">{model.name}</h3>
              <span className="text-xs text-gray-500">v{model.version}</span>
            </div>
            <p className="text-sm text-gray-500">{model.description}</p>
          </div>
        </div>
        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium capitalize ${statusColor}`}>
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

function ModelCardSkeleton() {
  return (
    <div className="rounded-lg border border-gray-200 p-4 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-lg bg-gray-200" />
          <div>
            <div className="h-5 w-32 rounded bg-gray-200 mb-2" />
            <div className="h-4 w-48 rounded bg-gray-200" />
          </div>
        </div>
        <div className="h-6 w-16 rounded-full bg-gray-200" />
      </div>
      <div className="grid grid-cols-4 gap-4 mb-3">
        <div>
          <div className="h-3 w-12 rounded bg-gray-200 mb-1" />
          <div className="h-5 w-8 rounded bg-gray-200" />
        </div>
        <div>
          <div className="h-3 w-12 rounded bg-gray-200 mb-1" />
          <div className="h-5 w-10 rounded bg-gray-200" />
        </div>
        <div>
          <div className="h-3 w-12 rounded bg-gray-200 mb-1" />
          <div className="h-5 w-8 rounded bg-gray-200" />
        </div>
        <div>
          <div className="h-3 w-12 rounded bg-gray-200 mb-1" />
          <div className="h-5 w-12 rounded bg-gray-200" />
        </div>
      </div>
      <div className="flex gap-2 pt-3 border-t border-gray-100">
        <div className="flex-1 h-8 rounded bg-gray-200" />
        <div className="flex-1 h-8 rounded bg-gray-200" />
      </div>
    </div>
  );
}

export default AIModelManagement;
