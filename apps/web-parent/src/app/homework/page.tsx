/**
 * Homework Helper Page
 *
 * Full view of all homework helper sessions for the child.
 * Parents can see what their child has been working on and review transcripts.
 */

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow, format } from 'date-fns';
import {
  BookOpenCheck,
  Clock,
  CheckCircle,
  ArrowLeft,
  Search,
  Calendar,
  MessageSquare,
  ChevronRight,
  BookOpen,
  Calculator,
  Beaker,
  PenTool,
  Globe,
} from 'lucide-react';

import { api } from '@/lib/api';
import {
  isDevMode,
  getMockHomeworkSessions,
  type MockHomeworkSession,
} from '@/lib/mock-data';

const subjectIcons: Record<string, React.ReactNode> = {
  Math: <Calculator className="w-5 h-5" />,
  Reading: <BookOpen className="w-5 h-5" />,
  Science: <Beaker className="w-5 h-5" />,
  Writing: <PenTool className="w-5 h-5" />,
  'Social Studies': <Globe className="w-5 h-5" />,
};

const subjectColors: Record<string, { bg: string; text: string; border: string }> = {
  Math: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  Reading: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  Science: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  Writing: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  'Social Studies': { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' },
};

export default function HomeworkPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'in-progress' | 'completed'>('all');
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [selectedSession, setSelectedSession] = useState<MockHomeworkSession | null>(null);

  // Mock student ID - in real app, this would come from context or URL
  const studentId = 'student-1';

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['homework-sessions', studentId],
    queryFn: async () => {
      try {
        const data = await api.get<MockHomeworkSession[]>(
          `/parent/homework/students/${studentId}`
        );
        return data;
      } catch (error) {
        if (isDevMode()) {
          console.warn('[DEV] Using mock homework sessions data');
          return getMockHomeworkSessions(studentId);
        }
        throw error;
      }
    },
    retry: isDevMode() ? 0 : 3,
  });

  // Filter sessions
  const filteredSessions = sessions.filter((session) => {
    // Search filter
    if (searchQuery && !session.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    // Status filter
    if (filterStatus === 'in-progress' && session.completedAt) return false;
    if (filterStatus === 'completed' && !session.completedAt) return false;
    // Subject filter
    if (filterSubject !== 'all' && session.subject !== filterSubject) return false;
    return true;
  });

  // Get unique subjects for filter
  const subjects = Array.from(new Set(sessions.map((s) => s.subject)));

  // Stats
  const totalSessions = sessions.length;
  const completedSessions = sessions.filter((s) => s.completedAt).length;
  const inProgressSessions = sessions.filter((s) => !s.completedAt).length;

  if (selectedSession) {
    return (
      <SessionDetail
        session={selectedSession}
        onBack={() => setSelectedSession(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div className="flex items-center gap-2">
                <BookOpenCheck className="w-6 h-6 text-purple-600" />
                <h1 className="text-xl font-semibold text-gray-900">Homework Helper</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <BookOpenCheck className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Sessions</p>
                <p className="text-2xl font-bold text-gray-900">{totalSessions}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Completed</p>
                <p className="text-2xl font-bold text-gray-900">{completedSessions}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">In Progress</p>
                <p className="text-2xl font-bold text-gray-900">{inProgressSessions}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search sessions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>

            {/* Subject Filter */}
            <select
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">All Subjects</option>
              {subjects.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Sessions List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-100 text-center">
            <BookOpenCheck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No sessions found</h3>
            <p className="text-gray-500">
              {searchQuery || filterStatus !== 'all' || filterSubject !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Sessions will appear here when your child uses the homework helper'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                onClick={() => setSelectedSession(session)}
              />
            ))}
          </div>
        )}
      </main>

      {/* DEV Mode Indicator */}
      {isDevMode() && (
        <div className="fixed bottom-4 right-4 bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-medium">
          DEV MODE - Mock Data
        </div>
      )}
    </div>
  );
}

function SessionCard({
  session,
  onClick,
}: {
  session: MockHomeworkSession;
  onClick: () => void;
}) {
  const isCompleted = !!session.completedAt;
  const colors = subjectColors[session.subject] || {
    bg: 'bg-gray-50',
    text: 'text-gray-700',
    border: 'border-gray-200',
  };

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-purple-200 transition-all group"
    >
      <div className="flex items-start gap-4">
        {/* Subject Icon */}
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colors.bg} ${colors.text}`}>
          {subjectIcons[session.subject] || <BookOpenCheck className="w-5 h-5" />}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${colors.bg} ${colors.text}`}>
              {session.subject}
            </span>
            {isCompleted ? (
              <span className="flex items-center gap-1 text-xs text-green-600">
                <CheckCircle className="w-3 h-3" />
                Completed
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-amber-600">
                <Clock className="w-3 h-3" />
                In Progress
              </span>
            )}
          </div>
          <h3 className="font-medium text-gray-900 mb-2">{session.title}</h3>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {formatDistanceToNow(new Date(session.startedAt), { addSuffix: true })}
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare className="w-4 h-4" />
              {session.stepsCompleted} / {session.totalSteps} steps
            </span>
          </div>
          {/* Progress Bar */}
          <div className="mt-3">
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 rounded-full transition-all"
                style={{ width: `${session.progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Arrow */}
        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-purple-600 transition-colors" />
      </div>
    </button>
  );
}

function SessionDetail({
  session,
  onBack,
}: {
  session: MockHomeworkSession;
  onBack: () => void;
}) {
  const isCompleted = !!session.completedAt;
  const colors = subjectColors[session.subject] || {
    bg: 'bg-gray-50',
    text: 'text-gray-700',
    border: 'border-gray-200',
  };

  // Mock conversation transcript
  const mockTranscript = [
    {
      role: 'student',
      message: `I need help with ${session.title}`,
      time: session.startedAt,
    },
    {
      role: 'aivo',
      message: `Of course! Let's break this problem down together. What do you already know about ${session.subject.toLowerCase()}?`,
      time: new Date(new Date(session.startedAt).getTime() + 60000).toISOString(),
    },
    {
      role: 'student',
      message: "I know the basics but I'm stuck on this part.",
      time: new Date(new Date(session.startedAt).getTime() + 120000).toISOString(),
    },
    {
      role: 'aivo',
      message: "Great! Let's approach this step by step. First, let me guide you through the key concepts...",
      time: new Date(new Date(session.startedAt).getTime() + 180000).toISOString(),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors mr-4"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex-1">
              <h1 className="text-lg font-semibold text-gray-900">{session.title}</h1>
              <p className="text-sm text-gray-500">{session.subject}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Session Info Card */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
          <div className="flex items-start gap-4">
            <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${colors.bg} ${colors.text}`}>
              {subjectIcons[session.subject] || <BookOpenCheck className="w-8 h-8" />}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {isCompleted ? (
                  <span className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
                    <CheckCircle className="w-4 h-4" />
                    Completed
                  </span>
                ) : (
                  <span className="flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-700 text-sm font-medium rounded-full">
                    <Clock className="w-4 h-4" />
                    In Progress
                  </span>
                )}
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">{session.title}</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Started</p>
                  <p className="font-medium text-gray-900">
                    {format(new Date(session.startedAt), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
                {session.completedAt && (
                  <div>
                    <p className="text-gray-500">Completed</p>
                    <p className="font-medium text-gray-900">
                      {format(new Date(session.completedAt), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-gray-500">Progress</p>
                  <p className="font-medium text-gray-900">
                    {session.stepsCompleted} / {session.totalSteps} steps ({session.progress}%)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Conversation Transcript */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-purple-500" />
              Session Transcript
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Review how AIVO guided your child through this homework
            </p>
          </div>
          <div className="p-4 space-y-4">
            {mockTranscript.map((item, index) => (
              <div
                key={index}
                className={`flex ${item.role === 'student' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    item.role === 'student'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="text-sm">{item.message}</p>
                  <p
                    className={`text-xs mt-1 ${
                      item.role === 'student' ? 'text-purple-200' : 'text-gray-500'
                    }`}
                  >
                    {format(new Date(item.time), 'h:mm a')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
