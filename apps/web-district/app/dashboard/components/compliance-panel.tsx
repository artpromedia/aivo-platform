/**
 * Compliance Panel Component
 *
 * Shows district-wide compliance status for FERPA, COPPA, IEP, and state requirements.
 * Inspired by aivo/apps/portal/src/app/(enterprise)/enterprise/(dash)/page.tsx
 */

'use client';

import {
  Shield,
  CheckCircle,
  AlertTriangle,
  Clock,
  FileText,
  Users,
  Calendar,
  TrendingUp,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { useState } from 'react';

export interface ComplianceItem {
  id: string;
  name: string;
  status: 'compliant' | 'attention' | 'critical' | 'pending';
  score: number;
  lastAudit: string;
  nextAudit: string;
  issues: number;
  description: string;
}

export interface IEPComplianceStats {
  totalIEPs: number;
  activeIEPs: number;
  plans504: number;
  complianceRate: number;
  overdueCount: number;
  upcomingReviews30: number;
  upcomingReviews60: number;
  upcomingReviews90: number;
}

interface CompliancePanelProps {
  items?: ComplianceItem[];
  iepStats?: IEPComplianceStats;
  onViewDetails?: (itemId: string) => void;
  onRefresh?: () => void | Promise<void>;
}

const mockComplianceItems: ComplianceItem[] = [
  {
    id: 'ferpa',
    name: 'FERPA',
    status: 'compliant',
    score: 100,
    lastAudit: '2024-01-05',
    nextAudit: '2024-04-05',
    issues: 0,
    description: 'Family Educational Rights and Privacy Act',
  },
  {
    id: 'coppa',
    name: 'COPPA',
    status: 'compliant',
    score: 100,
    lastAudit: '2024-01-03',
    nextAudit: '2024-04-03',
    issues: 0,
    description: "Children's Online Privacy Protection Act",
  },
  {
    id: 'idea',
    name: 'IDEA/IEP',
    status: 'attention',
    score: 94,
    lastAudit: '2024-01-08',
    nextAudit: '2024-02-08',
    issues: 12,
    description: 'Individuals with Disabilities Education Act',
  },
  {
    id: 'state',
    name: 'State Privacy',
    status: 'compliant',
    score: 98,
    lastAudit: '2024-01-02',
    nextAudit: '2024-04-02',
    issues: 2,
    description: 'State-specific privacy requirements',
  },
];

const mockIEPStats: IEPComplianceStats = {
  totalIEPs: 487,
  activeIEPs: 462,
  plans504: 89,
  complianceRate: 94.2,
  overdueCount: 12,
  upcomingReviews30: 28,
  upcomingReviews60: 45,
  upcomingReviews90: 67,
};

export function CompliancePanel({
  items = mockComplianceItems,
  iepStats = mockIEPStats,
  onViewDetails,
  onRefresh,
}: CompliancePanelProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (onRefresh) {
      await onRefresh();
    }
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

  const getStatusColor = (status: ComplianceItem['status']) => {
    switch (status) {
      case 'compliant':
        return 'text-green-600 bg-green-100';
      case 'attention':
        return 'text-amber-600 bg-amber-100';
      case 'critical':
        return 'text-red-600 bg-red-100';
      case 'pending':
        return 'text-blue-600 bg-blue-100';
    }
  };

  const getStatusIcon = (status: ComplianceItem['status']) => {
    switch (status) {
      case 'compliant':
        return <CheckCircle className="w-4 h-4" />;
      case 'attention':
        return <AlertTriangle className="w-4 h-4" />;
      case 'critical':
        return <AlertTriangle className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
    }
  };

  const overallScore = Math.round(items.reduce((sum, item) => sum + item.score, 0) / items.length);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl">
              <Shield className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Compliance Status</h2>
              <p className="text-sm text-gray-500">District-wide regulatory compliance</p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Overall Score */}
        <div className="flex items-center gap-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl mb-6">
          <div className="relative">
            <svg className="w-24 h-24 transform -rotate-90">
              <circle cx="48" cy="48" r="40" stroke="#e5e7eb" strokeWidth="8" fill="none" />
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke="#10b981"
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${overallScore * 2.51} 251`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold text-green-700">{overallScore}%</span>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-green-900">Overall Compliance</h3>
            <p className="text-sm text-green-700">All major regulations met</p>
            <div className="flex items-center gap-2 mt-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-600">+2% from last month</span>
            </div>
          </div>
        </div>

        {/* Compliance Items Grid */}
        <div className="grid grid-cols-2 gap-4">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => onViewDetails?.(item.id)}
              className="p-4 border border-gray-200 rounded-xl hover:border-gray-300 hover:shadow-sm transition-all text-left"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-gray-900">{item.name}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(item.status)}`}
                >
                  {getStatusIcon(item.status)}
                  {item.status}
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-3">{item.description}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-lg font-bold text-gray-900">{item.score}%</p>
                    <p className="text-xs text-gray-500">Score</p>
                  </div>
                  {item.issues > 0 && (
                    <div>
                      <p className="text-lg font-bold text-amber-600">{item.issues}</p>
                      <p className="text-xs text-gray-500">Issues</p>
                    </div>
                  )}
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* IEP Compliance Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-purple-100 rounded-xl">
            <FileText className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">IEP Compliance</h3>
            <p className="text-sm text-gray-500">Special education compliance tracking</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="p-3 bg-blue-50 rounded-lg text-center">
            <p className="text-2xl font-bold text-blue-700">{iepStats.activeIEPs}</p>
            <p className="text-xs text-blue-600">Active IEPs</p>
          </div>
          <div className="p-3 bg-purple-50 rounded-lg text-center">
            <p className="text-2xl font-bold text-purple-700">{iepStats.plans504}</p>
            <p className="text-xs text-purple-600">504 Plans</p>
          </div>
          <div className="p-3 bg-green-50 rounded-lg text-center">
            <p className="text-2xl font-bold text-green-700">{iepStats.complianceRate}%</p>
            <p className="text-xs text-green-600">Compliance</p>
          </div>
          <div className="p-3 bg-red-50 rounded-lg text-center">
            <p className="text-2xl font-bold text-red-700">{iepStats.overdueCount}</p>
            <p className="text-xs text-red-600">Overdue</p>
          </div>
        </div>

        {/* Upcoming Reviews */}
        <div className="p-4 bg-gray-50 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Upcoming Reviews</span>
          </div>
          <div className="flex gap-4">
            <div className="flex-1 p-3 bg-white rounded-lg border border-gray-200">
              <p className="text-xl font-bold text-amber-600">{iepStats.upcomingReviews30}</p>
              <p className="text-xs text-gray-500">Next 30 days</p>
            </div>
            <div className="flex-1 p-3 bg-white rounded-lg border border-gray-200">
              <p className="text-xl font-bold text-blue-600">{iepStats.upcomingReviews60}</p>
              <p className="text-xs text-gray-500">Next 60 days</p>
            </div>
            <div className="flex-1 p-3 bg-white rounded-lg border border-gray-200">
              <p className="text-xl font-bold text-gray-600">{iepStats.upcomingReviews90}</p>
              <p className="text-xs text-gray-500">Next 90 days</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CompliancePanel;
