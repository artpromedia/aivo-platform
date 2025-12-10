import { Card, Heading, Button } from '@aivo/ui-web';
import Link from 'next/link';

export default function HomePage() {
  return (
    <section className="space-y-6">
      <Heading kicker="Welcome" className="text-headline font-semibold">
        Teacher Dashboard
      </Heading>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card title="My Classrooms" subtitle="View and manage your classes">
          <p className="text-muted text-sm mb-4">
            Access class rosters, assignments, and student progress.
          </p>
          <Link href="/classrooms">
            <Button variant="primary">View Classrooms</Button>
          </Link>
        </Card>

        <Card title="Analytics" subtitle="Track student engagement">
          <p className="text-muted text-sm mb-4">
            See how your students are progressing and identify who needs support.
          </p>
          <Link href="/classrooms">
            <Button variant="secondary">View Analytics</Button>
          </Link>
        </Card>

        <Card title="Planning" subtitle="Lesson planning tools">
          <p className="text-muted text-sm mb-4">
            Create and organize lessons aligned with learning goals.
          </p>
          <Button variant="ghost" disabled>
            Coming Soon
          </Button>
        </Card>
      </div>
    </section>
  );
}
