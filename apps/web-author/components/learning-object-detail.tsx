'use client';

import { Badge, Button, Card } from '@aivo/ui-web';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';

import { useIsAuthor } from '../app/providers';
import { getLearningObject, listVersions, createNewVersion } from '../lib/authoring-api';
import { useToast } from '../lib/toast';
import {
  SUBJECT_LABELS,
  GRADE_BAND_LABELS,
  VERSION_STATE_LABELS,
  VERSION_STATE_TONES,
  type LearningObject,
  type LearningObjectVersion,
} from '../lib/types';

export function LearningObjectDetail() {
  const params = useParams();
  const router = useRouter();
  const { addToast } = useToast();
  const isAuthor = useIsAuthor();

  const loId = params.loId as string;

  const [lo, setLo] = useState<LearningObject | null>(null);
  const [versions, setVersions] = useState<LearningObjectVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [loData, versionsData] = await Promise.all([
        getLearningObject(loId),
        listVersions(loId),
      ]);
      setLo(loData);
      setVersions(versionsData);
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to load learning object');
    } finally {
      setLoading(false);
    }
  }, [loId, addToast]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleCreateNewVersion = async () => {
    setCreating(true);
    try {
      const newVersion = await createNewVersion(loId);
      addToast('success', `Version ${newVersion.versionNumber} created`);
      router.push(`/learning-objects/${loId}/versions/${newVersion.versionNumber}`);
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to create new version');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (!lo) {
    return (
      <Card className="py-12 text-center">
        <h2 className="text-lg font-semibold text-text">Learning Object Not Found</h2>
        <p className="mt-1 text-sm text-muted">The requested learning object does not exist.</p>
        <Link href="/learning-objects" className="mt-4 inline-block">
          <Button>Back to List</Button>
        </Link>
      </Card>
    );
  }

  const latestVersion = versions[0];

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted">
        <Link href="/learning-objects" className="hover:text-text">
          Learning Objects
        </Link>
        <span>/</span>
        <span className="text-text">{lo.title}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">{lo.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted">
            <span className="rounded bg-surface-muted px-2 py-0.5">
              {SUBJECT_LABELS[lo.subject]}
            </span>
            <span className="rounded bg-surface-muted px-2 py-0.5">
              Grades {GRADE_BAND_LABELS[lo.gradeBand]}
            </span>
            {latestVersion && (
              <Badge tone={VERSION_STATE_TONES[latestVersion.state]}>
                {VERSION_STATE_LABELS[latestVersion.state]}
              </Badge>
            )}
          </div>
        </div>
        {isAuthor && latestVersion && (
          <Link href={`/learning-objects/${loId}/versions/${latestVersion.versionNumber}`}>
            <Button>Edit Latest Version</Button>
          </Link>
        )}
      </div>

      {/* Metadata & Tags */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Metadata" className="lg:col-span-2">
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-muted">Slug</dt>
              <dd className="mt-1 font-mono text-sm text-text">{lo.slug}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted">Created</dt>
              <dd className="mt-1 text-sm text-text">
                {formatDistanceToNow(new Date(lo.createdAt), { addSuffix: true })}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted">Active</dt>
              <dd className="mt-1">
                <Badge tone={lo.isActive ? 'success' : 'neutral'}>
                  {lo.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted">Versions</dt>
              <dd className="mt-1 text-sm text-text">{versions.length}</dd>
            </div>
          </dl>
        </Card>

        <Card title="Tags">
          {lo.tags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {lo.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="rounded-full bg-primary/10 px-2 py-1 text-sm font-medium text-primary"
                >
                  {tag.tag}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">No tags</p>
          )}
        </Card>
      </div>

      {/* Versions */}
      <Card
        title="Versions"
        action={
          isAuthor && (
            <Button variant="secondary" onClick={handleCreateNewVersion} disabled={creating}>
              {creating ? 'Creating...' : 'Create New Version'}
            </Button>
          )
        }
      >
        {versions.length === 0 ? (
          <p className="text-sm text-muted">No versions yet</p>
        ) : (
          <div className="space-y-3">
            {versions.map((version) => (
              <Link
                key={version.id}
                href={`/learning-objects/${loId}/versions/${version.versionNumber}`}
                className="block rounded-lg border border-border p-4 transition-colors hover:bg-surface-muted"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-semibold text-text">
                      v{version.versionNumber}
                    </span>
                    <Badge tone={VERSION_STATE_TONES[version.state]}>
                      {VERSION_STATE_LABELS[version.state]}
                    </Badge>
                  </div>
                  <span className="text-sm text-muted">
                    {formatDistanceToNow(new Date(version.createdAt), { addSuffix: true })}
                  </span>
                </div>
                {version.changeSummary && (
                  <p className="mt-2 text-sm text-muted">{version.changeSummary}</p>
                )}
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-64 animate-pulse rounded-lg bg-surface-muted" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="h-48 animate-pulse rounded-xl bg-surface-muted lg:col-span-2" />
        <div className="h-48 animate-pulse rounded-xl bg-surface-muted" />
      </div>
      <div className="h-64 animate-pulse rounded-xl bg-surface-muted" />
    </div>
  );
}
