'use client';

import { motion } from 'framer-motion';
import {
  Brain,
  Sparkles,
  MessageCircle,
  Target,
  CheckCircle2,
  TrendingUp,
  BarChart3,
  Award,
  Star,
  Users,
  Bell,
  BookOpen,
  Heart,
  Calendar,
} from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

/* ─────────────────────────────────────────────
   1. AI-Powered Tutoring Illustration
   ───────────────────────────────────────────── */
export function AITutoringIllustration() {
  return (
    <div className="relative w-full aspect-[4/3] bg-white rounded-3xl border border-gray-100 shadow-soft overflow-hidden p-6">
      {/* Chat Interface Mockup */}
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
          <motion.div
            className="w-10 h-10 bg-gradient-to-br from-theme-primary-500 to-theme-primary-600 rounded-full flex items-center justify-center"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Brain className="w-5 h-5 text-white" />
          </motion.div>
          <div>
            <div className="text-sm font-semibold text-gray-900">Virtual Brain AI</div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-green-400 rounded-full" />
              <span className="text-xs text-gray-500">Active &bull; Adapting to your style</span>
            </div>
          </div>
          <motion.div
            className="ml-auto"
            animate={{ rotate: [0, 15, -15, 0] }}
            transition={{ duration: 3, repeat: Infinity, delay: 1 }}
          >
            <Sparkles className="w-5 h-5 text-theme-primary-400" />
          </motion.div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 py-4 space-y-3 overflow-hidden">
          {/* Student message */}
          <motion.div
            className="flex justify-end"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="bg-theme-primary-500 text-white rounded-2xl rounded-tr-md px-4 py-2.5 max-w-[75%]">
              <p className="text-sm">I don&apos;t understand fractions 😕</p>
            </div>
          </motion.div>

          {/* AI response */}
          <motion.div
            className="flex gap-2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 }}
          >
            <div className="w-7 h-7 bg-theme-primary-100 rounded-full flex items-center justify-center shrink-0 mt-1">
              <Brain className="w-4 h-4 text-theme-primary-600" />
            </div>
            <div className="bg-gray-50 rounded-2xl rounded-tl-md px-4 py-2.5 max-w-[75%]">
              <p className="text-sm text-gray-700">
                Let&apos;s use pizza slices! 🍕 If you have 8 slices and eat 3...
              </p>
            </div>
          </motion.div>

          {/* Visual learning card */}
          <motion.div
            className="flex gap-2"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.3 }}
          >
            <div className="w-7 h-7 shrink-0" />
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl px-4 py-3 max-w-[80%]">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-semibold text-amber-700">Visual Mode Activated</span>
              </div>
              {/* Pizza fraction visual */}
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12">
                  <svg viewBox="0 0 48 48" className="w-full h-full">
                    <circle cx="24" cy="24" r="22" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="2" />
                    <motion.path
                      d="M24 24 L24 2 A22 22 0 0 1 43.8 14.5 Z"
                      fill="#F59E0B"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.6 }}
                      transition={{ delay: 1.8 }}
                    />
                    <motion.path
                      d="M24 24 L43.8 14.5 A22 22 0 0 1 46 24 Z"
                      fill="#F59E0B"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.6 }}
                      transition={{ delay: 2.0 }}
                    />
                    <motion.path
                      d="M24 24 L46 24 A22 22 0 0 1 43.8 33.5 Z"
                      fill="#F59E0B"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.6 }}
                      transition={{ delay: 2.2 }}
                    />
                  </svg>
                </div>
                <motion.div
                  className="text-sm font-bold text-amber-800"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 2.4 }}
                >
                  3/8 eaten &rarr; 5/8 left!
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Typing indicator */}
        <motion.div
          className="flex items-center gap-2 pt-3 border-t border-gray-100"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.6 }}
        >
          <MessageCircle className="w-4 h-4 text-gray-400" />
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="w-1.5 h-1.5 bg-gray-400 rounded-full"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </div>
          <span className="text-xs text-gray-400 ml-1">AI is adapting response...</span>
        </motion.div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   2. IEP Goal Management Illustration
   ───────────────────────────────────────────── */
export function IEPGoalIllustration() {
  const goals = [
    { label: 'Reading Fluency', progress: 85, color: 'bg-theme-primary-500', target: 'Q2 Target', status: 'On Track' },
    { label: 'Math Problem Solving', progress: 62, color: 'bg-accent-500', target: 'Q2 Target', status: 'In Progress' },
    { label: 'Written Expression', progress: 94, color: 'bg-mint-500', target: 'Q1 Target', status: 'Exceeded' },
  ];

  return (
    <div className="relative w-full aspect-[4/3] bg-white rounded-3xl border border-gray-100 shadow-soft overflow-hidden p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-accent-100 rounded-lg flex items-center justify-center">
            <Target className="w-4 h-4 text-accent-600" />
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900">IEP Goals Dashboard</div>
            <div className="text-xs text-gray-500">Updated 2 hours ago</div>
          </div>
        </div>
        <motion.div
          className="px-2.5 py-1 bg-mint-100 text-mint-700 rounded-full text-xs font-medium"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          3 Active Goals
        </motion.div>
      </div>

      {/* Goal Cards */}
      <div className="space-y-3">
        {goals.map((goal, index) => (
          <motion.div
            key={goal.label}
            className="p-3 bg-gray-50 rounded-xl border border-gray-100"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + index * 0.2 }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-900">{goal.label}</span>
              <span className={cn(
                'text-xs font-medium px-2 py-0.5 rounded-full',
                goal.status === 'Exceeded' && 'bg-mint-100 text-mint-700',
                goal.status === 'On Track' && 'bg-theme-primary-100 text-theme-primary-700',
                goal.status === 'In Progress' && 'bg-amber-100 text-amber-700',
              )}>
                {goal.status}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                  className={cn('h-full rounded-full', goal.color)}
                  initial={{ width: 0 }}
                  animate={{ width: `${goal.progress}%` }}
                  transition={{ duration: 1, delay: 0.5 + index * 0.2, ease: 'easeOut' }}
                />
              </div>
              <motion.span
                className="text-sm font-bold text-gray-900 tabular-nums w-10 text-right"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 + index * 0.2 }}
              >
                {goal.progress}%
              </motion.span>
            </div>
            <div className="flex items-center gap-1 mt-1.5">
              <Calendar className="w-3 h-3 text-gray-400" />
              <span className="text-xs text-gray-400">{goal.target}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Bottom action */}
      <motion.div
        className="mt-4 flex items-center justify-between p-3 bg-accent-50 rounded-xl border border-accent-200"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.4 }}
      >
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-accent-600" />
          <span className="text-xs font-medium text-accent-700">Auto-synced with school IEP system</span>
        </div>
        <motion.div
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        >
          <TrendingUp className="w-4 h-4 text-accent-500" />
        </motion.div>
      </motion.div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   3. Progress Tracking Illustration
   ───────────────────────────────────────────── */
export function ProgressTrackingIllustration() {
  const barData = [
    { label: 'Mon', height: 45, color: 'bg-theme-primary-400' },
    { label: 'Tue', height: 65, color: 'bg-theme-primary-500' },
    { label: 'Wed', height: 40, color: 'bg-theme-primary-400' },
    { label: 'Thu', height: 80, color: 'bg-theme-primary-500' },
    { label: 'Fri', height: 70, color: 'bg-theme-primary-500' },
    { label: 'Sat', height: 55, color: 'bg-theme-primary-400' },
    { label: 'Sun', height: 90, color: 'bg-mint-500' },
  ];

  const subjects = [
    { name: 'Math', score: 92, change: '+5', color: 'bg-theme-primary-500' },
    { name: 'Reading', score: 88, change: '+12', color: 'bg-accent-500' },
    { name: 'Science', score: 76, change: '+8', color: 'bg-mint-500' },
  ];

  return (
    <div className="relative w-full aspect-[4/3] bg-white rounded-3xl border border-gray-100 shadow-soft overflow-hidden p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-mint-100 rounded-lg flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-mint-600" />
          </div>
          <div className="text-sm font-semibold text-gray-900">Weekly Progress</div>
        </div>
        <div className="flex items-center gap-1 px-2.5 py-1 bg-mint-50 rounded-full">
          <TrendingUp className="w-3.5 h-3.5 text-mint-600" />
          <span className="text-xs font-bold text-mint-700">+18%</span>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="flex items-end justify-between gap-2 h-28 mb-4 px-1">
        {barData.map((bar, index) => (
          <div key={bar.label} className="flex flex-col items-center gap-1 flex-1">
            <motion.div
              className={cn('w-full rounded-t-md', bar.color)}
              style={{ minWidth: '8px' }}
              initial={{ height: 0 }}
              animate={{ height: `${bar.height}%` }}
              transition={{ duration: 0.6, delay: 0.2 + index * 0.08, ease: 'easeOut' }}
            />
            <span className="text-[10px] text-gray-400 font-medium">{bar.label}</span>
          </div>
        ))}
      </div>

      {/* Subject Scores */}
      <div className="space-y-2">
        {subjects.map((subject, index) => (
          <motion.div
            key={subject.name}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 + index * 0.15 }}
          >
            <div className={cn('w-2 h-2 rounded-full', subject.color)} />
            <span className="text-sm text-gray-700 flex-1">{subject.name}</span>
            <span className="text-sm font-bold text-gray-900 tabular-nums">{subject.score}%</span>
            <span className="text-xs font-medium text-mint-600 bg-mint-50 px-1.5 py-0.5 rounded">
              {subject.change}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Achievement popup */}
      <motion.div
        className="absolute bottom-4 right-4 flex items-center gap-2 px-3 py-2 bg-white rounded-xl shadow-lg border border-gray-100"
        initial={{ opacity: 0, scale: 0.8, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: 1.5, type: 'spring', stiffness: 200 }}
      >
        <motion.div
          animate={{ rotate: [0, -10, 10, -10, 0] }}
          transition={{ duration: 0.5, delay: 2, repeat: Infinity, repeatDelay: 3 }}
        >
          <Award className="w-5 h-5 text-amber-500" />
        </motion.div>
        <div>
          <div className="text-xs font-semibold text-gray-900">New High Score!</div>
          <div className="text-[10px] text-gray-500">Math: 92% 🎉</div>
        </div>
      </motion.div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   4. Parent Dashboard Illustration
   ───────────────────────────────────────────── */
export function ParentDashboardIllustration() {
  const activities = [
    { icon: BookOpen, label: 'Completed "Fraction Basics"', time: '10 min ago', color: 'bg-theme-primary-100 text-theme-primary-600' },
    { icon: Star, label: 'Earned Gold Star in Reading', time: '25 min ago', color: 'bg-amber-100 text-amber-600' },
    { icon: Target, label: 'IEP Goal: 85% achieved', time: '1 hr ago', color: 'bg-accent-100 text-accent-600' },
    { icon: Heart, label: 'Focus score improved to 94%', time: '2 hrs ago', color: 'bg-rose-100 text-rose-600' },
  ];

  return (
    <div className="relative w-full aspect-[4/3] bg-white rounded-3xl border border-gray-100 shadow-soft overflow-hidden p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-sky-100 rounded-lg flex items-center justify-center">
            <Users className="w-4 h-4 text-sky-600" />
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900">Parent Dashboard</div>
            <div className="text-xs text-gray-500">Emma&apos;s Activity Today</div>
          </div>
        </div>
        <motion.div
          className="relative"
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
        >
          <Bell className="w-5 h-5 text-gray-400" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
        </motion.div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { label: 'Time Today', value: '1h 45m', color: 'text-theme-primary-600' },
          { label: 'Lessons', value: '4', color: 'text-accent-600' },
          { label: 'Streak', value: '12 days', color: 'text-mint-600' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            className="text-center p-2 bg-gray-50 rounded-xl"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.1 }}
          >
            <div className={cn('text-lg font-bold', stat.color)}>{stat.value}</div>
            <div className="text-[10px] text-gray-500">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Activity Feed */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Recent Activity</div>
        {activities.map((activity, index) => {
          const Icon = activity.icon;
          return (
            <motion.div
              key={activity.label}
              className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + index * 0.15 }}
            >
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', activity.color)}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-gray-900 truncate">{activity.label}</div>
                <div className="text-[10px] text-gray-400">{activity.time}</div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Teacher message notification */}
      <motion.div
        className="absolute bottom-4 left-4 right-4 flex items-center gap-3 px-4 py-3 bg-theme-primary-50 rounded-xl border border-theme-primary-200"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.4, type: 'spring', stiffness: 200 }}
      >
        <div className="w-8 h-8 bg-theme-primary-200 rounded-full flex items-center justify-center text-theme-primary-700 text-xs font-bold shrink-0">
          MR
        </div>
        <div className="min-w-0">
          <div className="text-xs font-semibold text-theme-primary-900">Ms. Rodriguez</div>
          <div className="text-xs text-theme-primary-700 truncate">&quot;Emma did great in math today!&quot;</div>
        </div>
      </motion.div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Export map for easy lookup
   ───────────────────────────────────────────── */
export const featureIllustrations: Record<string, React.ComponentType> = {
  'AI-Powered Tutoring': AITutoringIllustration,
  'IEP Goal Management': IEPGoalIllustration,
  'Progress Tracking': ProgressTrackingIllustration,
  'Parent Dashboard': ParentDashboardIllustration,
};
