/**
 * Enhanced System Health Component
 *
 * Real-time system health monitoring with service status, latency tracking,
 * and live operations feed.
 * Inspired by aivo-pro/apps/super-admin/src/pages/Dashboard.tsx
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Activity,
  Server,
  Database,
  Globe,
  Cloud,
  Cpu,
  HardDrive,
  Wifi,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Zap,
} from 'lucide-react';

interface Service {
  id: string;
  name: string;
  type: 'api' | 'database' | 'cache' | 'ai' | 'cdn' | 'storage';
  status: 'healthy' | 'degraded' | 'down';
  uptime: number;
  latency: number;
  requests: number;
  errors: number;
  lastCheck: string;
}

interface LiveOperation {
  id: string;
  type: 'deployment' | 'scaling' | 'alert' | 'backup' | 'maintenance';
  message: string;
  status: 'success' | 'warning' | 'error' | 'info';
  timestamp: string;
}

interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkIO: number;
}

interface SystemHealthEnhancedProps {
  services?: Service[];
  operations?: LiveOperation[];
  metrics?: SystemMetrics;
  onRefresh?: () => void;
}

const mockServices: Service[] = [
  {
    id: 'api-gateway',
    name: 'API Gateway',
    type: 'api',
    status: 'healthy',
    uptime: 99.99,
    latency: 45,
    requests: 1_245_832,
    errors: 12,
    lastCheck: new Date(Date.now() - 10000).toISOString(),
  },
  {
    id: 'db-primary',
    name: 'Database Cluster',
    type: 'database',
    status: 'healthy',
    uptime: 99.97,
    latency: 8,
    requests: 892_456,
    errors: 3,
    lastCheck: new Date(Date.now() - 10000).toISOString(),
  },
  {
    id: 'redis-cache',
    name: 'Redis Cache',
    type: 'cache',
    status: 'healthy',
    uptime: 100,
    latency: 2,
    requests: 3_456_789,
    errors: 0,
    lastCheck: new Date(Date.now() - 10000).toISOString(),
  },
  {
    id: 'ai-services',
    name: 'AI Services',
    type: 'ai',
    status: 'degraded',
    uptime: 99.85,
    latency: 245,
    requests: 456_123,
    errors: 89,
    lastCheck: new Date(Date.now() - 10000).toISOString(),
  },
  {
    id: 'cdn-network',
    name: 'CDN Network',
    type: 'cdn',
    status: 'healthy',
    uptime: 100,
    latency: 12,
    requests: 8_923_456,
    errors: 0,
    lastCheck: new Date(Date.now() - 10000).toISOString(),
  },
  {
    id: 'blob-storage',
    name: 'Blob Storage',
    type: 'storage',
    status: 'healthy',
    uptime: 99.99,
    latency: 35,
    requests: 234_567,
    errors: 2,
    lastCheck: new Date(Date.now() - 10000).toISOString(),
  },
];

const mockOperations: LiveOperation[] = [
  {
    id: 'op-1',
    type: 'deployment',
    message: 'Successfully deployed api-gateway v2.4.1',
    status: 'success',
    timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
  },
  {
    id: 'op-2',
    type: 'scaling',
    message: 'Auto-scaled AI services from 4 to 6 instances',
    status: 'info',
    timestamp: new Date(Date.now() - 32 * 60000).toISOString(),
  },
  {
    id: 'op-3',
    type: 'alert',
    message: 'High latency detected on AI Services cluster',
    status: 'warning',
    timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
  },
  {
    id: 'op-4',
    type: 'backup',
    message: 'Daily database backup completed',
    status: 'success',
    timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
  {
    id: 'op-5',
    type: 'maintenance',
    message: 'Scheduled maintenance window completed',
    status: 'success',
    timestamp: new Date(Date.now() - 4 * 3600000).toISOString(),
  },
];

const mockMetrics: SystemMetrics = {
  cpuUsage: 34,
  memoryUsage: 67,
  diskUsage: 45,
  networkIO: 78,
};

export function SystemHealthEnhanced({
  services = mockServices,
  operations = mockOperations,
  metrics = mockMetrics,
  onRefresh,
}: SystemHealthEnhancedProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedService, setExpandedService] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      handleRefresh();
    }, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh?.();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const getServiceIcon = (type: Service['type']) => {
    switch (type) {
      case 'api': return Server;
      case 'database': return Database;
      case 'cache': return Zap;
      case 'ai': return Cpu;
      case 'cdn': return Globe;
      case 'storage': return HardDrive;
    }
  };

  const getStatusColor = (status: Service['status']) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'degraded': return 'text-amber-600 bg-amber-100';
      case 'down': return 'text-red-600 bg-red-100';
    }
  };

  const getStatusIcon = (status: Service['status']) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-4 h-4" />;
      case 'degraded': return <AlertTriangle className="w-4 h-4" />;
      case 'down': return <XCircle className="w-4 h-4" />;
    }
  };

  const getOperationColor = (status: LiveOperation['status']) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-700 border-green-200';
      case 'warning': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'error': return 'bg-red-100 text-red-700 border-red-200';
      case 'info': return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  const healthyCount = services.filter(s => s.status === 'healthy').length;
  const overallStatus = services.some(s => s.status === 'down') ? 'down' :
                        services.some(s => s.status === 'degraded') ? 'degraded' : 'healthy';

  const formatNumber = (num: number) => {
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
    return num.toString();
  };

  const formatTime = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* System Metrics */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${
              overallStatus === 'healthy' ? 'bg-green-100' :
              overallStatus === 'degraded' ? 'bg-amber-100' : 'bg-red-100'
            }`}>
              <Activity className={`w-6 h-6 ${
                overallStatus === 'healthy' ? 'text-green-600' :
                overallStatus === 'degraded' ? 'text-amber-600' : 'text-red-600'
              }`} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">System Health</h2>
              <p className="text-sm text-gray-500">
                {healthyCount}/{services.length} services healthy
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded text-indigo-600"
              />
              Auto-refresh
            </label>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Resource Metrics */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">CPU</span>
              <Cpu className="w-4 h-4 text-gray-400" />
            </div>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold text-gray-900">{metrics.cpuUsage}%</span>
            </div>
            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  metrics.cpuUsage < 60 ? 'bg-green-500' :
                  metrics.cpuUsage < 80 ? 'bg-amber-500' : 'bg-red-500'
                }`}
                style={{ width: `${metrics.cpuUsage}%` }}
              />
            </div>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Memory</span>
              <HardDrive className="w-4 h-4 text-gray-400" />
            </div>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold text-gray-900">{metrics.memoryUsage}%</span>
            </div>
            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  metrics.memoryUsage < 70 ? 'bg-green-500' :
                  metrics.memoryUsage < 85 ? 'bg-amber-500' : 'bg-red-500'
                }`}
                style={{ width: `${metrics.memoryUsage}%` }}
              />
            </div>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Disk</span>
              <Database className="w-4 h-4 text-gray-400" />
            </div>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold text-gray-900">{metrics.diskUsage}%</span>
            </div>
            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  metrics.diskUsage < 70 ? 'bg-green-500' :
                  metrics.diskUsage < 85 ? 'bg-amber-500' : 'bg-red-500'
                }`}
                style={{ width: `${metrics.diskUsage}%` }}
              />
            </div>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Network</span>
              <Wifi className="w-4 h-4 text-gray-400" />
            </div>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold text-gray-900">{metrics.networkIO}%</span>
            </div>
            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-500"
                style={{ width: `${metrics.networkIO}%` }}
              />
            </div>
          </div>
        </div>

        {/* Services */}
        <div className="space-y-2">
          {services.map((service) => {
            const Icon = getServiceIcon(service.type);
            const isExpanded = expandedService === service.id;

            return (
              <div key={service.id} className="border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpandedService(isExpanded ? null : service.id)}
                  className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <Icon className="w-5 h-5 text-gray-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-gray-900">{service.name}</p>
                      <p className="text-xs text-gray-500">{service.latency}ms latency</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(service.status)}`}>
                      {getStatusIcon(service.status)}
                      {service.status}
                    </span>
                    <span className="text-sm text-gray-500">{service.uptime}% uptime</span>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </button>
                {isExpanded && (
                  <div className="px-4 pb-4 pt-0 border-t border-gray-100 bg-gray-50">
                    <div className="grid grid-cols-4 gap-4 mt-3">
                      <div>
                        <p className="text-xs text-gray-500">Requests</p>
                        <p className="font-semibold text-gray-900">{formatNumber(service.requests)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Errors</p>
                        <p className={`font-semibold ${service.errors > 50 ? 'text-red-600' : 'text-gray-900'}`}>
                          {service.errors}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Error Rate</p>
                        <p className="font-semibold text-gray-900">
                          {((service.errors / service.requests) * 100).toFixed(3)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Last Check</p>
                        <p className="font-semibold text-gray-900">{formatTime(service.lastCheck)}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Operations Feed */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-indigo-100 rounded-xl">
            <Clock className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Live Operations</h3>
            <p className="text-sm text-gray-500">Recent system events</p>
          </div>
        </div>

        <div className="space-y-3">
          {operations.map((op) => (
            <div
              key={op.id}
              className={`p-3 rounded-lg border ${getOperationColor(op.status)}`}
            >
              <div className="flex items-start justify-between">
                <p className="text-sm font-medium">{op.message}</p>
                <span className="text-xs opacity-75">{formatTime(op.timestamp)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SystemHealthEnhanced;
