import { Card, Heading, Button } from '@aivo/ui-web';
import Link from 'next/link';

// Mock classrooms for demo
const classrooms = [
  { id: 'class-1', name: 'Math 101 - Period 3', students: 25, grade: '5th Grade' },
  { id: 'class-2', name: 'Math 101 - Period 4', students: 28, grade: '5th Grade' },
  { id: 'class-3', name: 'Algebra I - Period 1', students: 22, grade: '6th Grade' },
];

export default function ClassroomsPage() {
  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <Heading kicker="My Classes" className="text-headline font-semibold">
          Classrooms
        </Heading>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {classrooms.map((classroom) => (
          <Card
            key={classroom.id}
            title={classroom.name}
            subtitle={`${classroom.grade} • ${classroom.students} students`}
          >
            <div className="flex gap-2 mt-4">
              <Link href={`/classrooms/${classroom.id}/analytics`}>
                <Button variant="primary" className="text-sm">
                  View Analytics
                </Button>
              </Link>
              <Button variant="ghost" className="text-sm">
                Roster
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
