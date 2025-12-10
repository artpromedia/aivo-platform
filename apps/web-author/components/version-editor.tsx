'use client';

import { Badge, Button, Card } from '@aivo/ui-web';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';

import { useAuth, useIsAuthor, useIsReviewer, useIsAdmin } from '../app/providers';
import {
  getLearningObject,
  listVersions,
  getVersion,
  updateVersion,
  createNewVersion,
  submitForReview,
  approveVersion,
  rejectVersion,
  publishVersion,
  retireVersion,
} from '../lib/authoring-api';
import { cn } from '../lib/cn';
import { useToast } from '../lib/toast';
import {
  VERSION_STATE_LABELS,
  VERSION_STATE_TONES,
  type LearningObject,
  type LearningObjectVersion,
} from '../lib/types';

import { AccessibilityTab } from './version-editor/accessibility-tab';
import { ContentTab } from './version-editor/content-tab';
import { HistoryWorkflowTab } from './version-editor/history-workflow-tab';
import { StandardsSkillsTab } from './version-editor/standards-skills-tab';

type TabId = 'content' | 'accessibility' | 'standards' | 'history';

const TABS: { id: TabId; label: string }[] = [
  { id: 'content', label: 'Content' },
  { id: 'accessibility', label: 'Accessibility' },
  { id: 'standards', label: 'Standards & Skills' },
  { id: 'history', label: 'History & Workflow' },
];

export function VersionEditor() {
  const params = useParams();
  const router = useRouter();
  const { addToast } = useToast();
  useAuth();
  const isAuthor = useIsAuthor();
  const isReviewer = useIsReviewer();
  const isAdmin = useIsAdmin();

  const loId = params.loId as string;
  const versionNumber = parseInt(params.versionNumber as string, 10);

  const [lo, setLo] = useState<LearningObject | null>(null);
  const [version, setVersion] = useState<LearningObjectVersion | null>(null);
  const [allVersions, setAllVersions] = useState<LearningObjectVersion[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>('content');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [loData, versionData, versionsData] = await Promise.all([
        getLearningObject(loId),
        getVersion(loId, versionNumber),
        listVersions(loId),
      ]);
      setLo(loData);
      setVersion(versionData);
      setAllVersions(versionsData);
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to load version');
    } finally {
      setLoading(false);
    }
  }, [loId, versionNumber, addToast]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleSave = async (
    updates: Partial<
      Pick<
        LearningObjectVersion,
        'contentJson' | 'accessibilityJson' | 'standardsJson' | 'changeSummary'
      >
    >
  ) => {
    if (!version) return;
    setSaving(true);
    try {
      const updated = await updateVersion(loId, versionNumber, updates);
      setVersion(updated);
      addToast('success', 'Changes saved');
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleWorkflowAction = async (
    action: 'submit' | 'approve' | 'reject' | 'publish' | 'retire',
    reason?: string
  ) => {
    if (!version) return;
    setActionLoading(action);
    try {
      let updated: LearningObjectVersion;
      switch (action) {
        case 'submit':
          updated = await submitForReview(loId, versionNumber);
          break;
        case 'approve':
          updated = await approveVersion(loId, versionNumber);
          break;
        case 'reject':
          updated = await rejectVersion(loId, versionNumber, { reason: reason ?? '' });
          break;
        case 'publish':
          updated = await publishVersion(loId, versionNumber);
          break;
        case 'retire':
          updated = await retireVersion(loId, versionNumber);
          break;
      }
      setVersion(updated);
      addToast('success', `Version ${VERSION_STATE_LABELS[updated.state].toLowerCase()}`);
      // Refresh versions list
      const versionsData = await listVersions(loId);
      setAllVersions(versionsData);
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : `Failed to ${action} version`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDuplicateVersion = async () => {
    setActionLoading('duplicate');
    try {
      const newVersion = await createNewVersion(loId);
      addToast('success', `Version ${newVersion.versionNumber} created`);
      router.push(`/learning-objects/${loId}/versions/${newVersion.versionNumber}`);
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to create new version');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (!lo || !version) {
    return (
      <Card className="py-12 text-center">
        <h2 className="text-lg font-semibold text-text">Version Not Found</h2>
        <Link href="/learning-objects" className="mt-4 inline-block">
          <Button>Back to List</Button>
        </Link>
      </Card>
    );
  }

  const canEdit = isAuthor && version.state === 'DRAFT';

  return (
    <div className="flex gap-6">
      {/* Left Sidebar - Version List */}
      <aside className="w-56 shrink-0">
        <Card title="Versions" className="sticky top-20">
          <div className="space-y-2">
            {allVersions.map((v) => (
              <Link
                key={v.id}
                href={`/learning-objects/${loId}/versions/${v.versionNumber}`}
                className={cn(
                  'flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors',
                  v.versionNumber === versionNumber
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted hover:bg-surface-muted hover:text-text'
                )}
              >
                <span className="font-medium">v{v.versionNumber}</span>
                <Badge tone={VERSION_STATE_TONES[v.state]} className="text-xs">
                  {VERSION_STATE_LABELS[v.state]}
                </Badge>
              </Link>
            ))}
          </div>
          {isAuthor && (
            <div className="mt-4 border-t border-border pt-4">
              <Button
                variant="secondary"
                className="w-full"
                onClick={handleDuplicateVersion}
                disabled={actionLoading === 'duplicate'}
              >
                {actionLoading === 'duplicate' ? 'Creating...' : 'Duplicate Version'}
              </Button>
            </div>
          )}
        </Card>
      </aside>

      {/* Main Content */}
      <div className="flex-1 space-y-6">
        {/* Breadcrumb & Header */}
        <nav className="flex items-center gap-2 text-sm text-muted">
          <Link href="/learning-objects" className="hover:text-text">
            Learning Objects
          </Link>
          <span>/</span>
          <Link href={`/learning-objects/${loId}`} className="hover:text-text">
            {lo.title}
          </Link>
          <span>/</span>
          <span className="text-text">Version {versionNumber}</span>
        </nav>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-text">
              {lo.title} <span className="text-muted">v{versionNumber}</span>
            </h1>
            <Badge tone={VERSION_STATE_TONES[version.state]}>
              {VERSION_STATE_LABELS[version.state]}
            </Badge>
          </div>
          {saving && <span className="text-sm text-muted">Saving...</span>}
        </div>

        {/* Tabs */}
        <div className="border-b border-border">
          <nav className="-mb-px flex gap-6" aria-label="Tabs">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                }}
                className={cn(
                  'border-b-2 pb-3 text-sm font-medium transition-colors',
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted hover:border-border hover:text-text'
                )}
                aria-selected={activeTab === tab.id}
                role="tab"
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div role="tabpanel">
          {activeTab === 'content' && (
            <ContentTab version={version} canEdit={canEdit} onSave={handleSave} />
          )}
          {activeTab === 'accessibility' && (
            <AccessibilityTab version={version} canEdit={canEdit} onSave={handleSave} />
          )}
          {activeTab === 'standards' && (
            <StandardsSkillsTab
              loId={loId}
              version={version}
              canEdit={canEdit}
              onUpdate={() => fetchData()}
            />
          )}
          {activeTab === 'history' && (
            <HistoryWorkflowTab
              loId={loId}
              version={version}
              isAuthor={isAuthor}
              isReviewer={isReviewer}
              isAdmin={isAdmin}
              actionLoading={actionLoading}
              onWorkflowAction={handleWorkflowAction}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex gap-6">
      <div className="w-56 shrink-0">
        <div className="h-64 animate-pulse rounded-xl bg-surface-muted" />
      </div>
      <div className="flex-1 space-y-6">
        <div className="h-8 w-64 animate-pulse rounded-lg bg-surface-muted" />
        <div className="h-10 animate-pulse rounded-lg bg-surface-muted" />
        <div className="h-96 animate-pulse rounded-xl bg-surface-muted" />
      </div>
    </div>
  );
}
