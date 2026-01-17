'use client';

import { useStudentProgress, useStudentSubjectPerformance, useStudentComparison } from '@/hooks/use-analytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Line, Radar } from 'react-chartjs-2';
import { CheckCircle2, TrendingUp, Award } from 'lucide-react';
import type { Chart as ChartJS } from 'chart.js';

interface StudentAnalyticsDetailProps {
  studentId: string;
  studentName: string;
  classId: string;
}

export function StudentAnalyticsDetail({ studentId, studentName, classId }: StudentAnalyticsDetailProps) {
  const { data: progress, isLoading: progressLoading } = useStudentProgress(studentId);
  const { data: subjectPerformance, isLoading: subjectLoading } = useStudentSubjectPerformance(studentId);
  const { data: comparison, isLoading: comparisonLoading } = useStudentComparison(studentId, classId);

  const isLoading = progressLoading || subjectLoading || comparisonLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Progress timeline chart data
  const timelineData = progress?.timeline
    ? {
        labels: progress.timeline.map((t) => new Date(t.date).toLocaleDateString()),
        datasets: [
          {
            label: 'Score',
            data: progress.timeline.map((t) => t.score),
            borderColor: 'rgb(99, 102, 241)',
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            fill: true,
            tension: 0.4,
          },
        ],
      }
    : null;

  // Subject comparison radar chart
  const comparisonData = comparison
    ? {
        labels: comparison.subjects.map((s) => s.subject),
        datasets: [
          {
            label: studentName,
            data: comparison.subjects.map((s) => s.studentScore),
            backgroundColor: 'rgba(99, 102, 241, 0.2)',
            borderColor: 'rgb(99, 102, 241)',
            pointBackgroundColor: 'rgb(99, 102, 241)',
          },
          {
            label: 'Class Average',
            data: comparison.subjects.map((s) => s.classAverage),
            backgroundColor: 'rgba(156, 163, 175, 0.2)',
            borderColor: 'rgb(156, 163, 175)',
            pointBackgroundColor: 'rgb(156, 163, 175)',
          },
        ],
      }
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{studentName}</h2>
        <p className="text-muted-foreground">Detailed Performance Analytics</p>
      </div>

      {/* Progress Timeline */}
      {timelineData && (
        <Card>
          <CardHeader>
            <CardTitle>Progress Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <Line
                data={timelineData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        title: (items: any) => {
                          const index = items[0].dataIndex;
                          return progress?.timeline[index].assignment || '';
                        },
                        label: (context: any) => `Score: ${context.parsed.y.toFixed(1)}%`,
                      },
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      max: 100,
                      ticks: { callback: (value: any) => `${value}%` },
                    },
                  },
                }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subject Comparison */}
      {comparisonData && (
        <Card>
          <CardHeader>
            <CardTitle>Subject Performance Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <Radar
                data={comparisonData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    r: {
                      beginAtZero: true,
                      max: 100,
                      ticks: { callback: (value: any) => `${value}%` },
                    },
                  },
                }}
              />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              {comparison.subjects.map((subject) => (
                <div key={subject.subject} className="flex items-center justify-between p-2 border rounded">
                  <span className="font-medium">{subject.subject}</span>
                  <Badge variant={subject.percentile >= 75 ? 'default' : 'secondary'}>
                    {subject.percentile}th percentile
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Strengths */}
        {progress?.strengths && progress.strengths.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                Strengths
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {progress.strengths.map((strength, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Areas for Improvement */}
        {progress?.areasForImprovement && progress.areasForImprovement.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-orange-600" />
                Areas for Improvement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {progress.areasForImprovement.map((area, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <div className="h-5 w-5 rounded-full bg-orange-100 flex items-center justify-center mt-0.5">
                      <span className="text-orange-600 text-xs font-bold">{index + 1}</span>
                    </div>
                    <span>{area}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Milestones */}
      {progress?.milestones && progress.milestones.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-600" />
              Milestones Achieved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {progress.milestones.map((milestone) => (
                <div
                  key={milestone.id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-yellow-50"
                >
                  <div className="flex items-center gap-3">
                    <Award className="h-6 w-6 text-yellow-600" />
                    <div>
                      <p className="font-medium">{milestone.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(milestone.achievedDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline">{milestone.category}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
