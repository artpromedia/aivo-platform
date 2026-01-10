/**
 * Real-Time Student Monitor Component
 *
 * Shows live status of students currently working, with accuracy meters,
 * progress tracking, and pulsing activity indicators.
 * Inspired by aivo-agentic-ai-learning-app/apps/teacher-portal/src/components/StudentActivityStatus.tsx
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Activity,
  Users,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Circle,
  Eye,
  MessageSquare,
} from 'lucide-react';

interface ActiveStudent {
  id: string;
  name: string;
  avatar?: string;
  subject: string;
  activity: string;
  accuracy: number;
  questionsCompleted: number;
  totalQuestions: number;
  timeActive: number; // minutes
  status: 'active' | 'idle' | 'struggling' | 'excelling';
  lastAction: string;
}

interface RealTimeMonitorProps {
  classId?: string;
  students?: ActiveStudent[];
  refreshInterval?: number;
  onStudentClick?: (student: ActiveStudent) => void;
  onSendMessage?: (studentId: string) => void;
}

// Mock data for development
const mockActiveStudents: ActiveStudent[] = [
  {
    id: 'student-1',
    name: 'Emma Johnson',
    subject: 'Math',
    activity: 'Fraction Operations',
    accuracy: 92,
    questionsCompleted: 8,
    totalQuestions: 12,
    timeActive: 15,
    status: 'excelling',
    lastAction: 'Answered correctly',
  },
  {
    id: 'student-2',
    name: 'Liam Chen',
    subject: 'Math',
    activity: 'Fraction Operations',
    accuracy: 65,
    questionsCompleted: 5,
    totalQuestions: 12,
    timeActive: 18,
    status: 'struggling',
    lastAction: 'Requested hint',
  },
  {
    id: 'student-3',
    name: 'Sophia Martinez',
    subject: 'Reading',
    activity: 'Comprehension Quiz',
    accuracy: 78,
    questionsCompleted: 6,
    totalQuestions: 10,
    timeActive: 12,
    status: 'active',
    lastAction: 'Reading passage',
  },
  {
    id: 'student-4',
    name: 'Noah Williams',
    subject: 'Science',
    activity: 'Plant Life Cycles',
    accuracy: 85,
    questionsCompleted: 4,
    totalQuestions: 8,
    timeActive: 8,
    status: 'active',
    lastAction: 'Watching video',
  },
  {
    id: 'student-5',
    name: 'Olivia Brown',
    subject: 'Math',
    activity: 'Fraction Operations',
    accuracy: 0,
    questionsCompleted: 0,
    totalQuestions: 12,
    timeActive: 3,
    status: 'idle',
    lastAction: 'No activity',
  },
];

export function RealTimeMonitor({
  classId,
  students = mockActiveStudents,
  refreshInterval = 5000,
  onStudentClick,
  onSendMessage,
}: RealTimeMonitorProps) {
  const [activeStudents, setActiveStudents] = useState<ActiveStudent[]>(students);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isLive, setIsLive] = useState(true);

  // Simulate real-time updates
  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      setActiveStudents(prev =>
        prev.map(student => ({
          ...student,
          timeActive: student.timeActive + Math.round(refreshInterval / 60000),
          accuracy: Math.min(100, Math.max(0, student.accuracy + (Math.random() - 0.5) * 2)),
        }))
      );
      setLastUpdated(new Date());
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [isLive, refreshInterval]);

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 80) return 'text-green-600 bg-green-100';
    if (accuracy >= 60) return 'text-amber-600 bg-amber-100';
    return 'text-red-600 bg-red-100';
  };

  const getStatusIndicator = (status: ActiveStudent['status']) => {
    switch (status) {
      case 'excelling':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'struggling':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'idle':
        return <Circle className="w-4 h-4 text-gray-400" />;
      default:
        return <Circle className="w-4 h-4 text-blue-500 fill-blue-500" />;
    }
  };

  const activeCount = activeStudents.filter(s => s.status !== 'idle').length;
  const strugglingCount = activeStudents.filter(s => s.status === 'struggling').length;
  const avgAccuracy = Math.round(
    activeStudents.reduce((sum, s) => sum + s.accuracy, 0) / activeStudents.length
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Activity className="w-5 h-5 text-indigo-600" />
              {isLive && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              )}
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Live Classroom</h2>
              <p className="text-xs text-gray-500">
                Updated {lastUpdated.toLocaleTimeString()}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsLive(!isLive)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              isLive
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {isLive ? 'Live' : 'Paused'}
          </button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="p-2 bg-blue-50 rounded-lg text-center">
            <div className="flex items-center justify-center gap-1">
              <Users className="w-4 h-4 text-blue-600" />
              <span className="text-lg font-bold text-blue-700">{activeCount}</span>
            </div>
            <p className="text-xs text-blue-600">Active Now</p>
          </div>
          <div className="p-2 bg-green-50 rounded-lg text-center">
            <div className="flex items-center justify-center gap-1">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="text-lg font-bold text-green-700">{avgAccuracy}%</span>
            </div>
            <p className="text-xs text-green-600">Avg Accuracy</p>
          </div>
          <div className="p-2 bg-red-50 rounded-lg text-center">
            <div className="flex items-center justify-center gap-1">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span className="text-lg font-bold text-red-700">{strugglingCount}</span>
            </div>
            <p className="text-xs text-red-600">Need Help</p>
          </div>
        </div>
      </div>

      {/* Student List */}
      <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
        {activeStudents.map((student) => (
          <div
            key={student.id}
            className={`p-4 hover:bg-gray-50 transition-colors ${
              student.status === 'struggling' ? 'bg-red-50/50' : ''
            }`}
          >
            <div className="flex items-start gap-3">
              {/* Avatar with status */}
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-medium">
                  {student.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5">
                  {getStatusIndicator(student.status)}
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-gray-900 truncate">{student.name}</p>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getAccuracyColor(student.accuracy)}`}>
                    {student.accuracy}%
                  </span>
                </div>

                <p className="text-sm text-gray-600 truncate">
                  {student.subject}: {student.activity}
                </p>

                {/* Progress bar */}
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>{student.questionsCompleted}/{student.totalQuestions} questions</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {student.timeActive} min
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        student.status === 'excelling'
                          ? 'bg-green-500'
                          : student.status === 'struggling'
                          ? 'bg-red-500'
                          : 'bg-blue-500'
                      }`}
                      style={{ width: `${(student.questionsCompleted / student.totalQuestions) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Last action */}
                <p className="text-xs text-gray-400 mt-1 italic">
                  {student.lastAction}
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => onStudentClick?.(student)}
                  className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  title="View details"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onSendMessage?.(student.id)}
                  className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  title="Send message"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-3 bg-gray-50 border-t border-gray-100 rounded-b-xl">
        <p className="text-xs text-gray-500 text-center">
          {activeStudents.length} students in this session
        </p>
      </div>
    </div>
  );
}

export default RealTimeMonitor;
