'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

import type { AuditEventSummary } from '../../../../lib/audit-api';
import {
  formatAuditDate,
  formatAuditDateTime,
  getActorTypeIcon,
  getActorTypeLabel,
  getActionTypeColorClass,
  getActionTypeLabel,
  getEntityTypeIcon,
  getEntityTypeLabel,
  getLast7DaysRange,
} from '../../../../lib/audit-api';

// ══════════════════════════════════════════════════════════════════════════════
// ICONS
// ══════════════════════════════════════════════════════════════════════════════

function Icon({ name, className = '' }: { name: string; className?: string }) {
  const icons: Record<string, React.ReactNode> = {
    user: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    bot: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    server: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
      </svg>
    ),
    gauge: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    calendar: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    'file-text': (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    'external-link': (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    ),
    file: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
    filter: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
      </svg>
    ),
    clock: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  return icons[name] ?? icons.file;
}

// ══════════════════════════════════════════════════════════════════════════════
// PROPS
// ══════════════════════════════════════════════════════════════════════════════

interface LearnerAuditTimelineProps {
  learnerId: string;
  learnerName: string;
  initialEvents: AuditEventSummary[];
  total: number;
  accessToken: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export function LearnerAuditTimeline({
  learnerId,
  learnerName,
  initialEvents,
  total,
  accessToken,
}: LearnerAuditTimelineProps) {
  const [events, setEvents] = useState<AuditEventSummary[]>(initialEvents);
  const [loading, setLoading] = useState(false);
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('');
  const [dateRange, setDateRange] = useState<'7d' | '30d' | 'all'>('7d');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Load more events when filter changes
  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (entityTypeFilter) params.set('entityType', entityTypeFilter);

        if (dateRange === '7d') {
          const { fromDate } = getLast7DaysRange();
          params.set('fromDate', fromDate);
        } else if (dateRange === '30d') {
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          params.set('fromDate', thirtyDaysAgo.toISOString());
        }

        params.set('limit', '50');

        const response = await fetch(
          `/api/audit/learner/${learnerId}?${params.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setEvents(data.events);
        }
      } catch {
        // Keep existing events on error
      } finally {
        setLoading(false);
      }
    };

    // Skip initial load
    if (entityTypeFilter !== '' || dateRange !== '7d') {
      fetchEvents();
    }
  }, [entityTypeFilter, dateRange, learnerId, accessToken]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Audit Timeline</h1>
          <p className="text-slate-600 mt-1">
            Changes and AI decisions for {learnerName}
          </p>
        </div>
        <Link
          href={`/analytics/learners/${learnerId}`}
          className="text-sm text-indigo-600 hover:text-indigo-800"
        >
          ← Back to Learner
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <Icon name="filter" className="h-4 w-4 text-slate-400" />
          <span className="text-sm text-slate-600">Filter:</span>
        </div>

        {/* Entity Type Filter */}
        <select
          value={entityTypeFilter}
          onChange={(e) => setEntityTypeFilter(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:ring-indigo-500"
        >
          <option value="">All types</option>
          <option value="LEARNER_DIFFICULTY">Difficulty Changes</option>
          <option value="TODAY_PLAN">Today Plan Changes</option>
        </select>

        {/* Date Range Filter */}
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value as '7d' | '30d' | 'all')}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:ring-indigo-500"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="all">All time</option>
        </select>

        {/* Results count */}
        <span className="text-sm text-slate-500 ml-auto">
          {events.length} of {total} events
        </span>
      </div>

      {/* Timeline */}
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        )}

        {events.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border">
            <Icon name="clock" className="h-12 w-12 text-slate-300 mx-auto" />
            <p className="mt-4 text-slate-600">No audit events found for this period.</p>
          </div>
        ) : (
          <div className="flow-root">
            <ul className="-mb-8">
              {events.map((event, idx) => (
                <li key={event.id}>
                  <div className="relative pb-8">
                    {/* Timeline connector */}
                    {idx !== events.length - 1 && (
                      <span
                        className="absolute top-5 left-5 -ml-px h-full w-0.5 bg-slate-200"
                        aria-hidden="true"
                      />
                    )}

                    <div className="relative flex items-start space-x-3">
                      {/* Actor icon */}
                      <div className="relative">
                        <div
                          className={`h-10 w-10 rounded-full flex items-center justify-center ring-8 ring-white ${
                            event.actorType === 'AGENT'
                              ? 'bg-indigo-100'
                              : event.actorType === 'USER'
                                ? 'bg-emerald-100'
                                : 'bg-slate-100'
                          }`}
                        >
                          <Icon
                            name={getActorTypeIcon(event.actorType)}
                            className={`h-5 w-5 ${
                              event.actorType === 'AGENT'
                                ? 'text-indigo-600'
                                : event.actorType === 'USER'
                                  ? 'text-emerald-600'
                                  : 'text-slate-600'
                            }`}
                          />
                        </div>
                      </div>

                      {/* Event content */}
                      <div className="min-w-0 flex-1">
                        <div className="bg-white rounded-lg border shadow-sm p-4">
                          {/* Header row */}
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getActionTypeColorClass(event.action)}`}>
                                {getActionTypeLabel(event.action)}
                              </span>
                              <span className="text-xs text-slate-500 flex items-center gap-1">
                                <Icon
                                  name={getEntityTypeIcon(event.entityType)}
                                  className="h-3 w-3"
                                />
                                {getEntityTypeLabel(event.entityType)}
                              </span>
                            </div>
                            <time
                              className="text-xs text-slate-500"
                              dateTime={event.createdAt}
                              title={formatAuditDateTime(event.createdAt)}
                            >
                              {formatAuditDate(event.createdAt)}
                            </time>
                          </div>

                          {/* Summary */}
                          <p className="text-sm text-slate-900 font-medium">{event.summary}</p>

                          {/* Actor info */}
                          <p className="text-xs text-slate-500 mt-1">
                            by {event.actorDisplayName ?? getActorTypeLabel(event.actorType)}
                          </p>

                          {/* Explanation link */}
                          {event.relatedExplanationId && (
                            <button
                              onClick={() =>
                                setExpandedId(
                                  expandedId === event.id ? null : event.id
                                )
                              }
                              className="mt-2 text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                            >
                              <Icon name="external-link" className="h-3 w-3" />
                              {expandedId === event.id ? 'Hide explanation' : 'View explanation'}
                            </button>
                          )}

                          {/* Expanded explanation placeholder */}
                          {expandedId === event.id && event.relatedExplanationId && (
                            <div className="mt-3 p-3 bg-indigo-50 rounded-md text-sm">
                              <p className="text-indigo-800 font-medium">Why this decision?</p>
                              <p className="text-indigo-700 mt-1">
                                Click to view full AI explanation for this change.
                              </p>
                              <Link
                                href={`/explanations/${event.relatedExplanationId}`}
                                className="mt-2 inline-block text-indigo-600 hover:text-indigo-800 text-xs"
                              >
                                Open full explanation →
                              </Link>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Load more */}
      {events.length < total && (
        <div className="text-center">
          <button
            onClick={() => {
              // TODO: Implement pagination
            }}
            className="px-4 py-2 text-sm text-indigo-600 hover:text-indigo-800"
          >
            Load more events
          </button>
        </div>
      )}
    </div>
  );
}
