'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface PerformanceDistributionChartProps {
  data: {
    excellent: number;
    good: number;
    satisfactory: number;
    needsImprovement: number;
  };
}

export function PerformanceDistributionChart({ data }: PerformanceDistributionChartProps) {
  const chartData = {
    labels: ['Excellent\n(90-100)', 'Good\n(80-89)', 'Satisfactory\n(70-79)', 'Needs Improvement\n(<70)'],
    datasets: [
      {
        label: 'Number of Students',
        data: [data.excellent, data.good, data.satisfactory, data.needsImprovement],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)', // green
          'rgba(59, 130, 246, 0.8)', // blue
          'rgba(251, 191, 36, 0.8)', // yellow
          'rgba(239, 68, 68, 0.8)', // red
        ],
        borderColor: [
          'rgb(34, 197, 94)',
          'rgb(59, 130, 246)',
          'rgb(251, 191, 36)',
          'rgb(239, 68, 68)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const total = data.excellent + data.good + data.satisfactory + data.needsImprovement;
            const percentage = ((context.parsed.y / total) * 100).toFixed(1);
            return `${context.parsed.y} students (${percentage}%)`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
      },
    },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <Bar data={chartData} options={options} />
        </div>
      </CardContent>
    </Card>
  );
}
