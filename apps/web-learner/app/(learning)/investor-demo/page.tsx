'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// Simulated real-time data for demo
const generateDemoMetrics = () => ({
  totalStudents: 12847,
  activeStudents: 8934,
  sessionsToday: 3421,
  avgEngagement: 87.3,
  avgAccuracy: 82.1,
  goalProgress: 73.5,
  aiInteractions: 28493,
  timeInFlowState: 67.2,
});

const STUDENT_BRAIN_DEMO = {
  studentName: 'Emma Johnson',
  grade: '5th Grade',
  learningStyle: 'Visual-Kinesthetic',
  readingLevel: 4.7,
  mathLevel: 5.2,
  attentionSpan: 18,
  strengths: ['Pattern Recognition', 'Creative Thinking', 'Problem Decomposition'],
  challenges: ['Working Memory', 'Time Management'],
  currentGoals: [
    { name: 'Reading Comprehension', progress: 78, target: 'Grade 5.0 level' },
    { name: 'Math Word Problems', progress: 65, target: '80% accuracy' },
    { name: 'Focus Duration', progress: 85, target: '20 min sessions' },
  ],
  adaptations: [
    'Visual scaffolding for math problems',
    'Chunked reading passages',
    'Frequent micro-breaks (5 min intervals)',
    'Audio support available on-demand',
  ],
  recentActivity: {
    accuracy: 84,
    flowTime: 72,
    frustrationEvents: 1,
    questionsCompleted: 24,
  },
};

const ROI_METRICS = {
  totalInvestment: 2400000,
  totalBenefit: 4800000,
  roiPercentage: 100,
  paybackMonths: 8,
  costPerStudent: 186,
  benefitPerStudent: 373,
  timeSaved: 12400, // hours
  interventionReduction: 34, // percentage
  complianceCostAvoidance: 450000,
};

const SPECIAL_NEEDS_SUPPORT = [
  {
    name: 'Autism Support',
    icon: '🧩',
    features: ['Predictable routines', 'Visual supports', 'Sensory considerations', 'Social stories'],
    studentsServed: 1247,
    effectiveness: 89,
  },
  {
    name: 'ADHD Support',
    icon: '⚡',
    features: ['Gamification', 'Micro-breaks', 'Executive function scaffolding', 'Attention rewards'],
    studentsServed: 2341,
    effectiveness: 86,
  },
  {
    name: 'Dyslexia Intervention',
    icon: '📖',
    features: ['Multi-sensory learning', 'Phoneme awareness', 'Decodable text', 'Progress monitoring'],
    studentsServed: 1856,
    effectiveness: 91,
  },
  {
    name: 'Speech & Language',
    icon: '🗣️',
    features: ['Articulation therapy', 'Fluency practice', 'AAC integration', 'Pragmatic language'],
    studentsServed: 987,
    effectiveness: 88,
  },
];

const ANALYTICS_HIGHLIGHTS = [
  { label: 'At-Risk Detection Accuracy', value: '94.2%', trend: '+2.3%' },
  { label: 'Goal Completion Rate', value: '78.5%', trend: '+12.1%' },
  { label: 'Intervention Effectiveness', value: '86.3%', trend: '+5.7%' },
  { label: 'Parent Engagement', value: '72.4%', trend: '+18.9%' },
];

const COMPLIANCE_BADGES = [
  { name: 'FERPA', status: 'Compliant', icon: '🔒' },
  { name: 'COPPA', status: 'Compliant', icon: '👶' },
  { name: 'GDPR', status: 'Compliant', icon: '🇪🇺' },
  { name: 'IDEA 2004', status: 'Compliant', icon: '📋' },
  { name: 'Section 508', status: 'Compliant', icon: '♿' },
  { name: 'WCAG 2.1 AA', status: 'Compliant', icon: '🌐' },
];

export default function InvestorDemoPage() {
  const [metrics, setMetrics] = useState(generateDemoMetrics());
  const [activeTab, setActiveTab] = useState<'overview' | 'ai' | 'analytics' | 'special-needs' | 'compliance'>('overview');
  const [isLive, setIsLive] = useState(true);

  // Simulate real-time updates
  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => {
      setMetrics(prev => ({
        ...prev,
        activeStudents: prev.activeStudents + Math.floor(Math.random() * 10) - 5,
        sessionsToday: prev.sessionsToday + Math.floor(Math.random() * 3),
        aiInteractions: prev.aiInteractions + Math.floor(Math.random() * 15),
        avgEngagement: Math.min(100, Math.max(80, prev.avgEngagement + (Math.random() - 0.5) * 0.5)),
      }));
    }, 2000);
    return () => clearInterval(interval);
  }, [isLive]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-2xl shadow-lg">
                🚀
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">AIVO Platform</h1>
                <p className="text-sm text-purple-300">Investor Demo Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsLive(!isLive)}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                  isLive ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400'
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${isLive ? 'animate-pulse bg-green-400' : 'bg-slate-500'}`} />
                {isLive ? 'Live Data' : 'Paused'}
              </button>
              <Link
                href="/dashboard"
                className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20"
              >
                Exit Demo
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="border-b border-white/10 bg-black/10">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex gap-1">
            {[
              { id: 'overview', label: 'Overview', icon: '📊' },
              { id: 'ai', label: 'Student Brain AI', icon: '🧠' },
              { id: 'analytics', label: 'Analytics & ROI', icon: '📈' },
              { id: 'special-needs', label: 'Special Needs', icon: '💜' },
              { id: 'compliance', label: 'Compliance', icon: '🔐' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition ${
                  activeTab === tab.id
                    ? 'border-purple-400 text-white'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Real-time Metrics */}
            <section>
              <h2 className="mb-6 text-lg font-semibold text-white">Real-Time Platform Metrics</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: 'Total Students', value: metrics.totalStudents.toLocaleString(), icon: '👥', color: 'from-blue-500 to-cyan-500' },
                  { label: 'Active Now', value: metrics.activeStudents.toLocaleString(), icon: '🟢', color: 'from-green-500 to-emerald-500' },
                  { label: 'Sessions Today', value: metrics.sessionsToday.toLocaleString(), icon: '📚', color: 'from-purple-500 to-pink-500' },
                  { label: 'AI Interactions', value: metrics.aiInteractions.toLocaleString(), icon: '🤖', color: 'from-orange-500 to-red-500' },
                ].map((metric) => (
                  <div key={metric.label} className="rounded-2xl bg-white/5 p-6 backdrop-blur-sm">
                    <div className="mb-4 flex items-center justify-between">
                      <span className="text-2xl">{metric.icon}</span>
                      <div className={`h-2 w-2 rounded-full bg-gradient-to-r ${metric.color} animate-pulse`} />
                    </div>
                    <div className="text-3xl font-bold text-white">{metric.value}</div>
                    <div className="text-sm text-slate-400">{metric.label}</div>
                  </div>
                ))}
              </div>
            </section>

            {/* Performance Gauges */}
            <section>
              <h2 className="mb-6 text-lg font-semibold text-white">Learning Performance</h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: 'Avg. Engagement', value: metrics.avgEngagement, suffix: '%', color: 'purple' },
                  { label: 'Avg. Accuracy', value: metrics.avgAccuracy, suffix: '%', color: 'blue' },
                  { label: 'Goal Progress', value: metrics.goalProgress, suffix: '%', color: 'green' },
                  { label: 'Time in Flow', value: metrics.timeInFlowState, suffix: '%', color: 'pink' },
                ].map((gauge) => (
                  <div key={gauge.label} className="rounded-2xl bg-white/5 p-6 backdrop-blur-sm">
                    <div className="mb-4 text-sm text-slate-400">{gauge.label}</div>
                    <div className="relative h-4 rounded-full bg-slate-700">
                      <div
                        className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${
                          gauge.color === 'purple' ? 'from-purple-500 to-pink-500' :
                          gauge.color === 'blue' ? 'from-blue-500 to-cyan-500' :
                          gauge.color === 'green' ? 'from-green-500 to-emerald-500' :
                          'from-pink-500 to-rose-500'
                        } transition-all duration-1000`}
                        style={{ width: `${gauge.value}%` }}
                      />
                    </div>
                    <div className="mt-2 text-2xl font-bold text-white">
                      {gauge.value.toFixed(1)}{gauge.suffix}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Quick Stats */}
            <section className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 p-6 backdrop-blur-sm">
                <h3 className="mb-4 text-lg font-semibold text-white">Platform Highlights</h3>
                <ul className="space-y-3">
                  {[
                    '76+ AI-powered learning services',
                    'Personalized Student Brain for each learner',
                    'Real-time adaptive difficulty adjustment',
                    'FERPA, COPPA, GDPR compliant',
                    'Evidence-based special education support',
                    'ROI tracking and board reporting',
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-slate-300">
                      <span className="text-green-400">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 p-6 backdrop-blur-sm">
                <h3 className="mb-4 text-lg font-semibold text-white">Key Differentiators</h3>
                <ul className="space-y-3">
                  {[
                    'Multi-provider AI (GPT-4 + Claude 3.5) with failover',
                    'K-anonymity privacy protection for analytics',
                    'Predictive at-risk student identification',
                    'Work-based learning & transition services',
                    'Self-determination curriculum (Wehmeyer model)',
                    'Model drift detection & auto-recalibration',
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-slate-300">
                      <span className="text-blue-400">★</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'ai' && (
          <div className="space-y-8">
            {/* Student Brain Demo */}
            <section className="rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 p-8 backdrop-blur-sm">
              <div className="mb-6 flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 text-3xl shadow-lg">
                  🧠
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Student Brain AI</h2>
                  <p className="text-purple-300">Personalized AI model per student</p>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-3">
                {/* Student Profile */}
                <div className="rounded-xl bg-white/5 p-6">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-pink-400 to-purple-400 text-lg font-bold text-white">
                      EJ
                    </div>
                    <div>
                      <div className="font-semibold text-white">{STUDENT_BRAIN_DEMO.studentName}</div>
                      <div className="text-sm text-slate-400">{STUDENT_BRAIN_DEMO.grade}</div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Learning Style</span>
                      <span className="text-purple-300">{STUDENT_BRAIN_DEMO.learningStyle}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Reading Level</span>
                      <span className="text-white">{STUDENT_BRAIN_DEMO.readingLevel}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Math Level</span>
                      <span className="text-white">{STUDENT_BRAIN_DEMO.mathLevel}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Attention Span</span>
                      <span className="text-white">{STUDENT_BRAIN_DEMO.attentionSpan} min</span>
                    </div>
                  </div>
                </div>

                {/* Strengths & Challenges */}
                <div className="rounded-xl bg-white/5 p-6">
                  <h4 className="mb-4 font-semibold text-white">AI-Identified Profile</h4>
                  <div className="mb-4">
                    <div className="mb-2 text-xs font-medium uppercase tracking-wider text-green-400">Strengths</div>
                    <div className="flex flex-wrap gap-2">
                      {STUDENT_BRAIN_DEMO.strengths.map((s) => (
                        <span key={s} className="rounded-full bg-green-500/20 px-3 py-1 text-xs text-green-300">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="mb-2 text-xs font-medium uppercase tracking-wider text-amber-400">Growth Areas</div>
                    <div className="flex flex-wrap gap-2">
                      {STUDENT_BRAIN_DEMO.challenges.map((c) => (
                        <span key={c} className="rounded-full bg-amber-500/20 px-3 py-1 text-xs text-amber-300">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Adaptations */}
                <div className="rounded-xl bg-white/5 p-6">
                  <h4 className="mb-4 font-semibold text-white">Active Adaptations</h4>
                  <ul className="space-y-2">
                    {STUDENT_BRAIN_DEMO.adaptations.map((a, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                        <span className="text-purple-400">→</span>
                        {a}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Goals Progress */}
              <div className="mt-6 rounded-xl bg-white/5 p-6">
                <h4 className="mb-4 font-semibold text-white">IEP Goal Progress</h4>
                <div className="grid gap-4 md:grid-cols-3">
                  {STUDENT_BRAIN_DEMO.currentGoals.map((goal) => (
                    <div key={goal.name} className="rounded-lg bg-white/5 p-4">
                      <div className="mb-2 text-sm font-medium text-white">{goal.name}</div>
                      <div className="mb-2 text-xs text-slate-400">Target: {goal.target}</div>
                      <div className="relative h-3 rounded-full bg-slate-700">
                        <div
                          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
                          style={{ width: `${goal.progress}%` }}
                        />
                      </div>
                      <div className="mt-1 text-right text-sm font-bold text-purple-300">{goal.progress}%</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Real-time Activity */}
              <div className="mt-6 grid gap-4 sm:grid-cols-4">
                {[
                  { label: 'Session Accuracy', value: `${STUDENT_BRAIN_DEMO.recentActivity.accuracy}%`, icon: '🎯' },
                  { label: 'Flow State Time', value: `${STUDENT_BRAIN_DEMO.recentActivity.flowTime}%`, icon: '🌊' },
                  { label: 'Frustration Events', value: STUDENT_BRAIN_DEMO.recentActivity.frustrationEvents, icon: '😤' },
                  { label: 'Questions Done', value: STUDENT_BRAIN_DEMO.recentActivity.questionsCompleted, icon: '✅' },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-xl bg-white/5 p-4 text-center">
                    <div className="text-2xl">{stat.icon}</div>
                    <div className="mt-2 text-xl font-bold text-white">{stat.value}</div>
                    <div className="text-xs text-slate-400">{stat.label}</div>
                  </div>
                ))}
              </div>
            </section>

            {/* AI Capabilities */}
            <section>
              <h2 className="mb-6 text-lg font-semibold text-white">AI Learning Capabilities</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { title: 'Adaptive Difficulty', desc: 'Real-time adjustment based on performance', icon: '📊' },
                  { title: 'Content Generation', desc: 'Personalized activities in <3 seconds', icon: '⚡' },
                  { title: 'IEP Alignment', desc: 'Activities mapped to individual goals', icon: '🎯' },
                  { title: 'Multi-Provider AI', desc: 'GPT-4 + Claude with automatic failover', icon: '🔄' },
                  { title: 'Emotion Detection', desc: '20+ emotions tracked with mastery', icon: '😊' },
                  { title: 'Drift Detection', desc: 'Auto-recalibration when models drift', icon: '📈' },
                ].map((cap) => (
                  <div key={cap.title} className="rounded-xl bg-white/5 p-6">
                    <div className="mb-3 text-3xl">{cap.icon}</div>
                    <h3 className="font-semibold text-white">{cap.title}</h3>
                    <p className="mt-1 text-sm text-slate-400">{cap.desc}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-8">
            {/* ROI Dashboard */}
            <section className="rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 p-8 backdrop-blur-sm">
              <div className="mb-6 flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 text-3xl shadow-lg">
                  💰
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">ROI Analytics</h2>
                  <p className="text-green-300">Return on Investment Dashboard</p>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl bg-white/5 p-6 text-center">
                  <div className="text-sm text-slate-400">Total Investment</div>
                  <div className="mt-2 text-3xl font-bold text-white">
                    ${(ROI_METRICS.totalInvestment / 1000000).toFixed(1)}M
                  </div>
                </div>
                <div className="rounded-xl bg-white/5 p-6 text-center">
                  <div className="text-sm text-slate-400">Total Benefit</div>
                  <div className="mt-2 text-3xl font-bold text-green-400">
                    ${(ROI_METRICS.totalBenefit / 1000000).toFixed(1)}M
                  </div>
                </div>
                <div className="rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 p-6 text-center">
                  <div className="text-sm text-green-300">ROI</div>
                  <div className="mt-2 text-4xl font-bold text-green-400">
                    +{ROI_METRICS.roiPercentage}%
                  </div>
                </div>
                <div className="rounded-xl bg-white/5 p-6 text-center">
                  <div className="text-sm text-slate-400">Payback Period</div>
                  <div className="mt-2 text-3xl font-bold text-white">
                    {ROI_METRICS.paybackMonths} months
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-6 md:grid-cols-3">
                <div className="rounded-xl bg-white/5 p-6">
                  <h4 className="mb-4 font-semibold text-white">Cost Breakdown</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Platform Licensing</span>
                      <span className="text-white">$1.2M</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Training</span>
                      <span className="text-white">$400K</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Implementation</span>
                      <span className="text-white">$500K</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Infrastructure</span>
                      <span className="text-white">$300K</span>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl bg-white/5 p-6">
                  <h4 className="mb-4 font-semibold text-white">Benefits Realized</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Improved Outcomes</span>
                      <span className="text-green-400">$2.1M</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Time Saved</span>
                      <span className="text-green-400">$1.4M</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Intervention Reduction</span>
                      <span className="text-green-400">$850K</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Compliance Savings</span>
                      <span className="text-green-400">$450K</span>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl bg-white/5 p-6">
                  <h4 className="mb-4 font-semibold text-white">Per Student</h4>
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm text-slate-400">Cost per Student</div>
                      <div className="text-2xl font-bold text-white">${ROI_METRICS.costPerStudent}</div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-400">Benefit per Student</div>
                      <div className="text-2xl font-bold text-green-400">${ROI_METRICS.benefitPerStudent}</div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Analytics Highlights */}
            <section>
              <h2 className="mb-6 text-lg font-semibold text-white">Analytics Highlights</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {ANALYTICS_HIGHLIGHTS.map((item) => (
                  <div key={item.label} className="rounded-xl bg-white/5 p-6">
                    <div className="text-sm text-slate-400">{item.label}</div>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-white">{item.value}</span>
                      <span className="text-sm font-medium text-green-400">{item.trend}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Predictive Analytics */}
            <section className="rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 p-8 backdrop-blur-sm">
              <h2 className="mb-6 text-xl font-bold text-white">Predictive Analytics</h2>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-xl bg-white/5 p-6">
                  <h4 className="mb-4 font-semibold text-white">At-Risk Detection</h4>
                  <p className="mb-4 text-sm text-slate-400">
                    ML model identifies students at risk before academic decline using multiple signals.
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Accuracy</span>
                      <span className="font-bold text-blue-400">94.2%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Early Detection Rate</span>
                      <span className="font-bold text-blue-400">2.3 weeks avg</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">False Positive Rate</span>
                      <span className="font-bold text-green-400">3.8%</span>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl bg-white/5 p-6">
                  <h4 className="mb-4 font-semibold text-white">Model Monitoring</h4>
                  <p className="mb-4 text-sm text-slate-400">
                    Continuous monitoring with automatic drift detection and recalibration.
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Models Active</span>
                      <span className="font-bold text-white">12</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Drift Detection</span>
                      <span className="font-bold text-green-400">Active</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Last Recalibration</span>
                      <span className="font-bold text-white">3 days ago</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'special-needs' && (
          <div className="space-y-8">
            {/* Special Needs Overview */}
            <section className="rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 p-8 backdrop-blur-sm">
              <div className="mb-6 flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 text-3xl shadow-lg">
                  💜
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Special Education Support</h2>
                  <p className="text-purple-300">Evidence-based interventions for diverse learners</p>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {SPECIAL_NEEDS_SUPPORT.map((support) => (
                  <div key={support.name} className="rounded-xl bg-white/5 p-6">
                    <div className="mb-4 flex items-center gap-3">
                      <span className="text-3xl">{support.icon}</span>
                      <div>
                        <h3 className="font-semibold text-white">{support.name}</h3>
                        <div className="text-sm text-slate-400">{support.studentsServed.toLocaleString()} students served</div>
                      </div>
                      <div className="ml-auto text-right">
                        <div className="text-2xl font-bold text-green-400">{support.effectiveness}%</div>
                        <div className="text-xs text-slate-400">effectiveness</div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {support.features.map((f) => (
                        <span key={f} className="rounded-full bg-purple-500/20 px-3 py-1 text-xs text-purple-300">
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Additional Services */}
            <section>
              <h2 className="mb-6 text-lg font-semibold text-white">Comprehensive Service Coverage</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { name: 'IEP Management', icon: '📋', count: '5,432 active IEPs' },
                  { name: 'Transition Services', icon: '🎓', count: '1,247 students' },
                  { name: 'SEL Programs', icon: '❤️', count: '8,934 enrolled' },
                  { name: 'Speech Therapy', icon: '🗣️', count: '987 students' },
                  { name: 'Executive Function', icon: '🧩', count: '2,341 students' },
                  { name: 'Vocational Training', icon: '💼', count: '456 students' },
                  { name: 'Self-Determination', icon: '⭐', count: '1,123 students' },
                  { name: 'Parent Coaching', icon: '👨‍👩‍👧', count: '3,456 families' },
                ].map((service) => (
                  <div key={service.name} className="rounded-xl bg-white/5 p-4">
                    <div className="mb-2 text-2xl">{service.icon}</div>
                    <div className="font-medium text-white">{service.name}</div>
                    <div className="text-sm text-slate-400">{service.count}</div>
                  </div>
                ))}
              </div>
            </section>

            {/* Research Foundation */}
            <section className="rounded-2xl bg-white/5 p-8">
              <h2 className="mb-6 text-xl font-bold text-white">Evidence-Based Foundation</h2>
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  { framework: 'CASEL Framework', area: 'Social-Emotional Learning' },
                  { framework: 'Wehmeyer Model', area: 'Self-Determination' },
                  { framework: 'Universal Design for Learning', area: 'Accessibility' },
                  { framework: 'Applied Behavior Analysis', area: 'Behavior Support' },
                  { framework: 'Kohler Transition Model', area: 'Career Readiness' },
                  { framework: 'Orton-Gillingham', area: 'Dyslexia Intervention' },
                ].map((research) => (
                  <div key={research.framework} className="rounded-lg bg-white/5 p-4">
                    <div className="font-semibold text-white">{research.framework}</div>
                    <div className="text-sm text-slate-400">{research.area}</div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'compliance' && (
          <div className="space-y-8">
            {/* Compliance Overview */}
            <section className="rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 p-8 backdrop-blur-sm">
              <div className="mb-6 flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 text-3xl shadow-lg">
                  🔐
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Compliance & Security</h2>
                  <p className="text-blue-300">Enterprise-grade data protection</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
                {COMPLIANCE_BADGES.map((badge) => (
                  <div key={badge.name} className="rounded-xl bg-white/5 p-4 text-center">
                    <div className="mb-2 text-3xl">{badge.icon}</div>
                    <div className="font-semibold text-white">{badge.name}</div>
                    <div className="mt-1 inline-block rounded-full bg-green-500/20 px-2 py-0.5 text-xs text-green-400">
                      {badge.status}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Security Features */}
            <section>
              <h2 className="mb-6 text-lg font-semibold text-white">Security Features</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { title: 'K-Anonymity Protection', desc: 'Minimum group sizes for all analytics', icon: '👥' },
                  { title: 'Data Minimization', desc: 'FERPA-compliant data collection', icon: '📊' },
                  { title: 'Parental Consent', desc: 'COPPA-compliant consent workflows', icon: '✅' },
                  { title: 'Right to Deletion', desc: 'GDPR Article 17 soft delete', icon: '🗑️' },
                  { title: 'Audit Logging', desc: 'Complete activity tracking', icon: '📝' },
                  { title: 'Encryption at Rest', desc: 'AES-256 for all stored data', icon: '🔒' },
                  { title: 'MFA Authentication', desc: 'TOTP multi-factor auth', icon: '🔑' },
                  { title: 'Role-Based Access', desc: 'Granular RBAC permissions', icon: '👤' },
                  { title: 'Virus Scanning', desc: 'ClamAV integration for uploads', icon: '🛡️' },
                ].map((feature) => (
                  <div key={feature.title} className="rounded-xl bg-white/5 p-6">
                    <div className="mb-3 text-3xl">{feature.icon}</div>
                    <h3 className="font-semibold text-white">{feature.title}</h3>
                    <p className="mt-1 text-sm text-slate-400">{feature.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Infrastructure */}
            <section className="rounded-2xl bg-white/5 p-8">
              <h2 className="mb-6 text-xl font-bold text-white">Enterprise Infrastructure</h2>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h4 className="mb-4 font-semibold text-white">Scalability</h4>
                  <ul className="space-y-2 text-sm text-slate-300">
                    <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Kubernetes orchestration</li>
                    <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Auto-scaling policies</li>
                    <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Blue-green deployments</li>
                    <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Multi-region support</li>
                  </ul>
                </div>
                <div>
                  <h4 className="mb-4 font-semibold text-white">Observability</h4>
                  <ul className="space-y-2 text-sm text-slate-300">
                    <li className="flex items-center gap-2"><span className="text-green-400">✓</span> OpenTelemetry tracing</li>
                    <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Prometheus metrics</li>
                    <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Grafana dashboards</li>
                    <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Real-time alerting</li>
                  </ul>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black/20 py-6">
        <div className="mx-auto max-w-7xl px-6 text-center text-sm text-slate-400">
          AIVO Platform Demo - Confidential - For Investor Presentation Only
        </div>
      </footer>
    </div>
  );
}
