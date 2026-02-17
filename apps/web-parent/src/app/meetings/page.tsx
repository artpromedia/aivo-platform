'use client';

import {
  Calendar,
  FileText,
  CheckCircle,
  ChevronLeft,
  Users,
  Download,
  Lightbulb,
  MessageSquare,
  ClipboardList,
  TrendingUp,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

// Types
interface MeetingPrep {
  meetingDate: string;
  meetingType: 'annual_review' | 'initial' | 'reevaluation' | 'amendment' | 'transition';
  teamMembers: { name: string; role: string; email: string }[];
  agendaItems: string[];
  childGoals: {
    domain: string;
    description: string;
    currentProgress: number;
    target: number;
    status: string;
  }[];
  parentQuestions: string[];
  documents: { name: string; type: string; ready: boolean }[];
}

const MEETING_TYPE_LABELS: Record<string, string> = {
  annual_review: 'Annual Review',
  initial: 'Initial IEP Meeting',
  reevaluation: 'Reevaluation',
  amendment: 'IEP Amendment',
  transition: 'Transition Planning',
};

const SUGGESTED_QUESTIONS = [
  'How is my child progressing toward their IEP goals?',
  'Are the current accommodations working well in the classroom?',
  'What can I do at home to support the IEP goals?',
  'Are there any new assessments or evaluations recommended?',
  'How does my child interact with peers during the school day?',
  'What changes, if any, are being proposed for the next IEP period?',
  'How will progress be measured and reported to me?',
  'Are there additional services or supports that could benefit my child?',
];

// Mock data – will be replaced with API calls to iep-svc
const mockMeetingPrep: MeetingPrep = {
  meetingDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
  meetingType: 'annual_review',
  teamMembers: [
    { name: 'Ms. Rodriguez', role: 'Special Education Teacher', email: 'rodriguez@school.edu' },
    { name: 'Dr. Chen', role: 'School Psychologist', email: 'chen@school.edu' },
    { name: 'Mr. Williams', role: 'General Education Teacher', email: 'williams@school.edu' },
    { name: 'Mrs. Johnson', role: 'Speech-Language Pathologist', email: 'johnson@school.edu' },
    { name: 'Ms. Davis', role: 'District Representative', email: 'davis@school.edu' },
  ],
  agendaItems: [
    'Review of current IEP goals and progress',
    'Present levels of academic and functional performance',
    'Discussion of assessment results',
    'Proposed goals for next IEP period',
    'Services and placement discussion',
    'Parent input and concerns',
  ],
  childGoals: [
    {
      domain: 'Reading',
      description:
        'Read grade-level passages with 90% accuracy and demonstrate comprehension through retelling.',
      currentProgress: 72,
      target: 90,
      status: 'in_progress',
    },
    {
      domain: 'Writing',
      description:
        'Write multi-paragraph compositions with correct grammar and organized structure.',
      currentProgress: 55,
      target: 80,
      status: 'at_risk',
    },
    {
      domain: 'Social/Emotional',
      description:
        'Use coping strategies independently when frustrated in 4 out of 5 opportunities.',
      currentProgress: 3,
      target: 5,
      status: 'on_track',
    },
  ],
  parentQuestions: [],
  documents: [
    { name: 'Current IEP Document', type: 'PDF', ready: true },
    { name: 'Progress Reports (Q1-Q3)', type: 'PDF', ready: true },
    { name: 'Assessment Results', type: 'PDF', ready: true },
    { name: 'Teacher Observation Notes', type: 'PDF', ready: false },
    { name: 'Work Samples', type: 'Folder', ready: false },
  ],
};

export default function MeetingPrepPage() {
  const { t } = useTranslation('parent');
  const router = useRouter();
  const [prep] = useState<MeetingPrep>(mockMeetingPrep);
  const [myQuestions, setMyQuestions] = useState<string[]>([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [myNotes, setMyNotes] = useState('');
  const [checklist, setChecklist] = useState<Record<string, boolean>>({
    reviewGoals: false,
    prepareQuestions: false,
    gatherWorkSamples: false,
    reviewRights: false,
    confirmAttendees: false,
  });

  const daysUntilMeeting = Math.ceil(
    (new Date(prep.meetingDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  const completedChecklist = Object.values(checklist).filter(Boolean).length;
  const totalChecklist = Object.keys(checklist).length;

  const addQuestion = () => {
    if (newQuestion.trim()) {
      setMyQuestions([...myQuestions, newQuestion.trim()]);
      setNewQuestion('');
    }
  };

  const addSuggestedQuestion = (q: string) => {
    if (!myQuestions.includes(q)) {
      setMyQuestions([...myQuestions, q]);
    }
  };

  const removeQuestion = (idx: number) => {
    setMyQuestions(myQuestions.filter((_, i) => i !== idx));
  };

  const toggleChecklist = (key: string) => {
    setChecklist({ ...checklist, [key]: !checklist[key] });
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

        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {t('meetings.title', 'Meeting Preparation')}
            </h1>
            <p className="text-gray-600">
              {t('meetings.subtitle', 'Get ready for your upcoming IEP meeting')}
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-indigo-50 px-4 py-2 text-indigo-700">
            <Calendar className="h-5 w-5" />
            <div>
              <p className="text-sm font-medium">
                {new Date(prep.meetingDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
              <p className="text-xs">
                {daysUntilMeeting > 0
                  ? `${daysUntilMeeting} days away`
                  : daysUntilMeeting === 0
                    ? 'Today!'
                    : 'Past meeting'}
              </p>
            </div>
          </div>
        </div>

        {/* Meeting Info */}
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-5 w-5 text-indigo-600" />
              <h2 className="font-semibold">Meeting Type</h2>
            </div>
            <p className="text-lg font-medium text-gray-900">
              {MEETING_TYPE_LABELS[prep.meetingType] || prep.meetingType}
            </p>
          </div>

          <div className="rounded-xl bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-5 w-5 text-indigo-600" />
              <h2 className="font-semibold">Team Members</h2>
            </div>
            <p className="text-lg font-medium text-gray-900">{prep.teamMembers.length} attendees</p>
          </div>

          <div className="rounded-xl bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <ClipboardList className="h-5 w-5 text-indigo-600" />
              <h2 className="font-semibold">Prep Progress</h2>
            </div>
            <p className="text-lg font-medium text-gray-900">
              {completedChecklist}/{totalChecklist} complete
            </p>
            <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-green-500 transition-all"
                style={{ width: `${(completedChecklist / totalChecklist) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Preparation Checklist */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            {t('meetings.checklist', 'Preparation Checklist')}
          </h2>
          <div className="space-y-3">
            {[
              { key: 'reviewGoals', label: 'Review current IEP goals and progress data' },
              { key: 'prepareQuestions', label: 'Prepare questions for the team' },
              { key: 'gatherWorkSamples', label: 'Gather work samples or observations from home' },
              {
                key: 'reviewRights',
                label: 'Review your parental rights and procedural safeguards',
              },
              { key: 'confirmAttendees', label: 'Confirm meeting attendees and logistics' },
            ].map(({ key, label }) => (
              <label
                key={key}
                className="flex items-center gap-3 cursor-pointer rounded-lg p-3 hover:bg-gray-50 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={checklist[key] ?? false}
                  onChange={() => {
                    toggleChecklist(key);
                  }}
                  className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className={checklist[key] ? 'text-gray-500 line-through' : 'text-gray-900'}>
                  {label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Goal Summary Cards */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Current Goal Progress
          </h2>
          <div className="space-y-4">
            {prep.childGoals.map((goal) => {
              const pct = Math.round((goal.currentProgress / goal.target) * 100);
              const statusColor =
                goal.status === 'on_track'
                  ? 'text-green-700 bg-green-100'
                  : goal.status === 'at_risk'
                    ? 'text-red-700 bg-red-100'
                    : 'text-blue-700 bg-blue-100';

              return (
                <div key={`goal-${goal.domain}`} className="rounded-lg border border-gray-200 p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="text-xs font-medium text-gray-500">{goal.domain}</span>
                      <p className="text-sm text-gray-900">{goal.description}</p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusColor}`}>
                      {goal.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Progress: {goal.currentProgress}</span>
                      <span>Target: {goal.target}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-200">
                      <div
                        className={`h-full rounded-full transition-all ${pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{pct}% toward target</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Team Members */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-600" />
            IEP Team
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {prep.teamMembers.map((member) => (
              <div
                key={member.email}
                className="flex items-center gap-3 rounded-lg border border-gray-200 p-3"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-medium text-indigo-600">
                  {member.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">{member.name}</p>
                  <p className="text-xs text-gray-500">{member.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Questions to Ask */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-orange-600" />
            {t('meetings.questions', 'My Questions for the Meeting')}
          </h2>

          {/* User's questions */}
          {myQuestions.length > 0 && (
            <ul className="space-y-2 mb-4">
              {myQuestions.map((q, idx) => (
                <li
                  key={`q-${q.slice(0, 20)}`}
                  className="flex items-start justify-between gap-2 rounded-lg bg-gray-50 p-3"
                >
                  <span className="text-sm text-gray-900">{q}</span>
                  <button
                    onClick={() => {
                      removeQuestion(idx);
                    }}
                    className="text-xs text-red-600 hover:underline shrink-0"
                    aria-label={`Remove question: ${q}`}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Add custom question */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newQuestion}
              onChange={(e) => {
                setNewQuestion(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addQuestion();
              }}
              placeholder="Type your question..."
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              aria-label="Add a question for the meeting"
            />
            <button
              onClick={addQuestion}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
            >
              Add
            </button>
          </div>

          {/* Suggested questions */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
              <Lightbulb className="h-4 w-4 text-yellow-500" />
              Suggested Questions
            </p>
            <div className="space-y-2">
              {SUGGESTED_QUESTIONS.filter((q) => !myQuestions.includes(q)).map((q) => (
                <button
                  key={`sug-${q.slice(0, 20)}`}
                  onClick={() => {
                    addSuggestedQuestion(q);
                  }}
                  className="w-full text-left rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-700 hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
                >
                  + {q}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Personal Notes */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-gray-600" />
            My Notes
          </h2>
          <textarea
            value={myNotes}
            onChange={(e) => {
              setMyNotes(e.target.value);
            }}
            placeholder="Write down any observations, concerns, or things you've noticed at home that you'd like to share with the team..."
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            rows={5}
            aria-label="Personal notes for the meeting"
          />
        </div>

        {/* Documents */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Download className="h-5 w-5 text-teal-600" />
            Meeting Documents
          </h2>
          <div className="space-y-2">
            {prep.documents.map((doc) => (
              <div
                key={doc.name}
                className="flex items-center justify-between rounded-lg border border-gray-200 p-3"
              >
                <div className="flex items-center gap-3">
                  <FileText
                    className={`h-5 w-5 ${doc.ready ? 'text-green-600' : 'text-gray-400'}`}
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                    <p className="text-xs text-gray-500">{doc.type}</p>
                  </div>
                </div>
                {doc.ready ? (
                  <button className="rounded-lg bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200 transition-colors">
                    Download
                  </button>
                ) : (
                  <span className="text-xs text-amber-600">Pending</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Know Your Rights */}
        <div className="rounded-xl bg-indigo-50 p-6 shadow-sm border border-indigo-100">
          <h2 className="text-lg font-semibold text-indigo-900 mb-3 flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-indigo-600" />
            {t('meetings.rights', 'Know Your Rights')}
          </h2>
          <ul className="space-y-2 text-sm text-indigo-800">
            <li className="flex items-start gap-2">
              <span className="text-indigo-600 mt-0.5">•</span>
              You are an equal member of the IEP team — your input matters.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-600 mt-0.5">•</span>
              You can request additional evaluations or assessments at any time.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-600 mt-0.5">•</span>
              You have the right to disagree with any part of the IEP and request mediation.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-600 mt-0.5">•</span>
              You can bring an advocate or support person to any IEP meeting.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-600 mt-0.5">•</span>
              The school must provide written notice before making changes to your child&apos;s IEP.
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}
