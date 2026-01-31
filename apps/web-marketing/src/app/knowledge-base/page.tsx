import { Brain, Target, Shield, Zap, Award, CheckCircle } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { Footer } from '@/components/shared/footer';
import { Navigation } from '@/components/shared/navigation';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = {
  title: 'Knowledge Base | AIVO Learning',
  description:
    'Comprehensive knowledge base about AIVO Learning: what we are, how we work, our technology, supported conditions, evidence base, and key differentiators.',
  openGraph: {
    title: 'AIVO Learning Knowledge Base',
    description:
      'Everything you need to know about AI-powered personalized learning for neurodiverse students',
  },
};

export default function KnowledgeBase() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navigation />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-b from-blue-50 to-white py-16">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="mx-auto max-w-4xl text-center">
              <Badge className="mb-4">Knowledge Base</Badge>
              <h1 className="mb-4 text-4xl font-bold text-slate-900 sm:text-5xl">
                Everything About AIVO Learning
              </h1>
              <p className="text-lg text-slate-600">
                Comprehensive information about our AI-powered personalized learning platform for
                neurodiverse K-12 students
              </p>
            </div>
          </div>
        </section>

        {/* What is AIVO */}
        <section className="py-16">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="mx-auto max-w-4xl">
              <div className="mb-12">
                <div className="mb-6 flex items-center gap-3">
                  <Brain className="h-8 w-8 text-purple-600" />
                  <h2 className="text-3xl font-bold text-slate-900">What is AIVO?</h2>
                </div>
                <div className="space-y-4 text-lg text-slate-600">
                  <p>
                    <strong className="text-slate-900">AIVO Learning</strong> is an AI-powered
                    personalized learning platform specifically designed for neurodiverse K-12
                    students. We use advanced artificial intelligence to create individualized
                    learning experiences that adapt to how each student thinks, learns, and
                    processes information.
                  </p>
                  <p>
                    Our core innovation is the{' '}
                    <strong className="text-slate-900">Virtual Brain</strong> — a personalized AI
                    tutor that learns about each student&apos;s unique cognitive profile, learning
                    preferences, strengths, challenges, and interests. It then uses this knowledge
                    to deliver the right content, in the right format, at the right time, in the
                    right way.
                  </p>
                  <p>
                    AIVO serves students with ADHD, autism, dyslexia, dyscalculia, executive
                    function challenges, and other learning differences — as well as neurotypical
                    students who benefit from personalized learning.
                  </p>
                </div>
              </div>

              {/* Key Entities */}
              <div className="mb-12">
                <h3 className="mb-6 text-2xl font-bold text-slate-900">Key Concepts</h3>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="rounded-lg border bg-white p-6 shadow-sm">
                    <h4 className="mb-2 text-lg font-semibold text-slate-900">Virtual Brain</h4>
                    <p className="text-slate-600">
                      A personalized AI tutor that adapts to each student&apos;s unique learning
                      profile, tracks their progress, identifies patterns, and continuously
                      optimizes the learning experience. Think of it as a dedicated 1:1 tutor who
                      knows exactly how your child learns best.
                    </p>
                  </div>

                  <div className="rounded-lg border bg-white p-6 shadow-sm">
                    <h4 className="mb-2 text-lg font-semibold text-slate-900">
                      Neurodiverse Learner
                    </h4>
                    <p className="text-slate-600">
                      Students whose brains work differently from the &ldquo;typical&rdquo; model.
                      This includes ADHD, autism, dyslexia, dyscalculia, and other learning
                      differences. Neurodiversity recognizes these differences as natural human
                      variation, not deficits.
                    </p>
                  </div>

                  <div className="rounded-lg border bg-white p-6 shadow-sm">
                    <h4 className="mb-2 text-lg font-semibold text-slate-900">Adaptive Learning</h4>
                    <p className="text-slate-600">
                      Technology that automatically adjusts difficulty, pacing, content format, and
                      teaching approach based on student performance and preferences. AIVO&apos;s
                      adaptive engine makes real-time decisions about what to teach next and how.
                    </p>
                  </div>

                  <div className="rounded-lg border bg-white p-6 shadow-sm">
                    <h4 className="mb-2 text-lg font-semibold text-slate-900">
                      IEP (Individualized Education Program)
                    </h4>
                    <p className="text-slate-600">
                      A legally binding document for students receiving special education services.
                      AIVO tracks progress toward IEP goals, collects data for IEP meetings, and
                      aligns lessons with specific objectives.
                    </p>
                  </div>
                </div>
              </div>

              {/* Supported Conditions */}
              <div className="mb-12">
                <div className="mb-6 flex items-center gap-3">
                  <Target className="h-8 w-8 text-green-600" />
                  <h2 className="text-3xl font-bold text-slate-900">Supported Conditions</h2>
                </div>

                <div className="space-y-6">
                  {[
                    {
                      name: 'ADHD (Attention-Deficit/Hyperactivity Disorder)',
                      description:
                        'Challenges with attention, focus, impulse control, and executive function',
                      features: [
                        'Focus mode with distraction blocking',
                        'Micro-learning sessions (5-15 minutes)',
                        'Frequent breaks and movement prompts',
                        'Visual timers and progress tracking',
                        'Gamification for motivation',
                      ],
                    },
                    {
                      name: 'Autism Spectrum Disorder (ASD)',
                      description:
                        'Differences in social communication, sensory processing, and routines',
                      features: [
                        'Predictable structure and visual schedules',
                        'Clear, explicit instructions',
                        'Sensory-friendly interface options',
                        'Social skills practice modules',
                        'Reduced cognitive overload',
                      ],
                    },
                    {
                      name: 'Dyslexia',
                      description:
                        'Difficulties with reading, spelling, and phonological processing',
                      features: [
                        'Text-to-speech with synchronized highlighting',
                        'Dyslexia-friendly fonts (OpenDyslexic)',
                        'Audio-first content delivery',
                        'Multi-sensory reading instruction',
                        'Phonics-based approach',
                      ],
                    },
                    {
                      name: 'Dyscalculia',
                      description: 'Challenges with number sense, math concepts, and calculation',
                      features: [
                        'Visual representations of numbers',
                        'Concrete-to-abstract progression',
                        'Number line and manipulatives',
                        'Real-world application examples',
                        'Step-by-step scaffolding',
                      ],
                    },
                  ].map((condition) => (
                    <div key={condition.name} className="rounded-lg border bg-white p-6 shadow-sm">
                      <h3 className="mb-2 text-xl font-bold text-slate-900">{condition.name}</h3>
                      <p className="mb-4 text-slate-600">{condition.description}</p>
                      <div>
                        <h4 className="mb-2 font-semibold text-slate-900">AIVO Features:</h4>
                        <ul className="space-y-2">
                          {condition.features.map((feature) => (
                            <li key={feature} className="flex items-start gap-2">
                              <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
                              <span className="text-slate-600">{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* How AIVO Works */}
              <div className="mb-12">
                <div className="mb-6 flex items-center gap-3">
                  <Zap className="h-8 w-8 text-yellow-600" />
                  <h2 className="text-3xl font-bold text-slate-900">How AIVO Works</h2>
                </div>

                <div className="space-y-6">
                  <div className="rounded-lg border-l-4 border-purple-600 bg-purple-50 p-6">
                    <h3 className="mb-2 text-lg font-bold text-slate-900">1. Initial Assessment</h3>
                    <p className="text-slate-600">
                      AIVO begins with diagnostic assessments to understand the student&apos;s
                      current knowledge, learning preferences, and cognitive profile. This takes
                      20-30 minutes.
                    </p>
                  </div>

                  <div className="rounded-lg border-l-4 border-purple-600 bg-purple-50 p-6">
                    <h3 className="mb-2 text-lg font-bold text-slate-900">
                      2. Virtual Brain Creation
                    </h3>
                    <p className="text-slate-600">
                      The system creates a personalized Virtual Brain — an AI model unique to that
                      student. It incorporates assessment results, IEP goals, learning preferences,
                      and any known diagnoses.
                    </p>
                  </div>

                  <div className="rounded-lg border-l-4 border-purple-600 bg-purple-50 p-6">
                    <h3 className="mb-2 text-lg font-bold text-slate-900">
                      3. Personalized Learning Path
                    </h3>
                    <p className="text-slate-600">
                      The Virtual Brain generates a customized learning path with the right sequence
                      of topics, appropriate difficulty level, and optimal content formats (video,
                      text, interactive, etc.).
                    </p>
                  </div>

                  <div className="rounded-lg border-l-4 border-purple-600 bg-purple-50 p-6">
                    <h3 className="mb-2 text-lg font-bold text-slate-900">
                      4. Continuous Adaptation
                    </h3>
                    <p className="text-slate-600">
                      As the student learns, the Virtual Brain continuously refines its
                      understanding. It adjusts difficulty, changes teaching approaches, and
                      identifies patterns in real-time.
                    </p>
                  </div>

                  <div className="rounded-lg border-l-4 border-purple-600 bg-purple-50 p-6">
                    <h3 className="mb-2 text-lg font-bold text-slate-900">
                      5. Progress Monitoring
                    </h3>
                    <p className="text-slate-600">
                      Teachers and parents receive detailed insights about learning progress, skill
                      mastery, engagement patterns, and progress toward IEP goals through real-time
                      dashboards.
                    </p>
                  </div>
                </div>
              </div>

              {/* Key Differentiators */}
              <div className="mb-12">
                <div className="mb-6 flex items-center gap-3">
                  <Award className="h-8 w-8 text-blue-600" />
                  <h2 className="text-3xl font-bold text-slate-900">What Makes AIVO Different</h2>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="rounded-lg border bg-blue-50 p-6">
                    <h3 className="mb-2 text-lg font-bold text-slate-900">
                      Designed for Neurodiversity
                    </h3>
                    <p className="text-slate-600">
                      Unlike general learning platforms adapted for special ed, AIVO was built from
                      the ground up for neurodiverse learners with input from special educators,
                      parents, and students.
                    </p>
                  </div>

                  <div className="rounded-lg border bg-blue-50 p-6">
                    <h3 className="mb-2 text-lg font-bold text-slate-900">True Personalization</h3>
                    <p className="text-slate-600">
                      Most platforms offer adaptive difficulty. AIVO adapts content format, pacing,
                      teaching approach, engagement strategies, and more — truly understanding how
                      each brain learns.
                    </p>
                  </div>

                  <div className="rounded-lg border bg-blue-50 p-6">
                    <h3 className="mb-2 text-lg font-bold text-slate-900">IEP Integration</h3>
                    <p className="text-slate-600">
                      Built-in IEP goal tracking and data collection eliminates manual tracking.
                      Automatically aligns lessons with IEP objectives and generates progress
                      reports.
                    </p>
                  </div>

                  <div className="rounded-lg border bg-blue-50 p-6">
                    <h3 className="mb-2 text-lg font-bold text-slate-900">Evidence-Based Design</h3>
                    <p className="text-slate-600">
                      Built on Universal Design for Learning (UDL), differentiated instruction,
                      multi-sensory learning, cognitive load theory, and spaced repetition.
                    </p>
                  </div>
                </div>
              </div>

              {/* Compliance */}
              <div>
                <div className="mb-6 flex items-center gap-3">
                  <Shield className="h-8 w-8 text-green-600" />
                  <h2 className="text-3xl font-bold text-slate-900">Compliance & Standards</h2>
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                  <div className="rounded-lg border bg-white p-6 shadow-sm">
                    <h3 className="mb-4 text-lg font-bold text-slate-900">Privacy Laws</h3>
                    <ul className="space-y-2">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span className="text-slate-600">FERPA compliant</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span className="text-slate-600">COPPA compliant</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span className="text-slate-600">GDPR-ready</span>
                      </li>
                    </ul>
                  </div>

                  <div className="rounded-lg border bg-white p-6 shadow-sm">
                    <h3 className="mb-4 text-lg font-bold text-slate-900">Education Laws</h3>
                    <ul className="space-y-2">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span className="text-slate-600">IDEA aligned</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span className="text-slate-600">Section 504</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span className="text-slate-600">ADA compliant</span>
                      </li>
                    </ul>
                  </div>

                  <div className="rounded-lg border bg-white p-6 shadow-sm">
                    <h3 className="mb-4 text-lg font-bold text-slate-900">Accessibility</h3>
                    <ul className="space-y-2">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span className="text-slate-600">WCAG 2.1 Level AA</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span className="text-slate-600">Section 508</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span className="text-slate-600">UDL principles</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-gradient-to-r from-purple-600 to-blue-600 py-16">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="mb-4 text-3xl font-bold text-white">Ready to see AIVO in action?</h2>
              <p className="mb-8 text-lg text-purple-100">
                Schedule a personalized demo to see how AIVO can support your students
              </p>
              <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
                <Link
                  href="/demo"
                  className="rounded-lg bg-white px-8 py-3 font-semibold text-purple-600 hover:bg-purple-50"
                >
                  Schedule Demo
                </Link>
                <Link
                  href="/faq"
                  className="rounded-lg border-2 border-white px-8 py-3 font-semibold text-white hover:bg-white/10"
                >
                  View FAQ
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
