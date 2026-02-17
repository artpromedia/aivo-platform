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
  Calendar,
  TrendingUp,
  ChevronRight,
  RefreshCw,
  Mail,
  Download,
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

export interface AtRiskIEP {
  id: string;
  studentName: string;
  school: string;
  caseManager: string;
  caseManagerEmail: string;
  dueDate: string;
  daysUntilDue: number;
  isOverdue: boolean;
}

interface CompliancePanelProps {
  items?: ComplianceItem[];
  iepStats?: IEPComplianceStats;
  atRiskIEPs?: AtRiskIEP[];
  onViewDetails?: (itemId: string) => void;
  onRefresh?: () => void | Promise<void>;
  onEmailCaseManager?: (email: string, studentName: string) => void;
}

function buildCaseManagerEmailUrl(email: string, studentName: string, isOverdue: boolean): string {
  const subject = isOverdue
    ? `URGENT: Overdue IEP Annual Review – ${studentName}`
    : `Upcoming IEP Annual Review – ${studentName}`;
  const body = isOverdue
    ? `Dear Case Manager,\n\nThis is a reminder that the annual IEP review for ${studentName} is past due. Please schedule the review meeting as soon as possible to maintain compliance.\n\nPlease update the IEP status in AIVO once the review is scheduled.\n\nThank you.`
    : `Dear Case Manager,\n\nThis is a reminder that the annual IEP review for ${studentName} is coming up. Please begin preparations and schedule the review meeting.\n\nPlease update the IEP status in AIVO once the review is scheduled.\n\nThank you.`;
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function CompliancePanel({
  items = [],
  iepStats,
  atRiskIEPs = [],
  onViewDetails,
  onRefresh,
  onEmailCaseManager,
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                // Download CSV compliance report via IEP proxy
                const a = document.createElement('a');
                a.href = '/api/iep/compliance/report?format=csv';
                a.download = `compliance-report-${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
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

        {/* At-Risk & Overdue IEPs */}
        {atRiskIEPs.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium text-gray-700">At-Risk &amp; Overdue IEPs</span>
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                {atRiskIEPs.filter((i) => i.isOverdue).length} overdue
              </span>
            </div>
            <div className="space-y-2">
              {atRiskIEPs.map((iep) => (
                <div
                  key={iep.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    iep.isOverdue ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 text-sm">{iep.studentName}</span>
                      {iep.isOverdue && (
                        <span className="rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white uppercase">
                          URGENT
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600">
                      {iep.school} · Case Manager: {iep.caseManager} · Due: {iep.dueDate}
                    </p>
                  </div>
                  <a
                    href={buildCaseManagerEmailUrl(
                      iep.caseManagerEmail,
                      iep.studentName,
                      iep.isOverdue
                    )}
                    onClick={() => onEmailCaseManager?.(iep.caseManagerEmail, iep.studentName)}
                    className="flex items-center gap-1.5 rounded-lg bg-white border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    title={`Email ${iep.caseManager}`}
                  >
                    <Mail className="w-3.5 h-3.5" />
                    Email
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CompliancePanel;
