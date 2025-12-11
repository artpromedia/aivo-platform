'use client';

import { useState, useEffect, useCallback } from 'react';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface WebhookEndpoint {
  id: string;
  name: string;
  description: string | null;
  url: string;
  enabled: boolean;
  eventTypes: string[];
  filterJson: Record<string, unknown> | null;
  lastDeliveryAt: string | null;
  failureCount: number;
  disabledAt: string | null;
  disabledReason: string | null;
  deliveryCount: number;
  createdAt: string;
  updatedAt: string;
}

interface WebhookDelivery {
  id: string;
  eventType: string;
  eventId: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'SUCCESS' | 'FAILED' | 'PERMANENT_FAILURE';
  attemptCount: number;
  maxAttempts: number;
  lastStatusCode: number | null;
  lastErrorMessage: string | null;
  responseTimeMs: number | null;
  createdAt: string;
  scheduledAt: string;
  lastAttemptAt: string | null;
  completedAt: string | null;
}

interface CreateWebhookRequest {
  name: string;
  description?: string;
  url: string;
  eventTypes: string[];
  enabled: boolean;
}

const EVENT_TYPES = [
  { value: 'SESSION_STARTED', label: 'Session Started', category: 'Sessions' },
  { value: 'SESSION_COMPLETED', label: 'Session Completed', category: 'Sessions' },
  { value: 'SESSION_ABANDONED', label: 'Session Abandoned', category: 'Sessions' },
  { value: 'BASELINE_STARTED', label: 'Baseline Started', category: 'Assessments' },
  { value: 'BASELINE_COMPLETED', label: 'Baseline Completed', category: 'Assessments' },
  { value: 'ASSESSMENT_COMPLETED', label: 'Assessment Completed', category: 'Assessments' },
  { value: 'SKILL_MASTERY_UPDATED', label: 'Skill Mastery Updated', category: 'Learning' },
  { value: 'RECOMMENDATION_CREATED', label: 'Recommendation Created', category: 'Learning' },
  { value: 'ACTIVITY_COMPLETED', label: 'Activity Completed', category: 'Learning' },
  { value: 'STREAK_MILESTONE', label: 'Streak Milestone', category: 'Engagement' },
  { value: 'ACHIEVEMENT_UNLOCKED', label: 'Achievement Unlocked', category: 'Engagement' },
  { value: 'LEARNER_ENROLLED', label: 'Learner Enrolled', category: 'Administrative' },
  { value: 'LEARNER_UNENROLLED', label: 'Learner Unenrolled', category: 'Administrative' },
];

// ══════════════════════════════════════════════════════════════════════════════
// API FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

async function fetchWebhooks(): Promise<WebhookEndpoint[]> {
  const res = await fetch('/api/integrations/webhooks');
  if (!res.ok) throw new Error('Failed to fetch webhooks');
  return res.json() as Promise<WebhookEndpoint[]>;
}

async function createWebhook(data: CreateWebhookRequest): Promise<WebhookEndpoint & { secret: string }> {
  const res = await fetch('/api/integrations/webhooks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create webhook');
  return res.json() as Promise<WebhookEndpoint & { secret: string }>;
}

async function updateWebhook(id: string, data: Partial<CreateWebhookRequest>): Promise<WebhookEndpoint> {
  const res = await fetch(`/api/integrations/webhooks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update webhook');
  return res.json() as Promise<WebhookEndpoint>;
}

async function deleteWebhook(id: string): Promise<void> {
  const res = await fetch(`/api/integrations/webhooks/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete webhook');
}

async function rotateWebhookSecret(id: string): Promise<{ secret: string }> {
  const res = await fetch(`/api/integrations/webhooks/${id}/rotate-secret`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to rotate secret');
  return res.json() as Promise<{ secret: string }>;
}

async function fetchDeliveries(webhookId: string, page: number = 1): Promise<{
  deliveries: WebhookDelivery[];
  pagination: { total: number; page: number; pageSize: number; hasMore: boolean };
}> {
  const res = await fetch(`/api/integrations/webhooks/${webhookId}/deliveries?page=${page}`);
  if (!res.ok) throw new Error('Failed to fetch deliveries');
  return res.json() as Promise<{
    deliveries: WebhookDelivery[];
    pagination: { total: number; page: number; pageSize: number; hasMore: boolean };
  }>;
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    SUCCESS: 'bg-green-100 text-green-800',
    PENDING: 'bg-yellow-100 text-yellow-800',
    IN_PROGRESS: 'bg-blue-100 text-blue-800',
    FAILED: 'bg-orange-100 text-orange-800',
    PERMANENT_FAILURE: 'bg-red-100 text-red-800',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

function WebhookCard({
  webhook,
  onEdit,
  onViewDeliveries,
  onToggle,
  onDelete,
}: {
  webhook: WebhookEndpoint;
  onEdit: () => void;
  onViewDeliveries: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900">{webhook.name}</h3>
            {webhook.enabled ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                Active
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                Disabled
              </span>
            )}
            {webhook.disabledAt && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                Auto-disabled
              </span>
            )}
          </div>
          {webhook.description && (
            <p className="mt-1 text-sm text-gray-500">{webhook.description}</p>
          )}
          <p className="mt-2 text-sm font-mono text-gray-600 truncate max-w-md">{webhook.url}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onViewDeliveries}
            className="rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
          >
            Deliveries
          </button>
          <button
            onClick={onEdit}
            className="rounded-md px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50"
          >
            Edit
          </button>
          <button
            onClick={onToggle}
            className={`rounded-md px-3 py-1.5 text-sm ${
              webhook.enabled ? 'text-orange-600 hover:bg-orange-50' : 'text-green-600 hover:bg-green-50'
            }`}
          >
            {webhook.enabled ? 'Disable' : 'Enable'}
          </button>
          <button
            onClick={onDelete}
            className="rounded-md px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1">
        {webhook.eventTypes.map((event) => (
          <span
            key={event}
            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700"
          >
            {event.replace(/_/g, ' ')}
          </span>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-6 text-sm text-gray-500">
        <span>
          <strong>{webhook.deliveryCount}</strong> deliveries
        </span>
        {webhook.lastDeliveryAt && (
          <span>
            Last delivery: {new Date(webhook.lastDeliveryAt).toLocaleString()}
          </span>
        )}
        {webhook.failureCount > 0 && (
          <span className="text-orange-600">
            {webhook.failureCount} consecutive failures
          </span>
        )}
      </div>

      {webhook.disabledReason && (
        <div className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">
          <strong>Disabled:</strong> {webhook.disabledReason}
        </div>
      )}
    </div>
  );
}

function CreateWebhookModal({
  isOpen,
  onClose,
  onCreated,
  editingWebhook,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (webhook: WebhookEndpoint, secret?: string) => void;
  editingWebhook?: WebhookEndpoint | null;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [eventTypes, setEventTypes] = useState<string[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingWebhook) {
      setName(editingWebhook.name);
      setDescription(editingWebhook.description || '');
      setUrl(editingWebhook.url);
      setEventTypes(editingWebhook.eventTypes);
      setEnabled(editingWebhook.enabled);
    } else {
      setName('');
      setDescription('');
      setUrl('');
      setEventTypes([]);
      setEnabled(true);
    }
    setError(null);
  }, [editingWebhook, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (editingWebhook) {
        const updated = await updateWebhook(editingWebhook.id, {
          name,
          description: description || undefined,
          url,
          eventTypes,
          enabled,
        });
        onCreated(updated);
      } else {
        const created = await createWebhook({
          name,
          description: description || undefined,
          url,
          eventTypes,
          enabled,
        });
        onCreated(created, created.secret);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const toggleEventType = (type: string) => {
    setEventTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  if (!isOpen) return null;

  const groupedEvents = EVENT_TYPES.reduce((acc, event) => {
    if (!acc[event.category]) acc[event.category] = [];
    acc[event.category].push(event);
    return acc;
  }, {} as Record<string, typeof EVENT_TYPES>);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white shadow-xl">
        <form onSubmit={handleSubmit}>
          <div className="border-b px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {editingWebhook ? 'Edit Webhook' : 'Create Webhook Endpoint'}
            </h2>
          </div>

          <div className="p-6 space-y-6">
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
                placeholder="My Webhook"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Description (optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
                placeholder="Describe what this webhook is for..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Endpoint URL</label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                className="mt-1 block w-full rounded-md border px-3 py-2 text-sm font-mono"
                placeholder="https://your-server.com/webhooks/aivo"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Event Types</label>
              <div className="space-y-4">
                {Object.entries(groupedEvents).map(([category, events]) => (
                  <div key={category}>
                    <p className="text-xs font-medium text-gray-500 uppercase mb-2">{category}</p>
                    <div className="flex flex-wrap gap-2">
                      {events.map((event) => (
                        <button
                          key={event.value}
                          type="button"
                          onClick={() => toggleEventType(event.value)}
                          className={`px-3 py-1.5 rounded-md text-sm ${
                            eventTypes.includes(event.value)
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {event.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {eventTypes.length === 0 && (
                <p className="mt-2 text-sm text-red-600">Select at least one event type</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="enabled"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600"
              />
              <label htmlFor="enabled" className="text-sm text-gray-700">
                Enable this webhook
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || eventTypes.length === 0}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : editingWebhook ? 'Save Changes' : 'Create Webhook'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeliveriesModal({
  isOpen,
  onClose,
  webhook,
}: {
  isOpen: boolean;
  onClose: () => void;
  webhook: WebhookEndpoint | null;
}) {
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  const loadDeliveries = useCallback(async (pageNum: number) => {
    if (!webhook) return;
    setLoading(true);
    try {
      const data = await fetchDeliveries(webhook.id, pageNum);
      setDeliveries(data.deliveries);
      setHasMore(data.pagination.hasMore);
      setTotal(data.pagination.total);
    } catch (err) {
      console.error('Failed to load deliveries:', err);
    } finally {
      setLoading(false);
    }
  }, [webhook]);

  useEffect(() => {
    if (isOpen && webhook) {
      setPage(1);
      void loadDeliveries(1);
    }
  }, [isOpen, webhook, loadDeliveries]);

  if (!isOpen || !webhook) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Delivery Logs</h2>
            <p className="text-sm text-gray-500">{webhook.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">
            ✕
          </button>
        </div>

        <div className="overflow-auto max-h-[calc(90vh-140px)]">
          {loading && deliveries.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : deliveries.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No deliveries yet</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Attempts</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Response</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {deliveries.map((delivery) => (
                  <tr key={delivery.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {delivery.eventType.replace(/_/g, ' ')}
                      </div>
                      <div className="text-xs text-gray-500 font-mono">
                        {delivery.eventId.slice(0, 8)}...
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={delivery.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {delivery.attemptCount} / {delivery.maxAttempts}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {delivery.lastStatusCode && (
                        <span className={`text-sm ${
                          delivery.lastStatusCode >= 200 && delivery.lastStatusCode < 300
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}>
                          {delivery.lastStatusCode}
                        </span>
                      )}
                      {delivery.responseTimeMs && (
                        <span className="ml-2 text-xs text-gray-400">
                          {delivery.responseTimeMs}ms
                        </span>
                      )}
                      {delivery.lastErrorMessage && (
                        <p className="text-xs text-red-500 truncate max-w-xs" title={delivery.lastErrorMessage}>
                          {delivery.lastErrorMessage}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(delivery.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="border-t px-6 py-4 flex items-center justify-between">
          <p className="text-sm text-gray-500">{total} total deliveries</p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const newPage = page - 1;
                setPage(newPage);
                void loadDeliveries(newPage);
              }}
              disabled={page === 1 || loading}
              className="rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => {
                const newPage = page + 1;
                setPage(newPage);
                void loadDeliveries(newPage);
              }}
              disabled={!hasMore || loading}
              className="rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SecretModal({
  isOpen,
  onClose,
  secret,
}: {
  isOpen: boolean;
  onClose: () => void;
  secret: string | null;
}) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !secret) return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
            <span className="text-yellow-600 text-xl">⚠️</span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Webhook Secret</h3>
            <p className="text-sm text-gray-500">
              Copy this secret now. It won&apos;t be shown again.
            </p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-md p-4 font-mono text-sm break-all">
          {secret}
        </div>

        <div className="mt-4 flex justify-end gap-3">
          <button
            onClick={() => void handleCopy()}
            className="rounded-md px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50"
          >
            {copied ? '✓ Copied!' : 'Copy Secret'}
          </button>
          <button
            onClick={onClose}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<WebhookEndpoint | null>(null);
  const [viewingDeliveries, setViewingDeliveries] = useState<WebhookEndpoint | null>(null);
  const [newSecret, setNewSecret] = useState<string | null>(null);

  const loadWebhooks = async () => {
    setLoading(true);
    try {
      const data = await fetchWebhooks();
      setWebhooks(data);
    } catch (err) {
      console.error('Failed to load webhooks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadWebhooks();
  }, []);

  const handleWebhookCreated = (webhook: WebhookEndpoint, secret?: string) => {
    if (editingWebhook) {
      setWebhooks((prev) => prev.map((w) => (w.id === webhook.id ? webhook : w)));
    } else {
      setWebhooks((prev) => [webhook, ...prev]);
      if (secret) {
        setNewSecret(secret);
      }
    }
    setEditingWebhook(null);
  };

  const handleToggle = async (webhook: WebhookEndpoint) => {
    try {
      const updated = await updateWebhook(webhook.id, { enabled: !webhook.enabled });
      setWebhooks((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
    } catch (err) {
      console.error('Failed to toggle webhook:', err);
    }
  };

  const handleDelete = async (webhook: WebhookEndpoint) => {
    if (!confirm(`Are you sure you want to delete "${webhook.name}"?`)) return;
    try {
      await deleteWebhook(webhook.id);
      setWebhooks((prev) => prev.filter((w) => w.id !== webhook.id));
    } catch (err) {
      console.error('Failed to delete webhook:', err);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Webhooks</h1>
          <p className="text-sm text-gray-500">
            Receive real-time notifications when events occur in Aivo
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Create Webhook
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading webhooks...</div>
      ) : webhooks.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto h-12 w-12 text-gray-400 mb-4">🔔</div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No webhooks yet</h3>
          <p className="text-sm text-gray-500 mb-4">
            Create a webhook to receive real-time event notifications
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Create your first webhook
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {webhooks.map((webhook) => (
            <WebhookCard
              key={webhook.id}
              webhook={webhook}
              onEdit={() => {
                setEditingWebhook(webhook);
                setShowCreateModal(true);
              }}
              onViewDeliveries={() => setViewingDeliveries(webhook)}
              onToggle={() => void handleToggle(webhook)}
              onDelete={() => void handleDelete(webhook)}
            />
          ))}
        </div>
      )}

      <CreateWebhookModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingWebhook(null);
        }}
        onCreated={handleWebhookCreated}
        editingWebhook={editingWebhook}
      />

      <DeliveriesModal
        isOpen={!!viewingDeliveries}
        onClose={() => setViewingDeliveries(null)}
        webhook={viewingDeliveries}
      />

      <SecretModal
        isOpen={!!newSecret}
        onClose={() => setNewSecret(null)}
        secret={newSecret}
      />
    </div>
  );
}
