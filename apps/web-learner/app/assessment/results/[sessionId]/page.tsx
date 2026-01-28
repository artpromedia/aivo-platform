'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import type { AssessmentResult } from '../../../../hooks/useAssessmentEngine';
import {
  StrengthsChart,
  WeaknessesChart,
  SubjectBreakdown,
  RecommendedPath,
  ShareResults,
} from '../components';

// Loading spinner component
function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--aivo-purple-50)] to-[var(--aivo-teal-50)] flex items-center justify-center">
      <div className="text-center">
        <div className="w-20 h-20 mx-auto bg-gradient-to-br from-[var(--aivo-teal-400)] to-[var(--aivo-brand-primary)] rounded-full flex items-center justify-center mb-4 animate-pulse">
          <Image src="/images/aivo-logo-horizontal-purple.svg" alt="AIVO" width={60} height={20} />
        </div>
        <p className="text-[var(--aivo-neutral-600)]">Loading your results...</p>
      </div>
    </div>
  );
}

export default function AssessmentResultsPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  const [results, setResults] = useState<AssessmentResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadResults();
  }, [sessionId]);

  const loadResults = async () => {
    try {
      // Try to fetch from API
      const response = await fetch(`/api/assessment/results/${sessionId}`);

      if (response.ok) {
        const data = await response.json();

        // Optionally get AI-generated insights
        try {
          const insightsResponse = await fetch('/api/ai/assessment-insights', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId }),
          });

          if (insightsResponse.ok) {
            const insights = await insightsResponse.json();
            setResults({ ...data, insights: { ...data.insights, ...insights } });
          } else {
            setResults(data);
          }
        } catch {
          setResults(data);
        }
      } else {
        // Fall back to local storage
        const storedResults = localStorage.getItem(`assessment_result_${sessionId}`);
        if (storedResults) {
          setResults(JSON.parse(storedResults));
        } else {
          // Generate mock results for demo
          setResults(generateMockResults(sessionId));
        }
      }
    } catch (err) {
      console.error('Error loading results:', err);
      // Try local storage fallback
      const storedResults = localStorage.getItem(`assessment_result_${sessionId}`);
      if (storedResults) {
        setResults(JSON.parse(storedResults));
      } else {
        setResults(generateMockResults(sessionId));
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error || !results) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[var(--aivo-purple-50)] to-[var(--aivo-teal-50)] flex items-center justify-center">
        <div className="text-center">
          <span className="text-6xl mb-4 block">😕</span>
          <h2 className="text-2xl font-bold text-[var(--aivo-brand-navy)] mb-2">
            Results Not Found
          </h2>
          <p className="text-[var(--aivo-neutral-600)] mb-4">
            {error || "We couldn't find your assessment results."}
          </p>
          <button
            onClick={() => {
              router.push('/dashboard');
            }}
            className="px-6 py-3 bg-[var(--aivo-brand-primary)] text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/icons/aivo-appicon-explorer.svg"
              alt="AIVO"
              width={40}
              height={40}
              className="rounded-lg"
            />
            <span className="font-semibold text-[var(--aivo-brand-navy)]">Assessment Results</span>
          </div>
          <ShareResults sessionId={sessionId} />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Celebration */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', duration: 0.5 }}
          className="text-center mb-12"
        >
          <motion.div
            animate={{ rotate: [0, -5, 5, 0] }}
            transition={{ repeat: 3, duration: 0.5, delay: 0.5 }}
            className="text-7xl mb-4"
          >
            🎉
          </motion.div>
          <h1 className="text-4xl md:text-5xl font-bold text-[var(--aivo-brand-navy)] mb-4">
            Amazing Work!
          </h1>
          <p className="text-xl text-[var(--aivo-neutral-600)]">
            You completed the assessment! Here&apos;s what we learned about you.
          </p>
        </motion.div>

        {/* Overall Score */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-3xl shadow-xl p-8 mb-8"
        >
          <div className="text-center">
            <div className="relative inline-block">
              <svg className="w-40 h-40" viewBox="0 0 100 100">
                {/* Background circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="var(--aivo-neutral-100)"
                  strokeWidth="10"
                />
                {/* Progress circle */}
                <motion.circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="url(#scoreGradient)"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={283}
                  initial={{ strokeDashoffset: 283 }}
                  animate={{ strokeDashoffset: 283 * (1 - results.overall_score / 100) }}
                  transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
                  transform="rotate(-90 50 50)"
                />
                <defs>
                  <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="var(--aivo-teal-400)" />
                    <stop offset="100%" stopColor="var(--aivo-brand-primary)" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1, duration: 0.3 }}
                  className="text-center"
                >
                  <span className="text-5xl font-bold text-[var(--aivo-brand-primary)]">
                    {results.overall_score}%
                  </span>
                </motion.div>
              </div>
            </div>
            <p className="text-xl text-[var(--aivo-neutral-600)] mt-4">Overall Performance</p>

            {/* Quick stats */}
            <div className="flex justify-center gap-8 mt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {results.insights?.strengths?.length || 0}
                </div>
                <div className="text-sm text-[var(--aivo-neutral-500)]">Strengths</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[var(--aivo-brand-primary)]">
                  {results.insights?.growth_areas?.length || 0}
                </div>
                <div className="text-sm text-[var(--aivo-neutral-500)]">Growth Areas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[var(--aivo-teal-500)]">
                  {Object.keys(results.subject_scores || {}).length}
                </div>
                <div className="text-sm text-[var(--aivo-neutral-500)]">Subjects</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Subject Breakdown and Strengths */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <SubjectBreakdown subjects={results.subject_scores} />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <StrengthsChart strengths={results.insights?.strengths || []} />
          </motion.div>
        </div>

        {/* Growth Areas */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-3xl shadow-xl p-8 mb-8"
        >
          <h2 className="text-2xl font-bold text-[var(--aivo-brand-navy)] mb-6 flex items-center gap-2">
            <span className="text-3xl">🌱</span>
            Areas to Grow
          </h2>
          <WeaknessesChart weaknesses={results.insights?.growth_areas || []} />
        </motion.div>

        {/* Recommended Path */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-gradient-to-r from-[var(--aivo-purple-100)] to-[var(--aivo-teal-100)] rounded-3xl p-8 mb-8"
        >
          <h2 className="text-2xl font-bold text-[var(--aivo-brand-navy)] mb-6 flex items-center gap-2">
            <span className="text-3xl">🗺️</span>
            Your Personalized Learning Path
          </h2>
          <RecommendedPath recommendations={results.insights?.recommended_path || []} />
        </motion.div>

        {/* Action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-4"
        >
          <button
            onClick={() => {
              router.push('/dashboard');
            }}
            className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-[var(--aivo-teal-500)] to-[var(--aivo-brand-primary)]
              text-white text-xl font-bold rounded-2xl shadow-lg hover:opacity-90 transition-all
              transform hover:scale-105"
          >
            Start Learning!
          </button>
          <button
            onClick={() => {
              router.push('/baseline/assessment');
            }}
            className="w-full sm:w-auto px-8 py-4 border-2 border-[var(--aivo-brand-primary)] text-[var(--aivo-brand-primary)]
              text-lg font-bold rounded-2xl hover:bg-[var(--aivo-purple-50)] transition-all"
          >
            Retake Assessment
          </button>
        </motion.div>
      </div>
    </div>
  );
}

// Generate mock results for demo/fallback
function generateMockResults(sessionId: string): AssessmentResult {
  return {
    sessionId,
    overall_score: 75,
    subject_scores: {
      math: {
        subject: 'math',
        score: 80,
        questionsAnswered: 5,
        correctAnswers: 4,
        averageLatency: 15000,
        proficiencyLevel: 'proficient',
      },
      reading: {
        subject: 'reading',
        score: 70,
        questionsAnswered: 5,
        correctAnswers: 3,
        averageLatency: 12000,
        proficiencyLevel: 'developing',
      },
      science: {
        subject: 'science',
        score: 85,
        questionsAnswered: 5,
        correctAnswers: 4,
        averageLatency: 18000,
        proficiencyLevel: 'proficient',
      },
      writing: {
        subject: 'writing',
        score: 65,
        questionsAnswered: 5,
        correctAnswers: 3,
        averageLatency: 20000,
        proficiencyLevel: 'developing',
      },
    },
    insights: {
      strengths: [
        {
          skill: 'science',
          subject: 'science',
          level: 85,
          description: 'Excellent understanding of scientific concepts',
        },
        {
          skill: 'math',
          subject: 'math',
          level: 80,
          description: 'Strong number sense and problem-solving skills',
        },
      ],
      growth_areas: [
        {
          skill: 'writing',
          subject: 'writing',
          level: 65,
          description: 'Practice writing clear sentences and paragraphs',
        },
        {
          skill: 'reading',
          subject: 'reading',
          level: 70,
          description: 'Build vocabulary and reading comprehension',
        },
      ],
      recommended_path: [
        {
          subject: 'writing',
          skill: 'grammar',
          priority: 'high',
          reason: 'Focus on sentence structure and grammar basics',
        },
        {
          subject: 'reading',
          skill: 'vocabulary',
          priority: 'medium',
          reason: 'Expand vocabulary through reading practice',
        },
        {
          subject: 'science',
          skill: 'advanced-concepts',
          priority: 'low',
          reason: 'Ready for more advanced science topics',
        },
      ],
      learning_style: 'visual',
      estimated_grade_level: 'Grade 3-4',
    },
    completedAt: new Date().toISOString(),
  };
}
