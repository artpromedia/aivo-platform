'use client';

import { Badge, Button, Card, GradeThemeToggle, Heading, useGradeTheme } from '@aivo/ui-web';

const schools = [
  { name: 'Maple Elementary', students: 420, status: 'Active' },
  { name: 'Cedar Middle School', students: 610, status: 'Active' },
  { name: 'Pineview Academy', students: 180, status: 'Pending' },
  { name: 'Riverside High', students: 920, status: 'Active' },
];

const statusTone: Record<string, 'success' | 'warning' | 'neutral'> = {
  Active: 'success',
  Pending: 'warning',
};

export default function SchoolsPage() {
  const { grade, labels } = useGradeTheme();

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Heading kicker="Roster" className="text-headline font-semibold">
          Schools
        </Heading>
        <div className="flex flex-wrap items-center gap-2">
          <GradeThemeToggle />
          <Button variant="primary">Add School</Button>
        </div>
      </div>

      <Card
        title="School roster"
        subtitle={`Theme: ${labels[grade] ?? grade}`}
        action={<Button variant="ghost">Export</Button>}
      >
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-surface-muted text-muted">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">School</th>
                <th className="px-4 py-3 text-left font-semibold">Students</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface">
              {schools.map((school) => (
                <tr key={school.name} className="transition hover:bg-surface-muted/80">
                  <td className="px-4 py-3 text-text">{school.name}</td>
                  <td className="px-4 py-3 text-muted">{school.students.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <Badge tone={statusTone[school.status] ?? 'neutral'}>{school.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" className="px-3 py-1 text-xs font-semibold">
                      Manage
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  );
}
