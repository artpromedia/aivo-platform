import { StudentAnalyticsDetail } from '@/components/analytics/student-analytics-detail';

export default function StudentAnalyticsPage({
  params,
  searchParams,
}: {
  params: { studentId: string };
  searchParams: { name?: string; classId?: string };
}) {
  const studentName = searchParams.name || 'Student';
  const classId = searchParams.classId || 'default-class';

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <StudentAnalyticsDetail
        studentId={params.studentId}
        studentName={studentName}
        classId={classId}
      />
    </div>
  );
}
