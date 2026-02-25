'use client';

// ══════════════════════════════════════════════════════════════════════════════
// MIGRATION GUIDE: v1 → v2 (Template)
// ══════════════════════════════════════════════════════════════════════════════

export default function MigrationV1ToV2Page() {
  return (
    <div>
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
        <p className="text-sm text-yellow-800">
          <strong>Template:</strong> This migration guide will be completed when API v2 is released.
          API v1 is the current version and is fully supported.
        </p>
      </div>

      <h1 className="text-3xl font-bold text-gray-900 mb-2">Migration Guide: v1 → v2</h1>
      <p className="text-gray-600 mb-8">
        Step-by-step instructions for migrating your integration from API v1 to v2.
      </p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Timeline</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-gray-200 rounded-lg">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left p-3 font-semibold">Milestone</th>
                <th className="text-left p-3 font-semibold">Date</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-gray-200">
                <td className="p-3">v2 Release</td>
                <td className="p-3 text-gray-500">TBD</td>
              </tr>
              <tr className="border-t border-gray-200">
                <td className="p-3">v1 Deprecated</td>
                <td className="p-3 text-gray-500">TBD</td>
              </tr>
              <tr className="border-t border-gray-200">
                <td className="p-3">v1 Sunset</td>
                <td className="p-3 text-gray-500">TBD (18 months after deprecation)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Breaking Changes</h2>
        <p className="text-gray-600 text-sm mb-4">
          Details will be published here when v2 development begins.
        </p>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center text-gray-400">
          No breaking changes announced yet.
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Step-by-Step Migration</h2>
        <ol className="space-y-4 text-sm text-gray-700">
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-portal-primary text-white text-xs flex items-center justify-center font-semibold">
              1
            </span>
            <div>
              <strong>Update Base URL</strong>
              <p className="text-gray-500">
                Replace <code>/public/v1/</code> with <code>/public/v2/</code> in your API client
                configuration.
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-portal-primary text-white text-xs flex items-center justify-center font-semibold">
              2
            </span>
            <div>
              <strong>Update Response Parsing</strong>
              <p className="text-gray-500">
                Adjust your deserialization logic for any changed response shapes.
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-portal-primary text-white text-xs flex items-center justify-center font-semibold">
              3
            </span>
            <div>
              <strong>Test in Sandbox</strong>
              <p className="text-gray-500">
                Use <code>sandbox.api.aivo.dev/v2</code> to validate your integration.
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-portal-primary text-white text-xs flex items-center justify-center font-semibold">
              4
            </span>
            <div>
              <strong>Switch Production Traffic</strong>
              <p className="text-gray-500">
                Point your production client to <code>/public/v2/</code> and monitor for errors.
              </p>
            </div>
          </li>
        </ol>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Need Help?</h2>
        <ul className="text-sm space-y-1 text-gray-600">
          <li>
            Email:{' '}
            <a href="mailto:devs@aivolearning.com" className="text-portal-primary hover:underline">
              devs@aivolearning.com
            </a>
          </li>
          <li>
            Community:{' '}
            <a
              href="https://community.aivolearning.com"
              className="text-portal-primary hover:underline"
            >
              community.aivolearning.com
            </a>
          </li>
        </ul>
      </section>
    </div>
  );
}
