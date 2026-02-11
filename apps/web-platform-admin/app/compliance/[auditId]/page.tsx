'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

interface ComplianceReport {
  id: string;
  title: string;
  status: string;
  type: string;
  generatedAt: string;
  period: string;
  findings: number;
  summary: string;
}

export default function ComplianceAuditDetailPage() {
  const { auditId } = useParams<{ auditId: string }>();
  const [report, setReport] = useState<ComplianceReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReport() {
      try {
        const res = await fetch(`/api/compliance/reports/${auditId}`);
        if (!res.ok) throw new Error(`Failed to fetch report: ${res.status}`);
        const data = (await res.json()) as ComplianceReport;
        setReport(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load report');
      } finally {
        setIsLoading(false);
      }
    }
    void fetchReport();
  }, [auditId]);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-slate-500">
        <Link href="/compliance" className="hover:text-slate-700">
          Compliance
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-900">Audit {auditId}</span>
      </nav>

      <h1 className="text-2xl font-semibold">Compliance Audit Detail</h1>

      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={`skel-${i}`} className="h-20 animate-pulse rounded-lg bg-slate-200" />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {report && (
        <div className="space-y-6">
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Report ID" value={report.id} />
              <Field label="Title" value={report.title} />
              <Field label="Type" value={report.type} />
              <Field label="Status" value={report.status} />
              <Field label="Period" value={report.period} />
              <Field label="Generated" value={formatDate(report.generatedAt)} />
            </div>
          </div>

          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="mb-2 text-lg font-semibold">Summary</h2>
            <p className="text-sm text-slate-700">{report.summary}</p>
            <div className="mt-4">
              <span className="text-sm text-slate-500">Total findings: </span>
              <span className="font-semibold">{report.findings}</span>
            </div>
          </div>
        </div>
      )}

      {!isLoading && !error && !report && (
        <div className="rounded-lg border bg-white p-8 text-center text-slate-500">
          Audit report not found.
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-slate-900">{value}</dd>
    </div>
  );
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}
