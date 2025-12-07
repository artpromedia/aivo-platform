const tenants = [
  { name: 'North Valley District', status: 'Active', learners: 4800 },
  { name: 'Lakeside Charter', status: 'Onboarding', learners: 1200 },
  { name: 'Metro Catholic', status: 'Suspended', learners: 900 },
];

export default function TenantsPage() {
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Tenants</h1>
      <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Tenant</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Learners</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {tenants.map((tenant) => (
              <tr key={tenant.name}>
                <td className="px-4 py-3 text-sm text-slate-800">{tenant.name}</td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {tenant.learners.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                    {tenant.status}
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
