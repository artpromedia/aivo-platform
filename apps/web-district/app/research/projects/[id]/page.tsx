'use client';

import { Card, Heading, Button, Badge } from '@aivo/ui-web';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface ResearchProject {
  id: string;
  tenantId: string;
  title: string;
  description?: string;
  type: 'INTERNAL_EVAL' | 'EXTERNAL_RESEARCH' | 'VENDOR_STUDY';
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'CLOSED';
  piName: string;
  piEmail: string;
  piAffiliation?: string;
  startDate?: string;
  endDate?: string;
  irbProtocolId?: string;
  irbExpiryDate?: string;
  approvedAt?: string;
  approvedByUserId?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  cohorts: Cohort[];
  datasetDefinitions: DatasetDefinition[];
  accessGrants: AccessGrant[];
  dataUseAgreements: DUA[];
}

interface Cohort {
  id: string;
  name: string;
  description?: string;
  filters: Record<string, unknown>;
  estimatedCount?: number;
  createdAt: string;
}

interface DatasetDefinition {
  id: string;
  name: string;
  description?: string;
  baseTable: string;
  createdAt: string;
}

interface AccessGrant {
  id: string;
  userId: string;
  userEmail: string;
  scope: 'AGG_ONLY' | 'DEIDENTIFIED_LEARNER_LEVEL' | 'INTERNAL_FULL_ACCESS';
  isActive: boolean;
  expiresAt?: string;
  grantedAt: string;
}

interface DUA {
  id: string;
  version: number;
  status: 'DRAFT' | 'ACTIVE' | 'SUPERSEDED' | 'EXPIRED';
  createdAt: string;
  effectiveAt?: string;
  expiresAt?: string;
}

interface ExportJob {
  id: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'EXPIRED';
  format: 'CSV' | 'JSON' | 'PARQUET';
  rowCount?: number;
  createdAt: string;
  completedAt?: string;
  expiresAt?: string;
}

type TabId = 'overview' | 'cohorts' | 'datasets' | 'exports' | 'access' | 'audit';

// ═══════════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════════

const STATUS_COLORS: Record<ResearchProject['status'], string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  PENDING_APPROVAL: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  CLOSED: 'bg-gray-300 text-gray-600',
};

function formatDate(dateStr?: string): string {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════════

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<ResearchProject | null>(null);
  const [exports, setExports] = useState<ExportJob[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadProject = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/research/projects/${projectId}`, {
        headers: { Authorization: 'Bearer mock-token' },
      });

      if (!res.ok) throw new Error('Failed to load project');
      const data = await res.json();
      setProject(data);

      // Load exports
      const exportsRes = await fetch(`/api/research/exports?projectId=${projectId}`, {
        headers: { Authorization: 'Bearer mock-token' },
      });
      if (exportsRes.ok) {
        const exportsData = await exportsRes.json();
        setExports(exportsData.data ?? []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadProject();
  }, [loadProject]);

  const handleAction = async (action: 'submit' | 'approve' | 'reject' | 'close') => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/research/projects/${projectId}/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-token',
        },
        body: action === 'reject' ? JSON.stringify({ reason: 'Please provide more details about the methodology.' }) : undefined,
      });

      if (!res.ok) throw new Error(`Failed to ${action} project`);
      await loadProject();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} project`);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-muted">Loading project...</div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <Card title="Error" className="border-error">
        <p className="text-error">{error || 'Project not found'}</p>
        <Button variant="primary" onClick={loadProject} className="mt-4">
          Retry
        </Button>
      </Card>
    );
  }

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'cohorts', label: 'Cohorts', count: project.cohorts?.length },
    { id: 'datasets', label: 'Datasets', count: project.datasetDefinitions?.length },
    { id: 'exports', label: 'Exports', count: exports.length },
    { id: 'access', label: 'Access', count: project.accessGrants?.length },
    { id: 'audit', label: 'Audit Log' },
  ];

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link href="/research" className="text-muted hover:text-primary">
              ← Research Portal
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Heading level={1}>{project.title}</Heading>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[project.status]}`}>
              {project.status.replace('_', ' ')}
            </span>
          </div>
          <p className="text-muted mt-1">PI: {project.piName} • {project.piEmail}</p>
        </div>

        {/* Status Actions */}
        <div className="flex gap-2">
          {project.status === 'DRAFT' && (
            <Button variant="primary" onClick={() => handleAction('submit')} disabled={actionLoading}>
              Submit for Approval
            </Button>
          )}
          {project.status === 'PENDING_APPROVAL' && (
            <>
              <Button variant="secondary" onClick={() => handleAction('reject')} disabled={actionLoading}>
                Reject
              </Button>
              <Button variant="primary" onClick={() => handleAction('approve')} disabled={actionLoading}>
                Approve
              </Button>
            </>
          )}
          {project.status === 'APPROVED' && (
            <Button variant="secondary" onClick={() => handleAction('close')} disabled={actionLoading}>
              Close Project
            </Button>
          )}
        </div>
      </div>

      {/* Rejection Reason */}
      {project.status === 'REJECTED' && project.rejectionReason && (
        <Card className="border-error bg-red-50">
          <div className="flex gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <h4 className="font-medium text-red-900">Project Rejected</h4>
              <p className="text-sm text-red-800 mt-1">{project.rejectionReason}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Tabs */}
      <div className="border-b">
        <div className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-medium border-b-2 transition ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted hover:text-text'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="ml-1 px-1.5 py-0.5 bg-gray-100 rounded text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card title="Project Details">
            <dl className="space-y-3">
              <div>
                <dt className="text-sm text-muted">Type</dt>
                <dd className="font-medium">{project.type.replace('_', ' ')}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted">Description</dt>
                <dd>{project.description || 'No description provided'}</dd>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm text-muted">Start Date</dt>
                  <dd className="font-medium">{formatDate(project.startDate)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted">End Date</dt>
                  <dd className="font-medium">{formatDate(project.endDate)}</dd>
                </div>
              </div>
            </dl>
          </Card>

          <Card title="Principal Investigator">
            <dl className="space-y-3">
              <div>
                <dt className="text-sm text-muted">Name</dt>
                <dd className="font-medium">{project.piName}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted">Email</dt>
                <dd className="font-medium">{project.piEmail}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted">Affiliation</dt>
                <dd className="font-medium">{project.piAffiliation || 'Not specified'}</dd>
              </div>
            </dl>
          </Card>

          {project.irbProtocolId && (
            <Card title="IRB Approval">
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm text-muted">Protocol ID</dt>
                  <dd className="font-medium">{project.irbProtocolId}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted">Expiry Date</dt>
                  <dd className="font-medium">{formatDate(project.irbExpiryDate)}</dd>
                </div>
              </dl>
            </Card>
          )}

          <Card title="Data Use Agreement">
            {project.dataUseAgreements && project.dataUseAgreements.length > 0 ? (
              <div className="space-y-2">
                {project.dataUseAgreements.map((dua) => (
                  <div key={dua.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div>
                      <span className="font-medium">DUA v{dua.version}</span>
                      <span className={`ml-2 text-xs px-2 py-0.5 rounded ${
                        dua.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                      }`}>
                        {dua.status}
                      </span>
                    </div>
                    <span className="text-sm text-muted">
                      Effective: {formatDate(dua.effectiveAt)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted">No DUA generated yet. Submit project for approval.</p>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'cohorts' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-muted">Define cohorts to filter the population for exports</p>
            <Link href={`/research/projects/${projectId}/cohorts/new`}>
              <Button variant="primary" disabled={project.status !== 'APPROVED'}>
                + New Cohort
              </Button>
            </Link>
          </div>

          {project.cohorts?.length === 0 ? (
            <Card>
              <div className="py-8 text-center text-muted">
                No cohorts defined yet
              </div>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {project.cohorts?.map((cohort) => (
                <Card key={cohort.id}>
                  <Heading level={4}>{cohort.name}</Heading>
                  <p className="text-sm text-muted mt-1">{cohort.description}</p>
                  <div className="mt-3 text-sm">
                    <span className="text-muted">Estimated: </span>
                    <span className="font-medium">{cohort.estimatedCount ?? '—'} learners</span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'datasets' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-muted">Define dataset schemas for exports</p>
            <Link href={`/research/projects/${projectId}/datasets/new`}>
              <Button variant="primary" disabled={project.status !== 'APPROVED'}>
                + New Dataset
              </Button>
            </Link>
          </div>

          {project.datasetDefinitions?.length === 0 ? (
            <Card>
              <div className="py-8 text-center text-muted">
                No dataset definitions yet
              </div>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {project.datasetDefinitions?.map((def) => (
                <Card key={def.id}>
                  <Heading level={4}>{def.name}</Heading>
                  <p className="text-sm text-muted mt-1">{def.description}</p>
                  <div className="mt-3 text-sm">
                    <span className="text-muted">Base Table: </span>
                    <code className="bg-gray-100 px-1 rounded">{def.baseTable}</code>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'exports' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-muted">Export history and downloads</p>
            <Link href={`/research/projects/${projectId}/exports/new`}>
              <Button variant="primary" disabled={project.status !== 'APPROVED'}>
                + Request Export
              </Button>
            </Link>
          </div>

          {exports.length === 0 ? (
            <Card>
              <div className="py-8 text-center text-muted">
                No exports yet
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {exports.map((exp) => (
                <Card key={exp.id}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          exp.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                          exp.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                          exp.status === 'PROCESSING' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {exp.status}
                        </span>
                        <span className="text-sm font-medium">{exp.format}</span>
                      </div>
                      <p className="text-sm text-muted mt-1">
                        Requested: {formatDate(exp.createdAt)}
                        {exp.rowCount && ` • ${exp.rowCount.toLocaleString()} rows`}
                      </p>
                    </div>
                    {exp.status === 'COMPLETED' && (
                      <Button variant="secondary" size="sm">
                        Download
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'access' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-muted">Manage researcher access to this project</p>
            <Button variant="primary">
              + Grant Access
            </Button>
          </div>

          {project.accessGrants?.length === 0 ? (
            <Card>
              <div className="py-8 text-center text-muted">
                No access grants yet
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {project.accessGrants?.map((grant) => (
                <Card key={grant.id}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{grant.userEmail}</div>
                      <div className="text-sm text-muted">
                        Scope: {grant.scope.replace(/_/g, ' ')}
                        {grant.expiresAt && ` • Expires: ${formatDate(grant.expiresAt)}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        grant.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                      }`}>
                        {grant.isActive ? 'Active' : 'Revoked'}
                      </span>
                      {grant.isActive && (
                        <Button variant="danger" size="sm">
                          Revoke
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'audit' && (
        <Card title="Audit Log">
          <p className="text-muted mb-4">
            Complete audit trail of all actions on this project
          </p>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3 font-medium">Timestamp</th>
                  <th className="text-left p-3 font-medium">Action</th>
                  <th className="text-left p-3 font-medium">User</th>
                  <th className="text-left p-3 font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t">
                  <td colSpan={4} className="p-6 text-center text-muted">
                    Audit logs will be loaded here...
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </section>
  );
}
