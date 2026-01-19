/**
 * Compliance Reports Component
 *
 * Generates and displays compliance reports for the district including:
 * - FERPA, COPPA, IDEA/IEP compliance tracking
 * - State reporting requirements
 * - Audit logs and compliance history
 * - Scheduled report generation
 */

'use client';

import { useState } from 'react';
import {
  FileText,
  Shield,
  Calendar,
  Download,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ChevronRight,
  RefreshCw,
  Filter,
  Search,
  Eye,
  Send,
  Plus,
} from 'lucide-react';

export interface ComplianceReport {
  id: string;
  name: string;
  type: 'ferpa' | 'coppa' | 'idea' | 'state' | 'custom';
  status: 'compliant' | 'attention' | 'critical' | 'pending';
  generatedAt: string;
  period: string;
  findings: number;
  criticalFindings: number;
  schools: number;
  downloadUrl?: string;
}

export interface ScheduledReport {
  id: string;
  name: string;
  type: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  nextRun: string;
  recipients: string[];
  enabled: boolean;
}

interface ComplianceReportsProps {
  districtId?: string;
  reports?: ComplianceReport[];
  scheduledReports?: ScheduledReport[];
  onGenerateReport?: (type: string) => void;
  onViewReport?: (reportId: string) => void;
  onDownloadReport?: (reportId: string) => void;
}

// Mock data
const mockReports: ComplianceReport[] = [
  {
    id: 'report-1',
    name: 'Q1 2026 FERPA Compliance Report',
    type: 'ferpa',
    status: 'compliant',
    generatedAt: '2026-01-15T10:30:00Z',
    period: 'Q1 2026',
    findings: 2,
    criticalFindings: 0,
    schools: 14,
  },
  {
    id: 'report-2',
    name: 'January COPPA Audit',
    type: 'coppa',
    status: 'compliant',
    generatedAt: '2026-01-10T14:00:00Z',
    period: 'January 2026',
    findings: 0,
    criticalFindings: 0,
    schools: 14,
  },
  {
    id: 'report-3',
    name: 'IEP Compliance - January Review',
    type: 'idea',
    status: 'attention',
    generatedAt: '2026-01-12T09:00:00Z',
    period: 'January 2026',
    findings: 15,
    criticalFindings: 3,
    schools: 14,
  },
  {
    id: 'report-4',
    name: 'State Annual Data Collection',
    type: 'state',
    status: 'pending',
    generatedAt: '2026-01-08T11:00:00Z',
    period: 'FY 2025-2026',
    findings: 8,
    criticalFindings: 0,
    schools: 14,
  },
  {
    id: 'report-5',
    name: 'December 2025 IEP Review',
    type: 'idea',
    status: 'critical',
    generatedAt: '2025-12-20T08:00:00Z',
    period: 'December 2025',
    findings: 22,
    criticalFindings: 8,
    schools: 14,
  },
];

const mockScheduledReports: ScheduledReport[] = [
  {
    id: 'sched-1',
    name: 'Weekly IEP Status Summary',
    type: 'idea',
    frequency: 'weekly',
    nextRun: '2026-01-26T08:00:00Z',
    recipients: ['admin@district.edu', 'sped@district.edu'],
    enabled: true,
  },
  {
    id: 'sched-2',
    name: 'Monthly Compliance Overview',
    type: 'custom',
    frequency: 'monthly',
    nextRun: '2026-02-01T06:00:00Z',
    recipients: ['superintendent@district.edu', 'admin@district.edu'],
    enabled: true,
  },
  {
    id: 'sched-3',
    name: 'Quarterly FERPA Audit',
    type: 'ferpa',
    frequency: 'quarterly',
    nextRun: '2026-04-01T06:00:00Z',
    recipients: ['admin@district.edu', 'legal@district.edu'],
    enabled: true,
  },
];

const reportTypes = [
  { id: 'ferpa', name: 'FERPA Compliance', description: 'Family Educational Rights and Privacy Act' },
  { id: 'coppa', name: 'COPPA Compliance', description: "Children's Online Privacy Protection Act" },
  { id: 'idea', name: 'IDEA/IEP Compliance', description: 'Individuals with Disabilities Education Act' },
  { id: 'state', name: 'State Reporting', description: 'State-specific requirements' },
  { id: 'custom', name: 'Custom Report', description: 'Custom compliance report' },
];

export function ComplianceReports({
  districtId,
  reports = mockReports,
  scheduledReports = mockScheduledReports,
  onGenerateReport,
  onViewReport,
  onDownloadReport,
}: ComplianceReportsProps) {
  const [activeTab, setActiveTab] = useState<'reports' | 'scheduled'>('reports');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);

  const getStatusIcon = (status: ComplianceReport['status']) => {
    switch (status) {
      case 'compliant': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'attention': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'critical': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'pending': return <Clock className="w-5 h-5 text-blue-500" />;
    }
  };

  const getStatusBadge = (status: ComplianceReport['status']) => {
    const classes = {
      'compliant': 'bg-green-100 text-green-700',
      'attention': 'bg-amber-100 text-amber-700',
      'critical': 'bg-red-100 text-red-700',
      'pending': 'bg-blue-100 text-blue-700',
    };
    return classes[status];
  };

  const getTypeLabel = (type: ComplianceReport['type']) => {
    const labels = {
      'ferpa': 'FERPA',
      'coppa': 'COPPA',
      'idea': 'IDEA/IEP',
      'state': 'State',
      'custom': 'Custom',
    };
    return labels[type];
  };

  const getTypeBadge = (type: ComplianceReport['type']) => {
    const classes = {
      'ferpa': 'bg-purple-100 text-purple-700',
      'coppa': 'bg-blue-100 text-blue-700',
      'idea': 'bg-indigo-100 text-indigo-700',
      'state': 'bg-gray-100 text-gray-700',
      'custom': 'bg-teal-100 text-teal-700',
    };
    return classes[type];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredReports = reports.filter(report => {
    if (typeFilter !== 'all' && report.type !== typeFilter) return false;
    if (statusFilter !== 'all' && report.status !== statusFilter) return false;
    if (searchQuery && !report.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleGenerateReport = async (type: string) => {
    setIsGenerating(true);
    await onGenerateReport?.(type);
    setTimeout(() => {
      setIsGenerating(false);
      setShowGenerateModal(false);
    }, 2000);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-emerald-100 to-green-100 rounded-xl">
              <Shield className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Compliance Reports</h2>
              <p className="text-sm text-gray-500">Generate and manage regulatory compliance reports</p>
            </div>
          </div>
          <button
            onClick={() => setShowGenerateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Generate Report
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-gray-200 -mb-6">
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'reports'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Recent Reports
          </button>
          <button
            onClick={() => setActiveTab('scheduled')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'scheduled'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Scheduled Reports
          </button>
        </div>
      </div>

      {activeTab === 'reports' && (
        <>
          {/* Filters */}
          <div className="p-4 bg-gray-50 border-b border-gray-100 flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search reports..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="all">All Types</option>
              <option value="ferpa">FERPA</option>
              <option value="coppa">COPPA</option>
              <option value="idea">IDEA/IEP</option>
              <option value="state">State</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="all">All Statuses</option>
              <option value="compliant">Compliant</option>
              <option value="attention">Needs Attention</option>
              <option value="critical">Critical</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          {/* Reports List */}
          <div className="divide-y divide-gray-100">
            {filteredReports.map((report) => (
              <div
                key={report.id}
                className="p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start gap-4">
                  {getStatusIcon(report.status)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 truncate">{report.name}</h3>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getTypeBadge(report.type)}`}>
                        {getTypeLabel(report.type)}
                      </span>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusBadge(report.status)}`}>
                        {report.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      Period: {report.period} • {report.schools} schools • Generated {formatDate(report.generatedAt)}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <span className="text-gray-600">{report.findings} findings</span>
                      {report.criticalFindings > 0 && (
                        <span className="text-red-600 font-medium">{report.criticalFindings} critical</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onViewReport?.(report.id)}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="View Report"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => onDownloadReport?.(report.id)}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Download Report"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {filteredReports.length === 0 && (
              <div className="p-12 text-center">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No reports match your filters</p>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'scheduled' && (
        <div className="divide-y divide-gray-100">
          {scheduledReports.map((report) => (
            <div
              key={report.id}
              className="p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className={`p-2 rounded-lg ${report.enabled ? 'bg-green-100' : 'bg-gray-100'}`}>
                  <Calendar className={`w-5 h-5 ${report.enabled ? 'text-green-600' : 'text-gray-400'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">{report.name}</h3>
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-indigo-100 text-indigo-700 capitalize">
                      {report.frequency}
                    </span>
                    {!report.enabled && (
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-500">
                        Disabled
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    Next run: {formatDate(report.nextRun)}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Send className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-500">{report.recipients.join(', ')}</span>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={report.enabled}
                    className="sr-only peer"
                    readOnly
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Generate Report Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Generate Compliance Report</h3>
              <p className="text-sm text-gray-500 mt-1">Select the type of report to generate</p>
            </div>
            <div className="p-6 space-y-3">
              {reportTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => handleGenerateReport(type.id)}
                  disabled={isGenerating}
                  className="w-full p-4 border border-gray-200 rounded-lg hover:border-emerald-300 hover:bg-emerald-50 transition-colors text-left disabled:opacity-50"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-900">{type.name}</h4>
                      <p className="text-sm text-gray-500">{type.description}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </button>
              ))}
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowGenerateModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ComplianceReports;
