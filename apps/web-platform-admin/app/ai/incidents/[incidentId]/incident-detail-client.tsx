'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import type {
  AiCallLogWithLinkReason,
  AiIncident,
  IncidentCategory,
  IncidentSeverity,
  IncidentStatus,
  SafetyLabel,
} from '../../../../lib/types';
import { INCIDENT_STATUSES } from '../../../../lib/types';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface IncidentDetailClientProps {
  incident: AiIncident;
  linkedCalls: AiCallLogWithLinkReason[];
}

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

const SEVERITY_BADGES: Record<IncidentSeverity, { bg: string; text: string }> = {
  INFO: { bg: 'bg-slate-100', text: 'text-slate-700' },
  LOW: { bg: 'bg-blue-100', text: 'text-blue-700' },
  MEDIUM: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  HIGH: { bg: 'bg-orange-100', text: 'text-orange-700' },
  CRITICAL: { bg: 'bg-red-100', text: 'text-red-700' },
};

const STATUS_BADGES: Record<IncidentStatus, { bg: string; text: string }> = {
  OPEN: { bg: 'bg-red-100', text: 'text-red-700' },
  INVESTIGATING: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  RESOLVED: { bg: 'bg-green-100', text: 'text-green-700' },
  DISMISSED: { bg: 'bg-slate-100', text: 'text-slate-600' },
};

const CATEGORY_LABELS: Record<IncidentCategory, string> = {
  SAFETY: '🛡️ Safety',
  PRIVACY: '🔒 Privacy',
  COMPLIANCE: '📋 Compliance',
  PERFORMANCE: '⚡ Performance',
  COST: '💰 Cost',
};

const SAFETY_BADGES: Record<SafetyLabel, { bg: string; text: string }> = {
  SAFE: { bg: 'bg-green-100', text: 'text-green-700' },
  LOW: { bg: 'bg-blue-100', text: 'text-blue-700' },
  MEDIUM: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  HIGH: { bg: 'bg-red-100', text: 'text-red-700' },
};

const LINK_REASON_LABELS: Record<string, string> = {
  TRIGGER: '⚡ Trigger',
  RELATED: '🔗 Related',
  CONTEXT: '📄 Context',
};

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export function IncidentDetailClient({ incident, linkedCalls }: IncidentDetailClientProps) {
  const router = useRouter();
  const [status, setStatus] = useState<IncidentStatus>(incident.status);
  const [resolutionNotes, setResolutionNotes] = useState(incident.resolutionNotes ?? '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [expandedCalls, setExpandedCalls] = useState<Set<string>>(new Set());

  const handleStatusChange = async (newStatus: IncidentStatus) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/ai/incidents/${incident.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          resolutionNotes: newStatus === 'RESOLVED' ? resolutionNotes : undefined,
        }),
      });
      if (!res.ok) throw new Error('Failed to update incident');
      setStatus(newStatus);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update incident');
    } finally {
      setIsUpdating(false);
    }
  };

  const toggleCallExpanded = (callId: string) => {
    const newExpanded = new Set(expandedCalls);
    if (newExpanded.has(callId)) {
      newExpanded.delete(callId);
    } else {
      newExpanded.add(callId);
    }
    setExpandedCalls(newExpanded);
  };

  const exportIncident = () => {
    const data = {
      incident,
      linkedCalls,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `incident-${incident.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="mb-1 flex items-center gap-3">
            <Link href="/ai/incidents" className="text-sm text-slate-500 hover:text-slate-700">
              ← Back to Incidents
            </Link>
          </div>
          <h1 className="text-2xl font-semibold">{incident.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${SEVERITY_BADGES[incident.severity].bg} ${SEVERITY_BADGES[incident.severity].text}`}
            >
              {incident.severity}
            </span>
            <span className="text-sm text-slate-600">{CATEGORY_LABELS[incident.category]}</span>
            <span className="text-sm text-slate-400">•</span>
            <Link
              href={`/tenants/${incident.tenantId}`}
              className="text-sm text-blue-600 hover:underline"
            >
              {incident.tenantName ?? incident.tenantId}
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={exportIncident}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Export JSON
          </button>
        </div>
      </div>

      {/* Status & Actions */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Details Card */}
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Incident Details</h2>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-slate-500">ID</dt>
              <dd className="text-sm font-mono">{incident.id}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-slate-500">First Seen</dt>
              <dd className="text-sm">{new Date(incident.firstSeenAt).toLocaleString()}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-slate-500">Last Seen</dt>
              <dd className="text-sm">{new Date(incident.lastSeenAt).toLocaleString()}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-slate-500">Occurrences</dt>
              <dd className="text-sm font-semibold">{incident.occurrenceCount}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-slate-500">Created By</dt>
              <dd className="text-sm">
                {incident.createdBySystem
                  ? 'System (Auto)'
                  : (incident.createdByUserId ?? 'Unknown')}
              </dd>
            </div>
            {incident.assignedToUserId && (
              <div className="flex justify-between">
                <dt className="text-sm text-slate-500">Assigned To</dt>
                <dd className="text-sm">
                  {incident.assignedToUserName ?? incident.assignedToUserId}
                </dd>
              </div>
            )}
            {incident.resolvedAt && (
              <div className="flex justify-between">
                <dt className="text-sm text-slate-500">Resolved At</dt>
                <dd className="text-sm">{new Date(incident.resolvedAt).toLocaleString()}</dd>
              </div>
            )}
          </dl>
          {incident.description && (
            <div className="mt-4 border-t pt-4">
              <h3 className="mb-2 text-sm font-medium text-slate-700">Description</h3>
              <p className="text-sm text-slate-600">{incident.description}</p>
            </div>
          )}
        </div>

        {/* Status Management Card */}
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Manage Status</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="status" className="mb-1 block text-sm font-medium text-slate-700">
                Current Status
              </label>
              <div className="flex items-center gap-3">
                <select
                  id="status"
                  value={status}
                  onChange={(e) => handleStatusChange(e.target.value as IncidentStatus)}
                  disabled={isUpdating}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                >
                  {INCIDENT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_BADGES[status].bg} ${STATUS_BADGES[status].text}`}
                >
                  {status}
                </span>
              </div>
            </div>

            {(status === 'RESOLVED' || status === 'DISMISSED') && (
              <div>
                <label
                  htmlFor="resolutionNotes"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  Resolution Notes
                </label>
                <textarea
                  id="resolutionNotes"
                  value={resolutionNotes}
                  onChange={(e) => {
                    setResolutionNotes(e.target.value);
                  }}
                  rows={3}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Describe how this incident was resolved..."
                />
                <button
                  onClick={() => handleStatusChange(status)}
                  disabled={isUpdating}
                  className="mt-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {isUpdating ? 'Saving...' : 'Save Notes'}
                </button>
              </div>
            )}

            {incident.resolutionNotes && status !== 'RESOLVED' && (
              <div className="border-t pt-4">
                <h3 className="mb-2 text-sm font-medium text-slate-700">
                  Previous Resolution Notes
                </h3>
                <p className="text-sm text-slate-600">{incident.resolutionNotes}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Linked AI Calls */}
      <div className="rounded-lg border bg-white shadow-sm">
        <div className="border-b px-4 py-3">
          <h2 className="text-lg font-semibold">Linked AI Calls ({linkedCalls.length})</h2>
        </div>
        <div className="divide-y">
          {linkedCalls.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-500">No linked AI calls</p>
          ) : (
            linkedCalls.map((call) => (
              <div key={call.id} className="px-4 py-3">
                <div
                  className="flex cursor-pointer items-center justify-between"
                  onClick={() => {
                    toggleCallExpanded(call.id);
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500">
                      {LINK_REASON_LABELS[call.linkReason]}
                    </span>
                    <span className="font-mono text-sm">{call.requestId}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${SAFETY_BADGES[call.safetyLabel].bg} ${SAFETY_BADGES[call.safetyLabel].text}`}
                    >
                      {call.safetyLabel}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-500">
                    <span>{call.agentType}</span>
                    <span>{call.latencyMs}ms</span>
                    <span>${(call.costCentsEstimate / 100).toFixed(4)}</span>
                    <span className="text-lg">{expandedCalls.has(call.id) ? '−' : '+'}</span>
                  </div>
                </div>

                {expandedCalls.has(call.id) && (
                  <div className="mt-3 rounded-md bg-slate-50 p-4">
                    <dl className="grid gap-3 text-sm md:grid-cols-2">
                      <div>
                        <dt className="text-slate-500">Model</dt>
                        <dd className="font-medium">{call.modelName}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">Provider</dt>
                        <dd className="font-medium">{call.provider}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">Use Case</dt>
                        <dd className="font-medium">{call.useCase ?? 'N/A'}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">Tokens</dt>
                        <dd className="font-medium">
                          {call.inputTokens} in / {call.outputTokens} out
                        </dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">Status</dt>
                        <dd
                          className={`font-medium ${call.status === 'ERROR' ? 'text-red-600' : 'text-green-600'}`}
                        >
                          {call.status}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">Time</dt>
                        <dd className="font-medium">
                          {new Date(call.completedAt).toLocaleString()}
                        </dd>
                      </div>
                      {call.promptSummary && (
                        <div className="md:col-span-2">
                          <dt className="text-slate-500">Prompt Summary</dt>
                          <dd className="mt-1 rounded bg-white p-2 text-xs">
                            {call.promptSummary}
                          </dd>
                        </div>
                      )}
                      {call.responseSummary && (
                        <div className="md:col-span-2">
                          <dt className="text-slate-500">Response Summary</dt>
                          <dd className="mt-1 rounded bg-white p-2 text-xs">
                            {call.responseSummary}
                          </dd>
                        </div>
                      )}
                      {call.errorMessage && (
                        <div className="md:col-span-2">
                          <dt className="text-slate-500">Error</dt>
                          <dd className="mt-1 rounded bg-red-50 p-2 text-xs text-red-700">
                            [{call.errorCode}] {call.errorMessage}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
