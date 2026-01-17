'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Minus, Eye } from 'lucide-react';
import type { PerformanceMetrics } from '@/lib/api/analytics-api';

interface StudentPerformanceTableProps {
  students: PerformanceMetrics[];
  classId: string;
}

export function StudentPerformanceTable({ students, classId }: StudentPerformanceTableProps) {
  const router = useRouter();
  const [sortBy, setSortBy] = useState<keyof PerformanceMetrics>('overallScore');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: keyof PerformanceMetrics) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const sortedStudents = [...students].sort((a, b) => {
    const aValue = a[sortBy];
    const bValue = b[sortBy];
    const multiplier = sortOrder === 'asc' ? 1 : -1;

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return (aValue - bValue) * multiplier;
    }
    return 0;
  });

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-400" />;
    }
  };

  const getPerformanceBadge = (score: number) => {
    if (score >= 90) return <Badge className="bg-green-600">Excellent</Badge>;
    if (score >= 80) return <Badge className="bg-blue-600">Good</Badge>;
    if (score >= 70) return <Badge className="bg-yellow-600">Satisfactory</Badge>;
    return <Badge variant="destructive">Needs Improvement</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Student Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student Name</TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted"
                  onClick={() => handleSort('overallScore')}
                >
                  Overall Score
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted"
                  onClick={() => handleSort('averageGrade')}
                >
                  Average Grade
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted"
                  onClick={() => handleSort('assignmentsCompleted')}
                >
                  Assignments
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted"
                  onClick={() => handleSort('attendanceRate')}
                >
                  Attendance
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted"
                  onClick={() => handleSort('engagementScore')}
                >
                  Engagement
                </TableHead>
                <TableHead>Trend</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedStudents.map((student) => (
                <TableRow key={student.studentId}>
                  <TableCell className="font-medium">{student.studentName}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{student.overallScore.toFixed(1)}%</span>
                      {getPerformanceBadge(student.overallScore)}
                    </div>
                  </TableCell>
                  <TableCell>{student.averageGrade.toFixed(1)}%</TableCell>
                  <TableCell>
                    {student.assignmentsCompleted}/{student.assignmentsTotal}
                  </TableCell>
                  <TableCell>{student.attendanceRate.toFixed(1)}%</TableCell>
                  <TableCell>{student.engagementScore.toFixed(1)}%</TableCell>
                  <TableCell>{getTrendIcon(student.improvementTrend)}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/dashboard/analytics/student/${student.studentId}`)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
