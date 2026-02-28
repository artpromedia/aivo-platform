'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Brain,
  ArrowLeft,
  CheckCircle2,
  Lightbulb,
  BookOpen,
  ChevronRight,
  Loader2,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────

interface SolutionStep {
  number: number;
  title: string;
  explanation: string;
  visual?: string;
}

interface RelatedLesson {
  id: string;
  title: string;
  href: string;
}

interface SolutionData {
  problem: string;
  subject: string;
  steps: SolutionStep[];
  relatedLessons: RelatedLesson[];
}

// ── Component ──────────────────────────────────────────────

export default function HomeworkSolvePage() {
  const router = useRouter();
  const [solution, setSolution] = useState<SolutionData | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('aivo_homework_solution');
      if (raw) {
        setSolution(JSON.parse(raw) as SolutionData);
      }
    } catch {
      /* ignore */
    }
  }, []);

  // No data — redirect back
  if (solution === null) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        <p className="text-sm text-gray-500">Loading solution…</p>
      </div>
    );
  }

  const { problem, subject, steps, relatedLessons } = solution;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/homework')}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Step-by-Step Solution</h1>
            <p className="text-xs text-gray-500 capitalize">{subject}</p>
          </div>
        </div>
      </div>

      {/* Original problem */}
      <div className="bg-indigo-50 rounded-2xl border border-indigo-100 p-5">
        <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide mb-1.5">
          Your Problem
        </p>
        <p className="text-sm text-gray-800 leading-relaxed">{problem}</p>
      </div>

      {/* Steps */}
      <div className="space-y-4">
        {steps.map((step) => (
          <div
            key={step.number}
            className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm"
          >
            <div className="flex items-start gap-3">
              {/* Step number badge */}
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm shrink-0 mt-0.5">
                {step.number}
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <h3 className="font-semibold text-gray-900">{step.title}</h3>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {step.explanation}
                </p>
                {step.visual && (
                  <div className="mt-3 rounded-xl bg-gray-50 border border-gray-200 p-4 text-sm text-gray-700 font-mono whitespace-pre-wrap">
                    {step.visual}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Completion marker */}
        {steps.length > 0 && (
          <div className="flex items-center gap-2 px-2 text-green-600">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm font-medium">All steps complete</span>
          </div>
        )}
      </div>

      {/* Need more help? */}
      <Link
        href={`/tutor?subject=${subject.toUpperCase()}`}
        className="flex items-center gap-4 p-5 rounded-2xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 hover:shadow-sm transition-shadow"
      >
        <div className="p-2.5 bg-white rounded-xl shadow-sm">
          <Lightbulb className="w-5 h-5 text-amber-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900">Need more help?</p>
          <p className="text-sm text-gray-500 mt-0.5">
            Chat with the AI Tutor for a deeper explanation
          </p>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
      </Link>

      {/* Related lessons */}
      {relatedLessons && relatedLessons.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Related Lessons
          </h2>
          <div className="grid gap-2">
            {relatedLessons.map((lesson) => (
              <Link
                key={lesson.id}
                href={lesson.href}
                className="flex items-center gap-3 p-3.5 bg-white rounded-xl border border-gray-100 hover:border-gray-200 transition-colors"
              >
                <BookOpen className="w-4 h-4 text-indigo-500 shrink-0" />
                <span className="text-sm font-medium text-gray-800 truncate">
                  {lesson.title}
                </span>
                <ChevronRight className="w-4 h-4 text-gray-300 shrink-0 ml-auto" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Try another */}
      <div className="text-center pb-4">
        <button
          onClick={() => router.push('/homework')}
          className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
        >
          ← Try another problem
        </button>
      </div>
    </div>
  );
}
