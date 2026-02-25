'use client';

// ══════════════════════════════════════════════════════════════════════════════
// VERSIONING POLICY PAGE
// ══════════════════════════════════════════════════════════════════════════════

const lifecycleStages = [
  {
    status: 'Current',
    color: 'bg-green-500',
    description: 'The latest stable version. All new features land here first.',
    headers: 'API-Version, API-Current-Version',
  },
  {
    status: 'Supported',
    color: 'bg-blue-500',
    description:
      'Still fully operational and receiving security patches. A newer version exists.',
    headers: 'API-Version, API-Current-Version, API-Latest',
  },
  {
    status: 'Deprecated',
    color: 'bg-yellow-500',
    description:
      'Scheduled for removal. Receives only critical security fixes. Minimum 12 months before sunset.',
    headers:
      'API-Version, API-Deprecation, API-Sunset, Deprecation, Sunset, Link rel="deprecation"',
  },
  {
    status: 'Sunset',
    color: 'bg-red-500',
    description: 'Removed. All requests return 410 Gone with migration instructions.',
    headers: 'N/A — returns 410 Gone',
  },
];

export default function VersioningPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">API Versioning Policy</h1>
      <p className="text-gray-600 mb-8">
        AIVO uses URL-path versioning (<code>/public/v1/</code>) for all public APIs.
        Each version follows a defined lifecycle with clear deprecation timelines and
        communication through HTTP headers.
      </p>

      {/* Version Format */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Version Format</h2>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <code className="text-sm">
            https://api.aivo.dev/public/<span className="text-portal-primary font-bold">v1</span>
            /learners/:id/progress
          </code>
          <p className="text-sm text-gray-600 mt-2">
            The version segment (<code>v1</code>, <code>v2</code>, etc.) appears immediately after{' '}
            <code>/public/</code>. Only the major version is included in the URL — minor and patch
            changes are always backward-compatible.
          </p>
        </div>
      </section>

      {/* Lifecycle */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Version Lifecycle</h2>
        <div className="space-y-4">
          {lifecycleStages.map((stage) => (
            <div
              key={stage.status}
              className="flex items-start gap-4 border border-gray-200 rounded-lg p-4"
            >
              <div className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${stage.color}`} />
              <div>
                <h3 className="font-semibold text-gray-900">{stage.status}</h3>
                <p className="text-sm text-gray-600 mb-1">{stage.description}</p>
                <p className="text-xs text-gray-400">
                  <strong>Headers:</strong> {stage.headers}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Deprecation Timeline */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Deprecation Timeline</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-gray-200 rounded-lg">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left p-3 font-semibold">Phase</th>
                <th className="text-left p-3 font-semibold">Duration</th>
                <th className="text-left p-3 font-semibold">Description</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-gray-200">
                <td className="p-3 font-medium">Announcement</td>
                <td className="p-3">T+0</td>
                <td className="p-3 text-gray-600">
                  Deprecation notice published. Headers begin appearing on responses.
                </td>
              </tr>
              <tr className="border-t border-gray-200">
                <td className="p-3 font-medium">Migration Period</td>
                <td className="p-3">12–18 months</td>
                <td className="p-3 text-gray-600">
                  Both old and new versions run side by side. Migration guides available.
                </td>
              </tr>
              <tr className="border-t border-gray-200">
                <td className="p-3 font-medium">Sunset Warning</td>
                <td className="p-3">Last 3 months</td>
                <td className="p-3 text-gray-600">
                  Email reminders to remaining consumers. Dashboard warnings.
                </td>
              </tr>
              <tr className="border-t border-gray-200">
                <td className="p-3 font-medium">Sunset</td>
                <td className="p-3">18+ months</td>
                <td className="p-3 text-gray-600">
                  All requests return 410 Gone. Enterprise tenants get 24+ months.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Breaking vs Non-breaking */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">
          Breaking vs Non-Breaking Changes
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-red-200 rounded-lg p-4 bg-red-50/50">
            <h3 className="font-semibold text-red-800 mb-2">Breaking (requires new version)</h3>
            <ul className="text-sm text-red-700 space-y-1">
              <li>• Removing an endpoint or field</li>
              <li>• Changing a field type or format</li>
              <li>• Renaming a field or parameter</li>
              <li>• Making an optional field required</li>
              <li>• Changing error response structure</li>
              <li>• Changing authentication requirements</li>
            </ul>
          </div>
          <div className="border border-green-200 rounded-lg p-4 bg-green-50/50">
            <h3 className="font-semibold text-green-800 mb-2">
              Non-Breaking (same version)
            </h3>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• Adding a new endpoint</li>
              <li>• Adding an optional field to responses</li>
              <li>• Adding an optional request parameter</li>
              <li>• Adding a new enum value (additive)</li>
              <li>• Improving error messages (same codes)</li>
              <li>• Performance improvements</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Links */}
      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Related Resources</h2>
        <ul className="space-y-2 text-sm">
          <li>
            <a href="/docs/changelog" className="text-portal-primary hover:underline">
              API Changelog →
            </a>
          </li>
          <li>
            <a href="/docs/api-reference" className="text-portal-primary hover:underline">
              Interactive API Reference →
            </a>
          </li>
          <li>
            <a href="/docs/migration/v1-to-v2" className="text-portal-primary hover:underline">
              Migration Guide: v1 → v2 (template) →
            </a>
          </li>
        </ul>
      </section>
    </div>
  );
}
