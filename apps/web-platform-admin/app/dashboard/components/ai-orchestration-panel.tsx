/**
 * AI Orchestration Panel Component
 *
 * Shows multi-provider AI status, costs, latency, and allows manual failover.
 * Now connected to real API endpoints via React Query hooks.
 */

'use client';

import { useState } from 'react';
import { useConfirm } from '@aivo/ui-web';
import {
  Cpu,
  DollarSign,
  Clock,
  AlertTriangle,
  RefreshCw,
  Settings,
  Zap,
  Server,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { useAIProviders, useOrchestrationSummary, useSwitchPrimaryProvider } from '@/hooks/use-admin-data';
import type { AIProvider as APIProvider } from '@/lib/api/orchestration.api';
import { useHasWriteAccess } from '../../providers';

interface DisplayProvider {
  id: string;
  name: string;
  status: 'active' | 'standby' | 'degraded' | 'offline' | 'maintenance';
  requestsToday: number;
  costToday: number;
  avgLatency: number;
  errorRate: number;
  isPrimary: boolean;
  models: string[];
  lastHealthCheck: string;
}

// Transform API provider to display provider
function toDisplayProvider(provider: APIProvider): DisplayProvider {
  return {
    id: provider.id,
    name: provider.displayName || provider.name,
    status: provider.status,
    requestsToday: provider.requestsToday,
    costToday: provider.costToday,
    avgLatency: provider.avgLatency,
    errorRate: provider.errorRate,
    isPrimary: provider.isPrimary,
    models: provider.models?.map(m => m.name) || [],
    lastHealthCheck: provider.lastHealthCheck,
  };
}

export function AIOrchestrationPanel() {
  const confirm = useConfirm();
  const canWrite = useHasWriteAccess();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Fetch real data from API
  const { 
    data: providersData, 
    isLoading: providersLoading, 
    error: providersError,
    refetch: refetchProviders 
  } = useAIProviders();
  const { 
    data: summaryData, 
    isLoading: summaryLoading,
    refetch: refetchSummary 
  } = useOrchestrationSummary();
  const switchPrimaryMutation = useSwitchPrimaryProvider();

  const providers: DisplayProvider[] = providersData?.map(toDisplayProvider) ?? [];
  const totalRequestsToday = summaryData?.totalRequestsToday ?? 0;
  const totalCostToday = summaryData?.totalCostToday ?? 0;

  const isLoading = providersLoading || summaryLoading;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refetchProviders(), refetchSummary()]);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleSwitchPrimary = async (providerId: string) => {
    const providerName = providers.find(p => p.id === providerId)?.name;
    const ok = await confirm({
      title: 'Switch Primary Provider',
      description: `Switch primary AI provider to ${providerName}?`,
      confirmLabel: 'Switch',
    });
    if (ok) {
      switchPrimaryMutation.mutate({ providerId: providerId as 'openai' | 'anthropic' | 'google' | 'meta' | 'cohere' | 'azure' });
    }
  };

  const getStatusColor = (status: DisplayProvider['status']) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'standby': return 'bg-blue-100 text-blue-700';
      case 'degraded': return 'bg-amber-100 text-amber-700';
      case 'offline': return 'bg-red-100 text-red-700';
      case 'maintenance': return 'bg-purple-100 text-purple-700';
    }
  };

  const getStatusDot = (status: DisplayProvider['status']) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'standby': return 'bg-blue-500';
      case 'degraded': return 'bg-amber-500 animate-pulse';
      case 'offline': return 'bg-red-500';
      case 'maintenance': return 'bg-purple-500';
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
    return num.toString();
  };

  const primaryProvider = providers.find(p => p.isPrimary);
  const activeProviders = providers.filter(p => p.status !== 'offline').length;

  // Error state
  if (providersError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <h3 className="font-semibold text-red-800">Failed to load AI providers</h3>
            <p className="text-sm text-red-600">
              {providersError instanceof Error ? providersError.message : 'Unable to connect to orchestration service'}
            </p>
          </div>
          <button
            onClick={() => handleRefresh()}
            className="ml-auto rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-xl">
              <Cpu className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">AI Provider Orchestration</h2>
              <p className="text-sm text-gray-500">
                Primary: {primaryProvider?.name || 'None'} | {activeProviders}/{providers.length} providers active
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canWrite && (
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`p-2 rounded-lg transition-colors ${
                  showSettings ? 'bg-indigo-100 text-indigo-600' : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                <Settings className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="p-3 bg-purple-50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-purple-600" />
              <span className="text-xs text-purple-600">Requests Today</span>
            </div>
            <p className="text-xl font-bold text-purple-700">{formatNumber(totalRequestsToday)}</p>
          </div>
          <div className="p-3 bg-green-50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-green-600" />
              <span className="text-xs text-green-600">Cost Today</span>
            </div>
            <p className="text-xl font-bold text-green-700">${totalCostToday.toLocaleString()}</p>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-blue-600" />
              <span className="text-xs text-blue-600">Avg Latency</span>
            </div>
            <p className="text-xl font-bold text-blue-700">
              {Math.round(providers.reduce((sum, p) => sum + p.avgLatency, 0) / providers.length)}ms
            </p>
          </div>
          <div className="p-3 bg-amber-50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span className="text-xs text-amber-600">Error Rate</span>
            </div>
            <p className="text-xl font-bold text-amber-700">
              {(providers.reduce((sum, p) => sum + p.errorRate, 0) / providers.length * 100).toFixed(2)}%
            </p>
          </div>
        </div>
      </div>

      {/* Provider Cards */}
      <div className="p-6">
        <div className="grid grid-cols-2 gap-4">
          {providers.map((provider) => (
            <div
              key={provider.id}
              className={`p-4 rounded-xl border-2 transition-all ${
                provider.isPrimary
                  ? 'border-purple-300 bg-purple-50/50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    provider.isPrimary ? 'bg-purple-100' : 'bg-gray-100'
                  }`}>
                    <Server className={`w-5 h-5 ${provider.isPrimary ? 'text-purple-600' : 'text-gray-500'}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{provider.name}</span>
                      {provider.isPrimary && (
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                          Primary
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`w-2 h-2 rounded-full ${getStatusDot(provider.status)}`} />
                      <span className={`text-xs px-1.5 py-0.5 rounded ${getStatusColor(provider.status)}`}>
                        {provider.status}
                      </span>
                    </div>
                  </div>
                </div>
                {showSettings && !provider.isPrimary && provider.status !== 'offline' && (
                  <button
                    onClick={() => handleSwitchPrimary(provider.id)}
                    className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                    title="Set as primary"
                  >
                    <ToggleLeft className="w-5 h-5" />
                  </button>
                )}
                {provider.isPrimary && (
                  <ToggleRight className="w-5 h-5 text-purple-600" />
                )}
              </div>

              {/* Models */}
              <div className="flex flex-wrap gap-1 mb-3">
                {provider.models.map((model) => (
                  <span key={model} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                    {model}
                  </span>
                ))}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-500">Requests</p>
                  <p className="font-semibold text-gray-900">{formatNumber(provider.requestsToday)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Cost</p>
                  <p className="font-semibold text-gray-900">${provider.costToday.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Latency</p>
                  <p className={`font-semibold ${
                    provider.avgLatency < 300 ? 'text-green-600' :
                    provider.avgLatency < 500 ? 'text-amber-600' : 'text-red-600'
                  }`}>
                    {provider.avgLatency}ms
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Error Rate</p>
                  <p className={`font-semibold ${
                    provider.errorRate < 0.05 ? 'text-green-600' :
                    provider.errorRate < 0.1 ? 'text-amber-600' : 'text-red-600'
                  }`}>
                    {(provider.errorRate * 100).toFixed(2)}%
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Failover Settings (shown when settings is active) */}
      {showSettings && (
        <div className="p-6 pt-0">
          <div className="p-4 bg-gray-50 rounded-xl">
            <h3 className="font-medium text-gray-900 mb-3">Failover Configuration</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">Auto-failover</p>
                  <p className="text-xs text-gray-500">Automatically switch providers on errors</p>
                </div>
                <div className="w-10 h-6 bg-purple-500 rounded-full relative cursor-pointer">
                  <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">Error threshold</p>
                  <p className="text-xs text-gray-500">Trigger failover after X% errors</p>
                </div>
                <span className="text-sm font-semibold text-gray-900">5%</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">Latency threshold</p>
                  <p className="text-xs text-gray-500">Trigger failover if latency exceeds</p>
                </div>
                <span className="text-sm font-semibold text-gray-900">500ms</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AIOrchestrationPanel;
