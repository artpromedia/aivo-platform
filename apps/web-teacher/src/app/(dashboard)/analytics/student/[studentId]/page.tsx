import { StudentAnalyticsDetail } from '@/components/analytics/student-analytics-detail';

export default async function StudentAnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<{ name?: string; classId?: string }>;
}) {
  const { studentId } = await params;
  const { name, classId: classIdParam } = await searchParams;
  const studentName = name || 'Student';
  const classId = classIdParam || 'default-class';

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <StudentAnalyticsDetail
        studentId={studentId}
        studentName={studentName}
        classId={classId}
      />
    </div>
  );
}
