'use client';

import { useState, useEffect, useCallback } from 'react';

// ══════════════════════════════════════════════════════════════════════════════
// SIMPLE ICON COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

function CopyIcon({ className }: Readonly<{ className?: string }>) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon({ className }: Readonly<{ className?: string }>) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function ExternalLinkIcon({ className }: Readonly<{ className?: string }>) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

function Share2Icon({ className }: Readonly<{ className?: string }>) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

function SettingsIcon({ className }: Readonly<{ className?: string }>) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function PlusIcon({ className }: Readonly<{ className?: string }>) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface LtiTool {
  id: string;
  platformType: string;
  platformName: string;
  clientId: string;
  issuer: string;
  enabled: boolean;
}

interface LtiLink {
  id: string;
  title: string;
  description?: string;
  loVersionId?: string;
  activityTemplateId?: string;
  maxPoints?: number;
  gradingEnabled: boolean;
  ltiToolId: string;
  tool?: {
    platformName: string;
    platformType: string;
  };
  createdAt: string;
}

interface Activity {
  id: string;
  title: string;
  subject: string;
  gradeBand: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// API FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

async function fetchLtiTools(): Promise<LtiTool[]> {
  const res = await fetch('/api/lti/tools');
  if (!res.ok) throw new Error('Failed to fetch LTI tools');
  return res.json() as Promise<LtiTool[]>;
}

async function fetchLtiLinks(activityId?: string): Promise<LtiLink[]> {
  const url = activityId ? `/api/lti/links?loVersionId=${activityId}` : '/api/lti/links';
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch LTI links');
  return res.json() as Promise<LtiLink[]>;
}

async function createLtiLink(data: Partial<LtiLink>): Promise<LtiLink> {
  const res = await fetch('/api/lti/links', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create LTI link');
  return res.json() as Promise<LtiLink>;
}

// ══════════════════════════════════════════════════════════════════════════════
// SHARE TO LMS BUTTON
// ══════════════════════════════════════════════════════════════════════════════

interface ShareToLmsButtonProps {
  readonly activity: Activity;
  readonly onShare?: (link: LtiLink) => void;
}

export function ShareToLmsButton({ activity, onShare }: Readonly<ShareToLmsButtonProps>) {
  const [isOpen, setIsOpen] = useState(false);
  const [tools, setTools] = useState<LtiTool[]>([]);
  const [existingLinks, setExistingLinks] = useState<LtiLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedTool, setSelectedTool] = useState<string>('');
  const [title, setTitle] = useState(activity.title);
  const [maxPoints, setMaxPoints] = useState<number>(100);
  const [gradingEnabled, setGradingEnabled] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [toolsData, linksData] = await Promise.all([
        fetchLtiTools(),
        fetchLtiLinks(activity.id),
      ]);
      setTools(toolsData.filter((t) => t.enabled));
      setExistingLinks(linksData);
      if (toolsData.length > 0) {
        setSelectedTool((prev) => prev || toolsData[0].id);
      }
    } catch (error) {
      console.error('Error loading LTI data:', error);
    } finally {
      setLoading(false);
    }
  }, [activity.id]);

  useEffect(() => {
    if (isOpen) {
      void loadData();
    }
  }, [isOpen, loadData]);

  const handleCreateLink = async () => {
    if (!selectedTool) return;

    setCreating(true);
    try {
      const link = await createLtiLink({
        ltiToolId: selectedTool,
        loVersionId: activity.id,
        title,
        maxPoints: gradingEnabled ? maxPoints : undefined,
        gradingEnabled,
      });
      setExistingLinks([link, ...existingLinks]);
      onShare?.(link);
    } catch (error) {
      console.error('Error creating LTI link:', error);
    } finally {
      setCreating(false);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  const getLaunchUrl = (linkId: string) => {
    return `${globalThis.location.origin}/lti/deep-link/${linkId}`;
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => {
          setIsOpen(true);
        }}
        className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
      >
        <Share2Icon className="h-4 w-4" />
        Share to LMS
      </button>
    );
  }

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex h-40 items-center justify-center">
          <div className="text-gray-500">Loading...</div>
        </div>
      );
    }

    if (tools.length === 0) {
      return (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <p className="text-sm text-yellow-800">
            No LMS integrations configured. Contact your administrator to set up LTI integration
            with your learning management system.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Activity Info */}
        <div className="rounded-lg bg-gray-50 p-4">
          <h3 className="font-medium text-gray-900">{activity.title}</h3>
          <p className="mt-1 text-sm text-gray-500">
            {activity.subject} • {activity.gradeBand.replace('_', '-')}
          </p>
        </div>

        {/* Existing Links */}
        {existingLinks.length > 0 && (
          <div>
            <h4 className="mb-3 text-sm font-medium text-gray-700">Existing LTI Links</h4>
            <div className="space-y-2">
              {existingLinks.map((link) => (
                <div
                  key={link.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{link.title}</p>
                    <p className="text-xs text-gray-500">
                      {link.tool?.platformName || 'Unknown LMS'}
                      {link.gradingEnabled && ` • ${link.maxPoints} points`}
                    </p>
                  </div>
                  <button
                    onClick={() => void copyToClipboard(getLaunchUrl(link.id), link.id)}
                    className="flex items-center gap-1 rounded px-3 py-1 text-sm text-blue-600 hover:bg-blue-50"
                  >
                    {copiedId === link.id ? (
                      <>
                        <CheckIcon className="h-4 w-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <CopyIcon className="h-4 w-4" />
                        Copy URL
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Create New Link */}
        <div className="rounded-lg border p-4">
          <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-700">
            <PlusIcon className="h-4 w-4" />
            Create New LTI Link
          </h4>

          <div className="space-y-4">
            {/* LMS Selection */}
            <div>
              <label htmlFor="lti-tool-select" className="mb-1 block text-sm text-gray-600">
                Learning Management System
              </label>
              <select
                id="lti-tool-select"
                value={selectedTool}
                onChange={(e) => {
                  setSelectedTool(e.target.value);
                }}
                className="w-full rounded-md border px-3 py-2 text-sm"
              >
                {tools.map((tool) => (
                  <option key={tool.id} value={tool.id}>
                    {tool.platformName} ({tool.platformType})
                  </option>
                ))}
              </select>
            </div>

            {/* Title */}
            <div>
              <label htmlFor="lti-title-input" className="mb-1 block text-sm text-gray-600">
                Assignment Title
              </label>
              <input
                id="lti-title-input"
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                }}
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>

            {/* Grading Options */}
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={gradingEnabled}
                  onChange={(e) => {
                    setGradingEnabled(e.target.checked);
                  }}
                  className="rounded border-gray-300"
                />{' '}
                Enable grade passback
              </label>

              {gradingEnabled && (
                <div className="flex items-center gap-2">
                  <label htmlFor="lti-max-points" className="text-sm text-gray-600">
                    Max points:
                  </label>
                  <input
                    id="lti-max-points"
                    type="number"
                    value={maxPoints}
                    onChange={(e) => {
                      setMaxPoints(Number(e.target.value));
                    }}
                    min={1}
                    max={1000}
                    className="w-20 rounded-md border px-2 py-1 text-sm"
                  />
                </div>
              )}
            </div>

            {/* Create Button */}
            <button
              onClick={handleCreateLink}
              disabled={creating || !selectedTool || !title}
              className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create LTI Link'}
            </button>
          </div>
        </div>

        {/* Help Text */}
        <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
          <p className="font-medium text-gray-700">How to use:</p>
          <ol className="mt-2 list-inside list-decimal space-y-1">
            <li>Copy the launch URL for your LMS</li>
            <li>In your LMS, create an assignment or external tool link</li>
            <li>Paste the URL as the tool launch URL</li>
            <li>Students will be directed to this activity when they click the link</li>
          </ol>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Share to LMS</h2>
          <button
            onClick={() => {
              setIsOpen(false);
            }}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4">{renderContent()}</div>

        {/* Footer */}
        <div className="flex justify-end border-t px-6 py-4">
          <button
            onClick={() => {
              setIsOpen(false);
            }}
            className="rounded-md px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// LTI CONFIGURATION PANEL (for classroom settings)
// ══════════════════════════════════════════════════════════════════════════════

interface LtiConfigPanelProps {
  readonly classroomId?: string;
}

export function LtiConfigPanel({ classroomId }: Readonly<LtiConfigPanelProps>) {
  const [tools, setTools] = useState<LtiTool[]>([]);
  const [links, setLinks] = useState<LtiLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [toolsData, linksData] = await Promise.all([fetchLtiTools(), fetchLtiLinks()]);
        setTools(toolsData);
        setLinks(linksData);
      } catch (error) {
        console.error('Error loading LTI config:', error);
      } finally {
        setLoading(false);
      }
    };
    void loadData();
  }, [classroomId]);

  if (loading) {
    return <div className="p-4 text-gray-500">Loading LTI configuration...</div>;
  }

  return (
    <div className="rounded-lg border bg-white p-6">
      <div className="flex items-center gap-2 mb-4">
        <SettingsIcon className="h-5 w-5 text-gray-400" />
        <h3 className="text-lg font-medium text-gray-900">LMS Integration</h3>
      </div>

      {/* Connected LMS Platforms */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Connected Platforms</h4>
        {tools.length === 0 ? (
          <p className="text-sm text-gray-500">No LMS platforms connected</p>
        ) : (
          <div className="space-y-2">
            {tools.map((tool) => (
              <div
                key={tool.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-2 w-2 rounded-full ${tool.enabled ? 'bg-green-500' : 'bg-gray-300'}`}
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{tool.platformName}</p>
                    <p className="text-xs text-gray-500">{tool.platformType}</p>
                  </div>
                </div>
                <a
                  href={`/settings/lti/${tool.id}`}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Configure
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent LTI Links */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">
          Recent LTI Links ({links.length})
        </h4>
        {links.length === 0 ? (
          <p className="text-sm text-gray-500">
            No LTI links created yet. Use &quot;Share to LMS&quot; on any activity to create one.
          </p>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {links.slice(0, 10).map((link) => (
              <div
                key={link.id}
                className="flex items-center justify-between rounded border p-2 text-sm"
              >
                <div>
                  <p className="font-medium text-gray-900">{link.title}</p>
                  <p className="text-xs text-gray-500">
                    {link.tool?.platformName} • {new Date(link.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <ExternalLinkIcon className="h-4 w-4 text-gray-400" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ══════════════════════════════════════════════════════════════════════════════

export default ShareToLmsButton;
