import { resolveTenant } from '../../lib/tenant';

export default async function DashboardPage() {
  const tenant = await resolveTenant();
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        {tenant && (
          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
            Tenant: {tenant.name}
          </div>
        )}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Active Schools</h2>
          <p className="text-sm text-slate-600">12 active / 2 pending onboarding</p>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Recent Activity</h2>
          <ul className="text-sm text-slate-700 list-disc pl-4">
            <li>IEP updates submitted</li>
            <li>New assessment templates published</li>
            <li>2 new therapist accounts approved</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
