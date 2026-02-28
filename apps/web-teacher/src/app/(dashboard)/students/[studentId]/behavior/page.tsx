/**
 * Behavior Tracking Page (Container 09 — Page 3 of 4)
 *
 * Per-student behavior log with incident/recognition tracking,
 * trend visualization, and ability to add new entries.
 * Currently uses the student progress API which includes
 * BehavioralProgress data.
 *
 * Uses: studentsApi (student progress), BehavioralProgress types
 */

'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import * as React from 'react';

import { PageHeader } from '@/components/layout/breadcrumb';
import { useStudent, useStudentProgress } from '@/hooks/use-students';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

type BehaviorCategory = 'positive' | 'disruptive' | 'off-task' | 'peer-conflict' | 'participation' | 'other';
type BehaviorSeverity = 'minor' | 'moderate' | 'major';

interface BehaviorEntry {
  id: string;
  timestamp: string;
  category: BehaviorCategory;
  severity: BehaviorSeverity;
  description: string;
  context: string;
  isPositive: boolean;
  actionTaken?: string;
  parentNotified: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// MOCK DATA — until behavior-svc backend is available
// ═══════════════════════════════════════════════════════════════════════════

function generateMockEntries(studentId: string): BehaviorEntry[] {
  const now = new Date();
  return [
    {
      id: `${studentId}-b1`,
      timestamp: new Date(now.getTime() - 2 * 3600000).toISOString(),
      category: 'participation',
      severity: 'minor',
      description: 'Actively volunteered to explain their math solution to the class',
      context: 'Math Class — Group Problem Solving',
      isPositive: true,
      parentNotified: false,
    },
    {
      id: `${studentId}-b2`,
      timestamp: new Date(now.getTime() - 24 * 3600000).toISOString(),
      category: 'off-task',
      severity: 'minor',
      description: 'Browsing unrelated content during independent reading time',
      context: 'Reading — Independent Work',
      isPositive: false,
      actionTaken: 'Verbal redirect, student returned to task',
      parentNotified: false,
    },
    {
      id: `${studentId}-b3`,
      timestamp: new Date(now.getTime() - 48 * 3600000).toISOString(),
      category: 'positive',
      severity: 'minor',
      description: 'Helped a classmate understand a difficult concept without being asked',
      context: 'Science — Lab Activity',
      isPositive: true,
      parentNotified: false,
    },
    {
      id: `${studentId}-b4`,
      timestamp: new Date(now.getTime() - 72 * 3600000).toISOString(),
      category: 'disruptive',
      severity: 'moderate',
      description: 'Talking during direct instruction, continued after first warning',
      context: 'History — Lecture',
      isPositive: false,
      actionTaken: 'Moved seat, parent email sent',
      parentNotified: true,
    },
    {
      id: `${studentId}-b5`,
      timestamp: new Date(now.getTime() - 96 * 3600000).toISOString(),
      category: 'participation',
      severity: 'minor',
      description: 'Presented group project to class with confidence and clarity',
      context: 'English — Group Presentations',
      isPositive: true,
      parentNotified: false,
    },
    {
      id: `${studentId}-b6`,
      timestamp: new Date(now.getTime() - 120 * 3600000).toISOString(),
      category: 'peer-conflict',
      severity: 'moderate',
      description: 'Argument with classmate over shared materials, resolved with mediation',
      context: 'Art — Studio Work',
      isPositive: false,
      actionTaken: 'Peer mediation, both students apologized',
      parentNotified: false,
    },
  ];
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════

export default function StudentBehaviorPage() {
  const params = useParams<{ studentId: string }>();
  const router = useRouter();
  const { student: studentData, loading: studentLoading, error: studentError } = useStudent(params.studentId ?? '');
  const { progress } = useStudentProgress(params.studentId ?? '');

  const [entries, setEntries] = React.useState<BehaviorEntry[]>([]);
  const [categoryFilter, setCategoryFilter] = React.useState<string>('all');
  const [showPositiveOnly, setShowPositiveOnly] = React.useState(false);
  const [addModalOpen, setAddModalOpen] = React.useState(false);

  // New entry form state
  const [newCategory, setNewCategory] = React.useState<BehaviorCategory>('positive');
  const [newSeverity, setNewSeverity] = React.useState<BehaviorSeverity>('minor');
  const [newDescription, setNewDescription] = React.useState('');
  const [newContext, setNewContext] = React.useState('');
  const [newAction, setNewAction] = React.useState('');
  const [newParentNotified, setNewParentNotified] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);

  // Load mock entries
  React.useEffect(() => {
    if (params.studentId) {
      setEntries(generateMockEntries(params.studentId));
    }
  }, [params.studentId]);

  // Filter entries
  const filteredEntries = React.useMemo(() => {
    let result = entries;
    if (categoryFilter !== 'all') {
      result = result.filter((e) => e.category === categoryFilter);
    }
    if (showPositiveOnly) {
      result = result.filter((e) => e.isPositive);
    }
    return result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [entries, categoryFilter, showPositiveOnly]);

  // Summary stats
  const stats = React.useMemo(() => {
    const positive = entries.filter((e) => e.isPositive).length;
    const negative = entries.filter((e) => !e.isPositive).length;
    const parentNotifications = entries.filter((e) => e.parentNotified).length;
    const behaviorRating = progress?.behavioralProgress?.overallRating;
    return { positive, negative, parentNotifications, behaviorRating };
  }, [entries, progress]);

  // Handle add new entry
  const handleAddEntry = async () => {
    if (!newDescription.trim()) return;
    setIsSaving(true);

    const isPositive = newCategory === 'positive' || newCategory === 'participation';

    const entry: BehaviorEntry = {
      id: `${params.studentId}-b${Date.now()}`,
      timestamp: new Date().toISOString(),
      category: newCategory,
      severity: newSeverity,
      description: newDescription,
      context: newContext,
      isPositive,
      actionTaken: newAction || undefined,
      parentNotified: newParentNotified,
    };

    // TODO: POST to behavior-svc backend when available
    await new Promise((resolve) => setTimeout(resolve, 500));

    setEntries((prev) => [entry, ...prev]);
    setNewDescription('');
    setNewContext('');
    setNewAction('');
    setNewParentNotified(false);
    setNewCategory('positive');
    setNewSeverity('minor');
    setAddModalOpen(false);
    setIsSaving(false);
  };

  const studentName = studentData
    ? `${studentData.firstName} ${studentData.lastName}`
    : 'Student';

  // Loading
  if (studentLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent mx-auto" />
          <p className="mt-4 text-gray-500">Loading student data...</p>
        </div>
      </div>
    );
  }

  // Error
  if (studentError || !studentData) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-red-600">{studentError?.message ?? 'Student not found'}</p>
        <button onClick={() => router.back()} className="mt-4 text-sm text-primary-600 hover:underline">
          Go back
        </button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Behavior Log"
        description={`Tracking behavior and recognitions for ${studentName}`}
        breadcrumbs={[
          { label: 'Students', href: '/students' },
          { label: studentName, href: `/students/${params.studentId}` },
          { label: 'Behavior Log' },
        ]}
        actions={
          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            + Add Entry
          </button>
        }
      />

      {/* Summary Stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        <StatCard
          label="Positive Recognitions"
          value={stats.positive}
          icon="⭐"
          color="text-green-600"
        />
        <StatCard
          label="Behavior Incidents"
          value={stats.negative}
          icon="⚠️"
          color={stats.negative > 0 ? 'text-amber-600' : 'text-gray-900'}
        />
        <StatCard
          label="Parent Notifications"
          value={stats.parentNotifications}
          icon="📧"
          color="text-gray-900"
        />
        <StatCard
          label="Behavior Rating"
          value={stats.behaviorRating != null ? `${stats.behaviorRating}/5` : '—'}
          icon="📋"
          color="text-gray-900"
        />
      </div>

      {/* Trend Overview */}
      {progress?.behavioralProgress && (
        <div className="mt-6 rounded-xl border bg-white p-6">
          <h3 className="font-semibold text-gray-900 mb-3">📈 Behavioral Trends</h3>
          <div className="flex flex-wrap gap-2">
            {progress.behavioralProgress.trends.map((trend, i) => (
              <span key={i} className="rounded-lg bg-blue-50 px-3 py-1.5 text-sm text-blue-700">
                {trend}
              </span>
            ))}
          </div>
          {progress.behavioralProgress.trends.length === 0 && (
            <p className="text-sm text-gray-500">No trend data available yet.</p>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm"
        >
          <option value="all">All Categories</option>
          <option value="positive">Positive</option>
          <option value="participation">Participation</option>
          <option value="disruptive">Disruptive</option>
          <option value="off-task">Off-Task</option>
          <option value="peer-conflict">Peer Conflict</option>
          <option value="other">Other</option>
        </select>

        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={showPositiveOnly}
            onChange={(e) => setShowPositiveOnly(e.target.checked)}
            className="rounded border-gray-300"
          />
          Show positive only
        </label>

        <span className="text-sm text-gray-400">
          {filteredEntries.length} {filteredEntries.length === 1 ? 'entry' : 'entries'}
        </span>
      </div>

      {/* Entries List */}
      <div className="mt-4 space-y-3">
        {filteredEntries.length === 0 ? (
          <div className="rounded-xl border bg-white p-12 text-center text-gray-500">
            <p className="text-4xl mb-4">📋</p>
            <p className="font-medium">No behavior entries found</p>
            <p className="text-sm mt-1">
              {categoryFilter !== 'all' || showPositiveOnly
                ? 'Try adjusting your filters.'
                : 'Click "+ Add Entry" to record a behavior observation.'}
            </p>
          </div>
        ) : (
          filteredEntries.map((entry) => (
            <BehaviorEntryCard key={entry.id} entry={entry} />
          ))
        )}
      </div>

      {/* Add Entry Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900">
              Add Behavior Entry for {studentData.firstName}
            </h3>

            <div className="mt-4 space-y-4">
              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as BehaviorCategory)}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                >
                  <option value="positive">⭐ Positive Recognition</option>
                  <option value="participation">🙋 Participation</option>
                  <option value="disruptive">⚠️ Disruptive Behavior</option>
                  <option value="off-task">📵 Off-Task</option>
                  <option value="peer-conflict">🤝 Peer Conflict</option>
                  <option value="other">📝 Other</option>
                </select>
              </div>

              {/* Severity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                <div className="flex gap-2">
                  {(['minor', 'moderate', 'major'] as BehaviorSeverity[]).map((sev) => (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => setNewSeverity(sev)}
                      className={cn(
                        'rounded-lg border px-4 py-2 text-sm capitalize',
                        newSeverity === sev
                          ? 'border-primary-600 bg-primary-50 text-primary-700'
                          : 'hover:bg-gray-50'
                      )}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  className="w-full rounded-lg border p-3 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  rows={3}
                  placeholder="Describe the behavior observed..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                />
              </div>

              {/* Context */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Context</label>
                <input
                  type="text"
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  placeholder="e.g., Math Class — Group Work"
                  value={newContext}
                  onChange={(e) => setNewContext(e.target.value)}
                />
              </div>

              {/* Action Taken */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Action Taken (optional)</label>
                <input
                  type="text"
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  placeholder="e.g., Verbal redirect, parent contacted"
                  value={newAction}
                  onChange={(e) => setNewAction(e.target.value)}
                />
              </div>

              {/* Parent Notified */}
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={newParentNotified}
                  onChange={(e) => setNewParentNotified(e.target.checked)}
                  className="rounded border-gray-300"
                />
                Parent notified
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddEntry}
                disabled={isSaving || !newDescription.trim()}
                className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Entry'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// BEHAVIOR ENTRY CARD
// ═══════════════════════════════════════════════════════════════════════════

function BehaviorEntryCard({ entry }: Readonly<{ entry: BehaviorEntry }>) {
  const categoryConfig: Record<BehaviorCategory, { icon: string; label: string; color: string }> = {
    positive: { icon: '⭐', label: 'Positive', color: 'bg-green-100 text-green-700' },
    participation: { icon: '🙋', label: 'Participation', color: 'bg-blue-100 text-blue-700' },
    disruptive: { icon: '⚠️', label: 'Disruptive', color: 'bg-red-100 text-red-700' },
    'off-task': { icon: '📵', label: 'Off-Task', color: 'bg-orange-100 text-orange-700' },
    'peer-conflict': { icon: '🤝', label: 'Peer Conflict', color: 'bg-amber-100 text-amber-700' },
    other: { icon: '📝', label: 'Other', color: 'bg-gray-100 text-gray-600' },
  };

  const severityColors: Record<BehaviorSeverity, string> = {
    minor: 'bg-gray-100 text-gray-600',
    moderate: 'bg-yellow-100 text-yellow-700',
    major: 'bg-red-100 text-red-700',
  };

  const config = categoryConfig[entry.category] ?? categoryConfig.other;
  const timestamp = new Date(entry.timestamp);

  return (
    <div className={cn(
      'rounded-xl border bg-white p-4',
      entry.isPositive ? 'border-l-4 border-l-green-400' : 'border-l-4 border-l-amber-400'
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', config.color)}>
              {config.icon} {config.label}
            </span>
            <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium capitalize', severityColors[entry.severity])}>
              {entry.severity}
            </span>
            {entry.parentNotified && (
              <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                📧 Parent Notified
              </span>
            )}
          </div>
          <p className="mt-2 text-sm text-gray-900">{entry.description}</p>
          {entry.context && (
            <p className="mt-1 text-xs text-gray-500">📍 {entry.context}</p>
          )}
          {entry.actionTaken && (
            <p className="mt-1 text-xs text-gray-500">✅ Action: {entry.actionTaken}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">
            {timestamp.toLocaleDateString()}
          </p>
          <p className="text-xs text-gray-400">
            {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SHARED UI
// ═══════════════════════════════════════════════════════════════════════════

function StatCard({
  label,
  value,
  icon,
  color = 'text-gray-900',
}: Readonly<{
  label: string;
  value: string | number;
  icon: string;
  color?: string;
}>) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
      <p className={cn('mt-1 text-2xl font-bold', color)}>
        {value}
      </p>
    </div>
  );
}
