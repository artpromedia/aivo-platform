'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bar } from 'react-chartjs-2';
import type { SubjectPerformance } from '@/lib/api/analytics-api';

interface SubjectBreakdownChartProps {
  subjects: SubjectPerformance[];
}

export function SubjectBreakdownChart({ subjects }: SubjectBreakdownChartProps) {
  const chartData = {
    labels: subjects.map((s) => s.subject),
    datasets: [
      {
        label: 'Average Score',
        data: subjects.map((s) => s.averageScore),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1,
      },
      {
        label: 'Completion Rate',
        data: subjects.map((s) => (s.assignmentsCompleted / s.assignmentsTotal) * 100),
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: 'rgb(34, 197, 94)',
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const label = context.dataset.label || '';
            const value = context.parsed.y.toFixed(1);
            return `${label}: ${value}%`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          callback: (value: any) => `${value}%`,
        },
      },
    },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subject Performance Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]">
          <Bar data={chartData} options={options} />
        </div>
      </CardContent>
    </Card>
  );
}
