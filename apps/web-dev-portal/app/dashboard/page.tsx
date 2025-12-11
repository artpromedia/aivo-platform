'use client';

import Link from 'next/link';
import { useState } from 'react';

// Mock data for the dashboard
const mockData = {
  partner: {
    name: 'Acme Education',
    email: 'jane@acme-education.com',
    tier: 'Developer',
    status: 'active',
  },
  sandbox: {
    tenantId: 'sandbox_acme_abc123',
    apiKey: 'aivo_sk_test_abc123...xyz789',
    apiKeyCreated: '2024-12-01T10:00:00Z',
    webhookSecret: 'whsec_abc123...xyz789',
  },
  usage: {
    apiCallsToday: 847,
    apiCallsLimit: 10000,
    webhooksDelivered: 156,
    webhooksFailed: 3,
  },
  recentApiCalls: [
    { endpoint: 'GET /learners', time: '2 min ago', status: 200 },
    { endpoint: 'GET /learners/abc123/progress', time: '5 min ago', status: 200 },
    { endpoint: 'POST /events/external-learning', time: '12 min ago', status: 201 },
    { endpoint: 'GET /learners/invalid/progress', time: '15 min ago', status: 404 },
  ],
  webhooks: [
    { id: 'wh_001', name: 'Production Webhook', url: 'https://acme.com/webhooks/aivo', enabled: true, events: ['SESSION_COMPLETED', 'BASELINE_COMPLETED'] },
    { id: 'wh_002', name: 'Test Webhook', url: 'https://webhook.site/abc123', enabled: false, events: ['SESSION_COMPLETED'] },
  ],
  apiKeys: [
    { id: 'key_001', name: 'Production Key', prefix: 'aivo_sk_test_abc...', scopes: ['read:learner_progress', 'read:session_data'], created: '2024-12-01', lastUsed: '2 min ago' },
    { id: 'key_002', name: 'Analytics Key', prefix: 'aivo_sk_test_def...', scopes: ['read:analytics'], created: '2024-12-05', lastUsed: '1 hour ago' },
  ],
};

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'credentials' | 'webhooks' | 'analytics'>('overview');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-6">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-portal-primary rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">A</span>
                </div>
                <span className="font-semibold text-xl">Aivo Developers</span>
              </Link>
              <span className="text-gray-300">|</span>
              <span className="text-gray-600 font-medium">Partner Dashboard</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/docs" className="text-gray-600 hover:text-gray-900 transition-colors text-sm">
                Documentation
              </Link>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                  <span className="text-gray-600 font-medium text-sm">AE</span>
                </div>
                <span className="text-sm text-gray-700">{mockData.partner.name}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Environment Badge */}
        <div className="mb-6">
          <span className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-medium">
            <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
            Sandbox Environment
          </span>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 border-b border-gray-200">
          {(['overview', 'credentials', 'webhooks', 'analytics'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-portal-primary text-portal-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid md:grid-cols-4 gap-4">
              <StatCard title="API Calls Today" value={mockData.usage.apiCallsToday.toLocaleString()} subtitle={`of ${mockData.usage.apiCallsLimit.toLocaleString()} limit`} />
              <StatCard title="Webhooks Delivered" value={mockData.usage.webhooksDelivered.toString()} subtitle="Last 24 hours" />
              <StatCard title="Failed Deliveries" value={mockData.usage.webhooksFailed.toString()} subtitle="Needs attention" alert={mockData.usage.webhooksFailed > 0} />
              <StatCard title="Partner Tier" value={mockData.partner.tier} subtitle="Upgrade available" />
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="font-semibold mb-4">Quick Actions</h2>
              <div className="grid md:grid-cols-4 gap-4">
                <Link href="/dashboard/credentials" className="p-4 border border-gray-200 rounded-lg hover:border-portal-primary transition-colors">
                  <div className="text-2xl mb-2">🔑</div>
                  <div className="font-medium text-sm">View API Keys</div>
                </Link>
                <Link href="/dashboard/webhooks" className="p-4 border border-gray-200 rounded-lg hover:border-portal-primary transition-colors">
                  <div className="text-2xl mb-2">🔔</div>
                  <div className="font-medium text-sm">Manage Webhooks</div>
                </Link>
                <Link href="/api-reference" className="p-4 border border-gray-200 rounded-lg hover:border-portal-primary transition-colors">
                  <div className="text-2xl mb-2">📚</div>
                  <div className="font-medium text-sm">API Reference</div>
                </Link>
                <Link href="/docs/quickstart" className="p-4 border border-gray-200 rounded-lg hover:border-portal-primary transition-colors">
                  <div className="text-2xl mb-2">🚀</div>
                  <div className="font-medium text-sm">Quickstart Guide</div>
                </Link>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="font-semibold mb-4">Recent API Calls</h2>
              <div className="space-y-2">
                {mockData.recentApiCalls.map((call, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <code className="text-sm text-gray-700">{call.endpoint}</code>
                    <div className="flex items-center gap-4">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        call.status >= 200 && call.status < 300 ? 'bg-emerald-100 text-emerald-800' :
                        call.status >= 400 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {call.status}
                      </span>
                      <span className="text-sm text-gray-500">{call.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Credentials Tab */}
        {activeTab === 'credentials' && (
          <div className="space-y-6">
            {/* Sandbox Details */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="font-semibold mb-4">Sandbox Credentials</h2>
              <div className="space-y-4">
                <CredentialRow label="Tenant ID" value={mockData.sandbox.tenantId} />
                <CredentialRow label="Webhook Secret" value={mockData.sandbox.webhookSecret} masked />
              </div>
            </div>

            {/* API Keys */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-semibold">API Keys</h2>
                <button className="px-4 py-2 bg-portal-primary text-white rounded-lg text-sm hover:bg-portal-primary/90 transition-colors">
                  Create New Key
                </button>
              </div>
              <div className="space-y-4">
                {mockData.apiKeys.map((key) => (
                  <div key={key.id} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-medium">{key.name}</div>
                        <code className="text-sm text-gray-500">{key.prefix}</code>
                      </div>
                      <button className="text-red-600 text-sm hover:underline">Revoke</button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {key.scopes.map((scope) => (
                        <span key={scope} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                          {scope}
                        </span>
                      ))}
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      Created {key.created} • Last used {key.lastUsed}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Webhooks Tab */}
        {activeTab === 'webhooks' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-semibold">Webhook Endpoints</h2>
                <button className="px-4 py-2 bg-portal-primary text-white rounded-lg text-sm hover:bg-portal-primary/90 transition-colors">
                  Add Endpoint
                </button>
              </div>
              <div className="space-y-4">
                {mockData.webhooks.map((webhook) => (
                  <div key={webhook.id} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{webhook.name}</span>
                          <span className={`w-2 h-2 rounded-full ${webhook.enabled ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
                        </div>
                        <code className="text-sm text-gray-500">{webhook.url}</code>
                      </div>
                      <div className="flex gap-2">
                        <button className="text-portal-primary text-sm hover:underline">Edit</button>
                        <button className="text-red-600 text-sm hover:underline">Delete</button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {webhook.events.map((event) => (
                        <span key={event} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                          {event}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery Log */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="font-semibold mb-4">Recent Deliveries</h2>
              <div className="text-sm text-gray-500 text-center py-8">
                No recent deliveries. Events will appear here when they&apos;re sent.
              </div>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="font-semibold mb-4">API Usage (Last 7 Days)</h2>
              <div className="h-64 flex items-center justify-center text-gray-500">
                [Chart Placeholder - API calls over time]
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="font-semibold mb-4">Top Endpoints</h2>
                <div className="space-y-3">
                  <EndpointUsage endpoint="GET /learners/{id}/progress" calls={412} />
                  <EndpointUsage endpoint="GET /learners" calls={256} />
                  <EndpointUsage endpoint="POST /events/external-learning" calls={134} />
                  <EndpointUsage endpoint="GET /learners/{id}/sessions" calls={89} />
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="font-semibold mb-4">Webhook Delivery Stats</h2>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Delivered</span>
                    <span className="font-medium">156</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Failed</span>
                    <span className="font-medium text-red-600">3</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Success Rate</span>
                    <span className="font-medium text-emerald-600">98.1%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Avg Response Time</span>
                    <span className="font-medium">245ms</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle, alert }: { title: string; value: string; subtitle: string; alert?: boolean }) {
  return (
    <div className={`bg-white rounded-lg border p-4 ${alert ? 'border-red-200' : 'border-gray-200'}`}>
      <div className="text-sm text-gray-500 mb-1">{title}</div>
      <div className={`text-2xl font-bold ${alert ? 'text-red-600' : 'text-gray-900'}`}>{value}</div>
      <div className="text-xs text-gray-500">{subtitle}</div>
    </div>
  );
}

function CredentialRow({ label, value, masked }: { label: string; value: string; masked?: boolean }) {
  const [revealed, setRevealed] = useState(false);
  const displayValue = masked && !revealed ? '••••••••••••••••' : value;

  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100">
      <span className="text-gray-600">{label}</span>
      <div className="flex items-center gap-2">
        <code className="text-sm bg-gray-100 px-2 py-1 rounded">{displayValue}</code>
        {masked && (
          <button
            onClick={() => setRevealed(!revealed)}
            className="text-portal-primary text-sm hover:underline"
          >
            {revealed ? 'Hide' : 'Reveal'}
          </button>
        )}
        <button
          onClick={() => navigator.clipboard.writeText(value)}
          className="text-gray-500 hover:text-gray-700"
        >
          📋
        </button>
      </div>
    </div>
  );
}

function EndpointUsage({ endpoint, calls }: { endpoint: string; calls: number }) {
  return (
    <div className="flex items-center justify-between">
      <code className="text-sm text-gray-700">{endpoint}</code>
      <span className="text-sm font-medium">{calls}</span>
    </div>
  );
}
