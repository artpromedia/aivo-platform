'use client';

import { Card, Heading, Button, Badge } from '@aivo/ui-web';
import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';

import { useAuth } from '../../providers';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface ResearchProject {
  id: string;
  title: string;
  type: 'INTERNAL_EVAL' | 'EXTERNAL_RESEARCH' | 'VENDOR_STUDY';
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'CLOSED';
  piName: string;
  piEmail: string;
  createdAt: string;
  updatedAt: string;
}

interface ProjectsResponse {
  data: ResearchProject[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

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

const TYPE_LABELS: Record<ResearchProject['type'], string> = {
  INTERNAL_EVAL: 'Internal Evaluation',
  EXTERNAL_RESEARCH: 'External Research',
  VENDOR_STUDY: 'Vendor Study',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════════════════════

async function fetchProjects(
  accessToken: string,
  filters: { status?: string[]; type?: string[] } = {}
): Promise<ProjectsResponse> {
  const params = new URLSearchParams();
  if (filters.status?.length) params.set('status', filters.status.join(','));
  if (filters.type?.length) params.set('type', filters.type.join(','));
  params.set('limit', '50');

  const res = await fetch(`/api/research/projects?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) throw new Error('Failed to fetch projects');
  return res.json();
}

// ═══════════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════════

export default function ResearchProjectsPage() {
  const { isAuthenticated } = useAuth();
  
  const [projects, setProjects] = useState<ResearchProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const accessToken = 'mock-token'; // TODO: Get from auth context
      const response = await fetchProjects(accessToken, { status: statusFilter });
      setProjects(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const toggleStatusFilter = (status: string) => {
    setStatusFilter((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  };

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Heading level={1}>Research Portal</Heading>
          <p className="text-muted mt-1">
            Manage research projects and access de-identified analytics data
          </p>
        </div>
        <Link href="/research/projects/new">
          <Button variant="primary">
            <span className="mr-2">+</span>
            New Project
          </Button>
        </Link>
      </div>

      {/* Status Filters */}
      <div className="flex flex-wrap gap-2">
        {['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CLOSED'].map((status) => (
          <button
            key={status}
            onClick={() => toggleStatusFilter(status)}
            className={`rounded-full px-3 py-1 text-sm font-medium transition ${
              statusFilter.includes(status)
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {status.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-pulse text-muted">Loading projects...</div>
        </div>
      )}

      {/* Error */}
      {error && (
        <Card title="Error" className="border-error">
          <p className="text-error">{error}</p>
          <Button variant="primary" onClick={loadProjects} className="mt-4">
            Retry
          </Button>
        </Card>
      )}

      {/* Empty State */}
      {!loading && !error && projects.length === 0 && (
        <Card>
          <div className="py-12 text-center">
            <div className="text-4xl mb-4">📊</div>
            <Heading level={3}>No Research Projects Yet</Heading>
            <p className="text-muted mt-2 mb-6">
              Create a research project to start accessing de-identified analytics data
            </p>
            <Link href="/research/projects/new">
              <Button variant="primary">Create Your First Project</Button>
            </Link>
          </div>
        </Card>
      )}

      {/* Projects Grid */}
      {!loading && !error && projects.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} href={`/research/projects/${project.id}`}>
              <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                <div className="flex items-start justify-between mb-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded ${STATUS_COLORS[project.status]}`}>
                    {project.status.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-muted">
                    {TYPE_LABELS[project.type]}
                  </span>
                </div>
                
                <Heading level={4} className="mb-2 line-clamp-2">
                  {project.title}
                </Heading>
                
                <div className="text-sm text-muted space-y-1">
                  <p><strong>PI:</strong> {project.piName}</p>
                  <p><strong>Email:</strong> {project.piEmail}</p>
                </div>
                
                <div className="mt-4 pt-3 border-t text-xs text-muted flex justify-between">
                  <span>Created {formatDate(project.createdAt)}</span>
                  <span>Updated {formatDate(project.updatedAt)}</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4 mt-8">
        <Card>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">
              {projects.filter((p) => p.status === 'APPROVED').length}
            </div>
            <div className="text-sm text-muted">Active Projects</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-600">
              {projects.filter((p) => p.status === 'PENDING_APPROVAL').length}
            </div>
            <div className="text-sm text-muted">Pending Approval</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">--</div>
            <div className="text-sm text-muted">Exports This Month</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">--</div>
            <div className="text-sm text-muted">Researchers Granted</div>
          </div>
        </Card>
      </div>
    </section>
  );
}
