const flags = [
  { key: 'ai_tutor_beta', description: 'Enable AI tutor beta', status: 'On' },
  { key: 'guardian_reports_v2', description: 'New guardian report PDFs', status: 'Off' },
  { key: 'multi_language_alpha', description: 'Alpha translation pipeline', status: 'On' },
];

export default function FlagsPage() {
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Feature Flags</h1>
      <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Key</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Description
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {flags.map((flag) => (
              <tr key={flag.key}>
                <td className="px-4 py-3 text-sm font-mono text-slate-800">{flag.key}</td>
                <td className="px-4 py-3 text-sm text-slate-700">{flag.description}</td>
                <td className="px-4 py-3 text-sm">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      flag.status === 'On'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {flag.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
