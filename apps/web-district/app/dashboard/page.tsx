/**
 * District Admin Dashboard
 *
 * Comprehensive dashboard for district administrators with:
 * - Overview metrics and KPIs
 * - Compliance tracking
 * - School performance analytics
 * - License management overview
 * - IEP compliance tracking
 * - Recent activity feed
 */

import Link from 'next/link';

import { resolveTenant } from '../../lib/tenant';

// Mock data - in production would fetch from API
const districtMetrics = {
  totalSchools: 14,
  pendingOnboarding: 2,
  totalStudents: 4523,
  totalTeachers: 312,
  activeIEPs: 487,
  complianceRate: 94.2,
  avgMastery: 76.8,
  licensesUsed: 4200,
  licensesTotal: 5000,
};

const schoolPerformance = [
  { id: '1', name: 'Lincoln Elementary', students: 420, mastery: 82, engagement: 88, iepCompliance: 100 },
  { id: '2', name: 'Washington Middle School', students: 680, mastery: 75, engagement: 79, iepCompliance: 95 },
  { id: '3', name: 'Jefferson High School', students: 890, mastery: 71, engagement: 72, iepCompliance: 88 },
  { id: '4', name: 'Roosevelt Elementary', students: 380, mastery: 85, engagement: 91, iepCompliance: 100 },
  { id: '5', name: 'Adams Middle School', students: 520, mastery: 79, engagement: 84, iepCompliance: 92 },
];

const complianceItems = [
  { id: '1', school: 'Jefferson High', item: 'IEP Review Overdue', count: 3, severity: 'high', dueDate: '2026-01-15' },
  { id: '2', school: 'Washington Middle', item: 'Missing Progress Reports', count: 5, severity: 'medium', dueDate: '2026-01-20' },
  { id: '3', school: 'Adams Middle', item: 'Evaluation Timeline', count: 2, severity: 'medium', dueDate: '2026-01-25' },
];

const recentActivity = [
  { id: '1', type: 'iep', action: 'IEP Approved', school: 'Lincoln Elementary', user: 'Dr. Sarah Johnson', time: '10 min ago' },
  { id: '2', type: 'user', action: 'New Teacher Added', school: 'Roosevelt Elementary', user: 'Admin', time: '1 hour ago' },
  { id: '3', type: 'compliance', action: 'Compliance Report Generated', school: 'District-wide', user: 'System', time: '2 hours ago' },
  { id: '4', type: 'license', action: '50 Licenses Allocated', school: 'Jefferson High', user: 'Admin', time: '3 hours ago' },
  { id: '5', type: 'alert', action: 'Data Sync Completed', school: 'All Schools', user: 'System', time: '5 hours ago' },
];

const upcomingDeadlines = [
  { id: '1', title: 'Q2 Compliance Report Due', date: '2026-01-31', type: 'report' },
  { id: '2', title: 'Annual IEP Audit', date: '2026-02-15', type: 'audit' },
  { id: '3', title: 'License Renewal', date: '2026-03-01', type: 'license' },
  { id: '4', title: 'State Reporting Deadline', date: '2026-03-15', type: 'report' },
];

export default async function DashboardPage() {
  const tenant = await resolveTenant();
  const licensePercent = (districtMetrics.licensesUsed / districtMetrics.licensesTotal) * 100;

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">District Dashboard</h1>
          <p className="text-sm text-gray-500">
            Overview of district performance, compliance, and resources
          </p>
        </div>
        <div className="flex items-center gap-3">
          {tenant && (
            <div className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-700">
              {tenant.name}
            </div>
          )}
          <Link
            href="/reports"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Generate Report
          </Link>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Schools"
          value={districtMetrics.totalSchools}
          subtitle={`${districtMetrics.pendingOnboarding} pending onboarding`}
          icon="🏫"
          color="blue"
        />
        <MetricCard
          title="Total Students"
          value={districtMetrics.totalStudents.toLocaleString()}
          subtitle={`${districtMetrics.totalTeachers} teachers`}
          icon="👥"
          color="green"
        />
        <MetricCard
          title="Active IEPs"
          value={districtMetrics.activeIEPs}
          subtitle={`${districtMetrics.complianceRate}% compliance`}
          icon="📋"
          color="purple"
          trend={districtMetrics.complianceRate >= 95 ? 'up' : 'down'}
        />
        <MetricCard
          title="Avg Mastery"
          value={`${districtMetrics.avgMastery}%`}
          subtitle="Across all subjects"
          icon="📊"
          color="amber"
        />
      </div>

      {/* License Usage Bar */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium text-gray-900">License Usage</h3>
          <span className="text-sm text-gray-500">
            {districtMetrics.licensesUsed.toLocaleString()} / {districtMetrics.licensesTotal.toLocaleString()} seats used
          </span>
        </div>
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              licensePercent > 90 ? 'bg-red-500' : licensePercent > 75 ? 'bg-amber-500' : 'bg-green-500'
            }`}
            style={{ width: `${licensePercent}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-xs text-gray-500">
          <span>{Math.round(licensePercent)}% utilized</span>
          <Link href="/billing" className="text-indigo-600 hover:underline">
            Manage Licenses →
          </Link>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* School Performance - 2 columns */}
        <div className="lg:col-span-2">
          <div className="rounded-lg border border-gray-200 bg-white">
            <div className="flex items-center justify-between border-b border-gray-200 p-4">
              <h2 className="font-semibold text-gray-900">School Performance</h2>
              <Link href="/schools" className="text-sm text-indigo-600 hover:underline">
                View All Schools
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left p-3 text-xs font-medium text-gray-500 uppercase">School</th>
                    <th className="text-center p-3 text-xs font-medium text-gray-500 uppercase">Students</th>
                    <th className="text-center p-3 text-xs font-medium text-gray-500 uppercase">Mastery</th>
                    <th className="text-center p-3 text-xs font-medium text-gray-500 uppercase">Engagement</th>
                    <th className="text-center p-3 text-xs font-medium text-gray-500 uppercase">IEP Compliance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {schoolPerformance.map((school) => (
                    <tr key={school.id} className="hover:bg-gray-50">
                      <td className="p-3">
                        <Link href={`/schools/${school.id}`} className="font-medium text-gray-900 hover:text-indigo-600">
                          {school.name}
                        </Link>
                      </td>
                      <td className="p-3 text-center text-gray-600">{school.students}</td>
                      <td className="p-3 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          school.mastery >= 80 ? 'bg-green-100 text-green-700' :
                          school.mastery >= 70 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {school.mastery}%
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          school.engagement >= 80 ? 'bg-green-100 text-green-700' :
                          school.engagement >= 70 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {school.engagement}%
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          school.iepCompliance >= 95 ? 'bg-green-100 text-green-700' :
                          school.iepCompliance >= 90 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {school.iepCompliance}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Compliance Alerts */}
        <div>
          <div className="rounded-lg border border-gray-200 bg-white">
            <div className="flex items-center justify-between border-b border-gray-200 p-4">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <span className="text-amber-500">⚠️</span> Compliance Alerts
              </h2>
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                {complianceItems.length}
              </span>
            </div>
            <div className="divide-y divide-gray-200">
              {complianceItems.map((item) => (
                <div key={item.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start gap-3">
                    <div className={`mt-1 w-2 h-2 rounded-full ${
                      item.severity === 'high' ? 'bg-red-500' : 'bg-amber-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{item.item}</p>
                      <p className="text-sm text-gray-500">{item.school} - {item.count} items</p>
                      <p className="text-xs text-gray-400 mt-1">Due: {item.dueDate}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-gray-200">
              <Link href="/compliance" className="text-sm text-indigo-600 hover:underline block text-center">
                View All Compliance Items
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Activity & Deadlines */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-200 p-4">
            <h2 className="font-semibold text-gray-900">Recent Activity</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="p-4 flex items-start gap-3">
                <div className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                  activity.type === 'iep' ? 'bg-purple-100 text-purple-600' :
                  activity.type === 'user' ? 'bg-blue-100 text-blue-600' :
                  activity.type === 'compliance' ? 'bg-green-100 text-green-600' :
                  activity.type === 'license' ? 'bg-amber-100 text-amber-600' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {activity.type === 'iep' && '📋'}
                  {activity.type === 'user' && '👤'}
                  {activity.type === 'compliance' && '✓'}
                  {activity.type === 'license' && '🔑'}
                  {activity.type === 'alert' && '🔔'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">{activity.action}</p>
                  <p className="text-sm text-gray-500">{activity.school}</p>
                </div>
                <span className="text-xs text-gray-400">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Deadlines */}
        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-200 p-4">
            <h2 className="font-semibold text-gray-900">📅 Upcoming Deadlines</h2>
            <Link href="/calendar" className="text-sm text-indigo-600 hover:underline">
              View Calendar
            </Link>
          </div>
          <div className="divide-y divide-gray-200">
            {upcomingDeadlines.map((deadline) => (
              <div key={deadline.id} className="p-4 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  deadline.type === 'report' ? 'bg-blue-100 text-blue-600' :
                  deadline.type === 'audit' ? 'bg-purple-100 text-purple-600' :
                  'bg-amber-100 text-amber-600'
                }`}>
                  {deadline.type === 'report' && '📄'}
                  {deadline.type === 'audit' && '🔍'}
                  {deadline.type === 'license' && '🔑'}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{deadline.title}</p>
                  <p className="text-sm text-gray-500">{deadline.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="mb-4 font-semibold text-gray-900">Quick Actions</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAction href="/schools" icon="🏫" title="Manage Schools" description="Add, edit, or remove schools" />
          <QuickAction href="/analytics" icon="📊" title="View Analytics" description="District-wide performance data" />
          <QuickAction href="/compliance" icon="✓" title="Compliance Center" description="IEP and regulatory compliance" />
          <QuickAction href="/billing" icon="💳" title="Billing & Licenses" description="Manage subscriptions and seats" />
        </div>
      </div>
    </section>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  icon,
  color,
  trend,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: string;
  color: 'blue' | 'green' | 'purple' | 'amber';
  trend?: 'up' | 'down';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200',
    green: 'bg-green-50 border-green-200',
    purple: 'bg-purple-50 border-purple-200',
    amber: 'bg-amber-50 border-amber-200',
  };

  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color]}`}>
      <div className="flex items-center justify-between">
        <span className="text-2xl">{icon}</span>
        {trend && (
          <span className={`text-xs font-medium ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
            {trend === 'up' ? '↑' : '↓'}
          </span>
        )}
      </div>
      <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-600">{title}</p>
      <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
    </div>
  );
}

function QuickAction({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-4 transition-all hover:shadow-md hover:border-indigo-300"
    >
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="font-medium text-gray-900">{title}</p>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
    </Link>
  );
}
