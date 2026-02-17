'use client';

import {
  BookOpen,
  ChevronLeft,
  HelpCircle,
  Info,
  FileText,
  TrendingUp,
  Shield,
  Download,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useIepTranslation } from '@/lib/hooks/useIepTranslation';

// Jargon glossary — terms that appear in IEP documents with plain-language definitions
const IEP_GLOSSARY: Record<string, string> = {
  IEP: 'Individualized Education Program — a written plan that describes the special education services your child will receive.',
  IDEA: 'Individuals with Disabilities Education Act — the federal law that guarantees special education services.',
  FAPE: "Free Appropriate Public Education — your child's right to a free education that meets their needs.",
  LRE: 'Least Restrictive Environment — your child should learn with non-disabled peers as much as possible.',
  'Present Levels':
    'A snapshot of how your child is doing right now in school — their strengths, challenges, and current skills.',
  PLAAFP:
    "Present Levels of Academic Achievement and Functional Performance — a detailed description of your child's current abilities.",
  'Annual Goals':
    'What the IEP team expects your child to achieve in one year with the right support.',
  Benchmark: 'A smaller, measurable step toward reaching a bigger goal.',
  'Related Services':
    'Extra support like speech therapy, occupational therapy, counseling, or transportation that helps your child benefit from special education.',
  Accommodation:
    'A change in HOW your child learns (e.g., extra time on tests, sitting in the front row). The work stays the same.',
  Modification:
    'A change in WHAT your child learns (e.g., fewer problems, different reading level). The work itself changes.',
  'Assistive Technology':
    'Any tool or device that helps your child learn — from simple (pencil grip) to complex (speech-generating device).',
  BIP: 'Behavior Intervention Plan — a plan with strategies to help your child replace challenging behaviors with positive ones.',
  FBA: 'Functional Behavior Assessment — a process to understand WHY a challenging behavior happens.',
  Transition:
    'Planning for life after high school — college, jobs, independent living. Required starting at age 16 (or earlier in some states).',
  ESY: 'Extended School Year — summer services for students who would significantly lose skills over long breaks.',
  'Due Process':
    'A formal way to resolve disagreements between parents and the school about special education services.',
  Mediation:
    'A free, voluntary meeting with a neutral person to help you and the school work out disagreements.',
  'Prior Written Notice':
    "The school must give you a written explanation BEFORE they change (or refuse to change) your child's IEP.",
  Reevaluation:
    "A review of your child's needs that happens at least every 3 years (or sooner if requested).",
  'Progress Monitoring':
    'Regular check-ins to see if your child is making progress toward their IEP goals.',
  SDI: "Specially Designed Instruction — teaching that is adapted specifically for your child's disability-related needs.",
  Consent:
    'Your written permission. The school needs your consent before evaluating your child or starting special education services.',
  'Eligibility Category':
    'The disability category that qualifies your child for special education (e.g., Specific Learning Disability, Autism, Speech/Language Impairment).',
  SLP: 'Speech-Language Pathologist — a specialist who helps children with speech, language, and communication challenges.',
  OT: 'Occupational Therapist — a specialist who helps children with fine motor skills, sensory processing, and daily living tasks.',
  PT: 'Physical Therapist — a specialist who helps children with gross motor skills, strength, and mobility.',
};

// Mock IEP data for display — will be replaced with API calls
interface PlainLanguageGoal {
  domain: string;
  officialText: string;
  plainText: string;
  currentProgress: number;
  target: number;
  whatItMeans: string;
  howToHelp: string;
}

interface PlainLanguageIEP {
  childName: string;
  grade: string;
  eligibility: string;
  eligibilityPlain: string;
  iepStartDate: string;
  iepEndDate: string;
  presentLevels: {
    category: string;
    officialText: string;
    plainText: string;
  }[];
  goals: PlainLanguageGoal[];
  services: {
    type: string;
    provider: string;
    frequency: string;
    plainExplanation: string;
  }[];
  accommodations: {
    name: string;
    plainExplanation: string;
  }[];
}

const mockIEP: PlainLanguageIEP = {
  childName: 'Alex',
  grade: '4th',
  eligibility: 'Specific Learning Disability (SLD)',
  eligibilityPlain:
    'Alex qualifies for special education because they have a learning difference that affects how they process and understand written language. This is not about intelligence — Alex is smart but needs different teaching approaches.',
  iepStartDate: '2025-01-15',
  iepEndDate: '2026-01-14',
  presentLevels: [
    {
      category: 'Reading',
      officialText:
        'Student demonstrates decoding skills at the 2.5 grade level equivalency with phonological awareness deficits impacting fluency and comprehension of grade-level text.',
      plainText:
        'Alex can read at about a mid-2nd grade level. They sometimes struggle to sound out longer words, which slows down reading and makes it harder to understand what they read. With support, comprehension improves significantly.',
    },
    {
      category: 'Writing',
      officialText:
        'Written expression is characterized by limited syntactic complexity, frequent spelling errors, and difficulty with narrative organization at grade level expectations.',
      plainText: `Alex's writing tends to use simpler sentences and has more spelling mistakes than expected for 4th grade. Organizing ideas into paragraphs is challenging. Alex has great ideas but needs help getting them on paper.`,
    },
    {
      category: 'Social/Emotional',
      officialText:
        'Student demonstrates age-appropriate social skills with intermittent frustration tolerance difficulties during academic tasks requiring sustained written output.',
      plainText:
        'Alex gets along well with friends and classmates! They sometimes get frustrated during longer writing assignments but are learning strategies to manage those feelings.',
    },
  ],
  goals: [
    {
      domain: 'Reading',
      officialText:
        'Given grade-level narrative text, the student will decode multisyllabic words with 90% accuracy as measured by curriculum-based assessments administered biweekly.',
      plainText:
        'Alex will be able to read longer, harder words correctly 9 out of 10 times when reading stories written for 4th graders.',
      currentProgress: 72,
      target: 90,
      whatItMeans:
        'Right now Alex gets about 7 out of 10 big words right. The goal is to get to 9 out of 10 by next year.',
      howToHelp:
        'Practice reading together at home for 15-20 minutes daily. When Alex encounters a big word, help them break it into smaller parts (syllables). Try clapping out the word parts together!',
    },
    {
      domain: 'Writing',
      officialText:
        'The student will produce multi-paragraph compositions demonstrating correct use of capitalization, punctuation, and grade-appropriate spelling in 80% of writing samples across multiple settings.',
      plainText:
        'Alex will write longer pieces (2+ paragraphs) with good punctuation, capitalization, and spelling — getting it right 8 out of 10 times.',
      currentProgress: 55,
      target: 80,
      whatItMeans:
        'Writing is the area where Alex needs the most support right now. They are improving but the gap is still significant.',
      howToHelp:
        'Encourage writing at home — journals, letters to family, creative stories. Focus on praising effort and ideas before correcting spelling. A word processor with spell-check can help too.',
    },
    {
      domain: 'Social/Emotional',
      officialText:
        'When presented with a frustrating academic task, the student will independently implement a learned coping strategy (e.g., deep breathing, requesting a break, using a self-monitoring checklist) in 4 out of 5 observed opportunities.',
      plainText:
        'When schoolwork gets frustrating, Alex will use a calming strategy on their own (like deep breathing or asking for a break) at least 4 out of 5 times.',
      currentProgress: 60,
      target: 80,
      whatItMeans:
        'Alex is doing well with this! They already use coping strategies more than half the time and are close to the goal.',
      howToHelp:
        'Practice the same strategies at home. When Alex gets frustrated, gently remind them: "What strategy could you use right now?" Celebrate when they use one independently.',
    },
  ],
  services: [
    {
      type: 'Specialized Reading Instruction',
      provider: 'Ms. Rodriguez (Special Education Teacher)',
      frequency: '5 times per week, 30 minutes each session',
      plainExplanation:
        'Alex will work with a reading specialist every school day for 30 minutes in a small group. They will use a structured program designed for students who learn to read differently.',
    },
    {
      type: 'Speech-Language Therapy',
      provider: 'Mrs. Johnson (SLP)',
      frequency: '2 times per week, 20 minutes each session',
      plainExplanation:
        'Alex will meet with a speech therapist twice a week to work on understanding and using more complex language, especially related to reading comprehension.',
    },
    {
      type: 'Occupational Therapy (Consultation)',
      provider: 'Mr. Lee (OT)',
      frequency: 'Monthly consultation',
      plainExplanation:
        "An occupational therapist will check in with Alex's teachers monthly to suggest strategies for handwriting and fine motor challenges. Alex does not need direct OT sessions at this time.",
    },
  ],
  accommodations: [
    {
      name: 'Extended time (1.5x) on tests and assignments',
      plainExplanation:
        'Alex gets 50% more time on tests and big assignments. This is because processing written language takes more effort for Alex — the extra time lets them show what they truly know.',
    },
    {
      name: 'Preferential seating near instruction',
      plainExplanation:
        'Alex sits near the teacher to reduce distractions and hear instructions more clearly.',
    },
    {
      name: 'Audio versions of texts when available',
      plainExplanation:
        'Alex can listen to books and texts while following along. This helps with comprehension while reading skills are still developing.',
    },
    {
      name: 'Graphic organizers for writing assignments',
      plainExplanation:
        'Alex uses visual planning tools (like webs or outlines) to organize ideas before writing. This makes the writing process less overwhelming.',
    },
    {
      name: 'Reduced copying from board; printed notes provided',
      plainExplanation:
        'Instead of copying notes from the board (which is slow and tiring), Alex receives printed copies so they can focus on understanding the content.',
    },
  ],
};

// JargonTooltip component — highlights IEP jargon with a tooltip definition
function JargonTooltip({ term, children }: { term: string; children?: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const definition = IEP_GLOSSARY[term];
  if (!definition) return <>{children || term}</>;

  return (
    <span className="relative inline-block">
      <button
        type="button"
        className="inline-flex items-center gap-0.5 border-b-2 border-dotted border-indigo-400 text-indigo-700 font-medium hover:bg-indigo-50 rounded px-0.5 transition-colors"
        onClick={() => {
          setIsOpen(!isOpen);
        }}
        onMouseEnter={() => {
          setIsOpen(true);
        }}
        onMouseLeave={() => {
          setIsOpen(false);
        }}
        aria-label={`Definition of ${term}`}
        aria-expanded={isOpen}
      >
        {children || term}
        <HelpCircle className="h-3 w-3 text-indigo-400 inline" />
      </button>
      {isOpen && (
        <span
          className="absolute z-50 bottom-full left-0 mb-2 w-72 rounded-lg bg-gray-900 p-3 text-sm text-white shadow-xl"
          role="tooltip"
        >
          <span className="font-semibold text-indigo-300">{term}:</span> {definition}
          <span className="absolute top-full left-4 h-0 w-0 border-x-8 border-x-transparent border-t-8 border-t-gray-900" />
        </span>
      )}
    </span>
  );
}

// Helper to auto-detect and wrap jargon terms in text
function PlainText({ text }: { text: string }) {
  // Find all glossary terms in the text and wrap them
  const terms = Object.keys(IEP_GLOSSARY).sort((a, b) => b.length - a.length);
  const regex = new RegExp(
    `\\b(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`,
    'gi'
  );

  const parts: (string | { term: string; match: string })[] = [];
  let lastIndex = 0;
  let execResult: RegExpExecArray | null;

  while ((execResult = regex.exec(text)) !== null) {
    const m = execResult;
    if (m.index > lastIndex) {
      parts.push(text.slice(lastIndex, m.index));
    }
    const matchedTerm = terms.find((t) => t.toLowerCase() === m[1].toLowerCase()) || m[1];
    parts.push({ term: matchedTerm, match: m[1] });
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return (
    <span>
      {parts.map((part) =>
        typeof part === 'string' ? (
          <span key={`text-${part.slice(0, 30)}`}>{part}</span>
        ) : (
          <JargonTooltip key={`jargon-${part.term}`} term={part.term}>
            {part.match}
          </JargonTooltip>
        )
      )}
    </span>
  );
}

export default function IEPSummaryPage() {
  const { t } = useTranslation('parent');
  const router = useRouter();
  const [iepRaw] = useState<PlainLanguageIEP>(mockIEP);
  const { data: iep, isTranslating } = useIepTranslation(iepRaw);
  const [showOfficial, setShowOfficial] = useState<Record<string, boolean>>({});
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctionForm, setCorrectionForm] = useState({
    recordType: 'iep_goal',
    currentValue: '',
    requestedValue: '',
    reason: '',
  });
  const [correctionSubmitting, setCorrectionSubmitting] = useState(false);
  const [correctionResult, setCorrectionResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const toggleOfficial = (key: string) => {
    setShowOfficial((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <main id="main-content" className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              router.push('/dashboard');
            }}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
            aria-label="Back to dashboard"
          >
            <ChevronLeft className="h-4 w-4" />
            Dashboard
          </button>
        </div>

        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {t('iep.title', "{childName}'s IEP — In Plain Language")}
            </h1>
            <p className="text-gray-600">
              {t(
                'iep.subtitle',
                "Your child's IEP explained in clear, everyday language. Hover over highlighted terms for definitions."
              )}
            </p>
            {isTranslating && (
              <p className="text-sm text-indigo-600 animate-pulse mt-1">
                {t('iep.translating', 'Translating IEP content…')}
              </p>
            )}
          </div>
          <button className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors">
            <Download className="h-4 w-4" />
            Download Full IEP
          </button>
        </div>

        {/* What is an IEP? */}
        <div className="rounded-xl bg-indigo-50 p-6 border border-indigo-100">
          <h2 className="text-lg font-semibold text-indigo-900 mb-2 flex items-center gap-2">
            <Info className="h-5 w-5 text-indigo-600" />
            What is an <JargonTooltip term="IEP">IEP</JargonTooltip>?
          </h2>
          <p className="text-sm text-indigo-800">
            An <JargonTooltip term="IEP">IEP</JargonTooltip> is a roadmap for your child&apos;s
            education created by a team that includes YOU. It describes where your child is now,
            where we want them to be, and what support they&apos;ll get. It&apos;s protected by
            federal law (<JargonTooltip term="IDEA">IDEA</JargonTooltip>) and guarantees your child
            a <JargonTooltip term="FAPE">FAPE</JargonTooltip>.
          </p>
        </div>

        {/* Overview */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-gray-600" />
            Overview
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Student</p>
              <p className="text-lg font-medium text-gray-900">
                {iep.childName} — {iep.grade} Grade
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">IEP Period</p>
              <p className="text-lg font-medium text-gray-900">
                {new Date(iep.iepStartDate).toLocaleDateString()} —{' '}
                {new Date(iep.iepEndDate).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-indigo-200 bg-indigo-50 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
              <JargonTooltip term="Eligibility Category">Eligibility</JargonTooltip>
            </p>
            <p className="font-medium text-gray-900">{iep.eligibility}</p>
            <p className="text-sm text-gray-700 mt-2">{iep.eligibilityPlain}</p>
          </div>
        </div>

        {/* Present Levels */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-600" />
            <JargonTooltip term="Present Levels">Present Levels</JargonTooltip> — Where Is{' '}
            {iep.childName} Now?
          </h2>
          <div className="space-y-4">
            {iep.presentLevels.map((level) => (
              <div key={level.category} className="rounded-lg border border-gray-200 p-4">
                <h3 className="font-medium text-gray-900 mb-2">{level.category}</h3>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-2">
                  <p className="text-sm text-green-900">
                    <span className="font-medium">In plain language: </span>
                    <PlainText text={level.plainText} />
                  </p>
                </div>
                <button
                  onClick={() => {
                    toggleOfficial(`level-${level.category}`);
                  }}
                  className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                  aria-expanded={showOfficial[`level-${level.category}`]}
                >
                  {showOfficial[`level-${level.category}`] ? '▾' : '▸'} Show official IEP language
                </button>
                {showOfficial[`level-${level.category}`] && (
                  <div className="mt-2 rounded-lg bg-gray-50 p-3 text-sm text-gray-600 italic">
                    <PlainText text={level.officialText} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Goals */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <JargonTooltip term="Annual Goals">Annual Goals</JargonTooltip> — Where Are We Headed?
          </h2>
          <div className="space-y-6">
            {iep.goals.map((goal) => {
              const pct = Math.round((goal.currentProgress / goal.target) * 100);
              return (
                <div key={goal.domain} className="rounded-lg border border-gray-200 p-4">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xs font-medium text-gray-500 uppercase">
                      {goal.domain}
                    </span>
                    <span className="text-xs text-gray-500">{pct}% progress</span>
                  </div>

                  {/* Plain language goal */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                    <p className="text-sm text-green-900 font-medium">Goal (simplified):</p>
                    <p className="text-sm text-green-800 mt-1">{goal.plainText}</p>
                  </div>

                  {/* What it means */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                    <p className="text-sm text-blue-900 font-medium">What this means right now:</p>
                    <p className="text-sm text-blue-800 mt-1">{goal.whatItMeans}</p>
                  </div>

                  {/* How to help */}
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
                    <p className="text-sm text-amber-900 font-medium">How you can help at home:</p>
                    <p className="text-sm text-amber-800 mt-1">{goal.howToHelp}</p>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3">
                    <div className="h-3 w-full rounded-full bg-gray-200">
                      <div
                        className={`h-full rounded-full transition-all ${pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Current: {goal.currentProgress}</span>
                      <span>Target: {goal.target}</span>
                    </div>
                  </div>

                  {/* Official text toggle */}
                  <button
                    onClick={() => {
                      toggleOfficial(`goal-${goal.domain}`);
                    }}
                    className="mt-3 text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                    aria-expanded={showOfficial[`goal-${goal.domain}`]}
                  >
                    {showOfficial[`goal-${goal.domain}`] ? '▾' : '▸'} Show official IEP language
                  </button>
                  {showOfficial[`goal-${goal.domain}`] && (
                    <div className="mt-2 rounded-lg bg-gray-50 p-3 text-sm text-gray-600 italic">
                      <PlainText text={goal.officialText} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Services */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5 text-purple-600" />
            <JargonTooltip term="Related Services">Services</JargonTooltip> — What Support Will{' '}
            {iep.childName} Get?
          </h2>
          <div className="space-y-4">
            {iep.services.map((service) => (
              <div key={service.type} className="rounded-lg border border-gray-200 p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-gray-900">{service.type}</h3>
                  <span className="text-xs text-gray-500 bg-gray-100 rounded-full px-2 py-1 shrink-0">
                    {service.frequency}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">Provider: {service.provider}</p>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-800">{service.plainExplanation}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Accommodations */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-teal-600" />
            <JargonTooltip term="Accommodation">Accommodations</JargonTooltip> — Changes to Help{' '}
            {iep.childName} Succeed
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            These are changes to <em>how</em> {iep.childName} learns — not <em>what</em> they learn.
            The work stays at grade level, but the way it&apos;s delivered or tested is adjusted.
            (If the work itself changes, that&apos;s a{' '}
            <JargonTooltip term="Modification">modification</JargonTooltip>, which is different.)
          </p>
          <div className="space-y-3">
            {iep.accommodations.map((acc) => (
              <div key={acc.name} className="rounded-lg border border-gray-200 p-4">
                <div className="flex items-start gap-3">
                  <span className="text-green-500 mt-0.5 text-lg">✓</span>
                  <div>
                    <p className="font-medium text-gray-900">{acc.name}</p>
                    <p className="text-sm text-gray-600 mt-1">{acc.plainExplanation}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FERPA Request Correction — Sprint T2-05 */}
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-6">
          <h2 className="text-lg font-semibold text-amber-900 mb-2 flex items-center gap-2">
            <FileText className="h-5 w-5 text-amber-600" />
            Your FERPA Rights
          </h2>
          <p className="text-sm text-amber-800 mb-4">
            Under FERPA (34 CFR § 99.20), you have the right to request correction of any education
            records you believe are inaccurate, misleading, or in violation of your child&apos;s
            privacy rights. The district must respond within 45 days per FERPA requirements.
          </p>
          <button
            onClick={() => {
              setShowCorrectionModal(true);
              setCorrectionResult(null);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium"
          >
            <FileText className="h-4 w-4" />
            Request a Correction
          </button>
        </div>

        {/* Correction Request Modal */}
        {showCorrectionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-lg bg-white rounded-xl shadow-xl overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Request Record Correction</h3>
                <p className="text-sm text-gray-500 mt-1">
                  FERPA 34 CFR § 99.20 — Describe what you believe is inaccurate.
                </p>
              </div>
              <div className="p-6 space-y-4">
                {correctionResult ? (
                  <div
                    className={`p-4 rounded-lg ${
                      correctionResult.success
                        ? 'bg-green-50 border border-green-200 text-green-800'
                        : 'bg-red-50 border border-red-200 text-red-800'
                    }`}
                  >
                    {correctionResult.message}
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Record Type
                      </label>
                      <select
                        value={correctionForm.recordType}
                        onChange={(e) => {
                          setCorrectionForm({ ...correctionForm, recordType: e.target.value });
                        }}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="iep_goal">IEP Goal</option>
                        <option value="present_level">Present Level / PLAAFP</option>
                        <option value="service">Service</option>
                        <option value="accommodation">Accommodation</option>
                        <option value="eligibility">Eligibility Category</option>
                        <option value="profile">Student Profile</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        What the record currently says
                      </label>
                      <textarea
                        value={correctionForm.currentValue}
                        onChange={(e) => {
                          setCorrectionForm({ ...correctionForm, currentValue: e.target.value });
                        }}
                        rows={2}
                        placeholder="Copy or describe the current text..."
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        What it should say
                      </label>
                      <textarea
                        value={correctionForm.requestedValue}
                        onChange={(e) => {
                          setCorrectionForm({ ...correctionForm, requestedValue: e.target.value });
                        }}
                        rows={2}
                        placeholder="Describe the correct information..."
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Reason for correction *
                      </label>
                      <textarea
                        value={correctionForm.reason}
                        onChange={(e) => {
                          setCorrectionForm({ ...correctionForm, reason: e.target.value });
                        }}
                        rows={3}
                        placeholder="Explain why this information is inaccurate or misleading..."
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </>
                )}
              </div>
              <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowCorrectionModal(false);
                  }}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  {correctionResult ? 'Close' : 'Cancel'}
                </button>
                {!correctionResult && (
                  <button
                    disabled={!correctionForm.reason || correctionSubmitting}
                    onClick={async () => {
                      setCorrectionSubmitting(true);
                      try {
                        const res = await fetch('/api/data-rights/default/data/correction', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            recordType: correctionForm.recordType,
                            recordId: 'current-iep',
                            currentValue: correctionForm.currentValue,
                            requestedValue: correctionForm.requestedValue,
                            reason: correctionForm.reason,
                          }),
                        });
                        if (res.ok) {
                          const data = (await res.json()) as {
                            message?: string;
                            responseDeadline?: string;
                          };
                          const deadline = data.responseDeadline
                            ? ` The district must respond by ${data.responseDeadline}.`
                            : '';
                          setCorrectionResult({
                            success: true,
                            message:
                              (data.message ?? 'Correction request submitted successfully.') +
                              deadline +
                              ' A confirmation email has been sent to your registered email address.',
                          });
                        } else {
                          setCorrectionResult({
                            success: false,
                            message: 'Failed to submit correction request. Please try again.',
                          });
                        }
                      } catch {
                        setCorrectionResult({
                          success: false,
                          message: 'Network error. Please check your connection and try again.',
                        });
                      } finally {
                        setCorrectionSubmitting(false);
                      }
                    }}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    {correctionSubmitting ? 'Submitting...' : 'Submit Request'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Glossary */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">IEP Glossary — Common Terms Explained</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {Object.entries(IEP_GLOSSARY)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([term, definition]) => (
                <div key={term} className="rounded-lg bg-gray-50 p-3">
                  <p className="font-medium text-indigo-700 text-sm">{term}</p>
                  <p className="text-xs text-gray-600 mt-1">{definition}</p>
                </div>
              ))}
          </div>
        </div>
      </div>
    </main>
  );
}
