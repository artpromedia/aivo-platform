/**
 * Assessment Builder Component
 *
 * Drag-and-drop assessment creation with:
 * - Question type selector
 * - Preview mode
 * - Settings configuration
 * - Rubric builder
 */

'use client';

import * as React from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

import { cn } from '@/lib/utils';

export type QuestionType =
  | 'MULTIPLE_CHOICE'
  | 'MULTIPLE_SELECT'
  | 'TRUE_FALSE'
  | 'SHORT_ANSWER'
  | 'ESSAY'
  | 'FILL_BLANK'
  | 'MATCHING'
  | 'ORDERING'
  | 'NUMERIC';

export interface Question {
  id: string;
  type: QuestionType;
  questionText: string;
  questionMedia?: { type: 'image' | 'video'; url: string };
  options?: Array<{ text: string; isCorrect: boolean }>;
  correctAnswer?: any;
  acceptedAnswers?: string[];
  points: number;
  partialCredit: boolean;
  explanation?: string;
  hints: string[];
  orderIndex: number;
}

export interface Assessment {
  id?: string;
  title: string;
  description?: string;
  timeLimit?: number;
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
  showCorrectAnswers: boolean;
  allowRetakes: boolean;
  maxAttempts: number;
  passingScore?: number;
  questions: Question[];
}

interface AssessmentBuilderProps {
  initialAssessment?: Assessment;
  onSave: (assessment: Assessment) => Promise<void>;
  onPublish?: (assessment: Assessment) => Promise<void>;
  className?: string;
}

export function AssessmentBuilder({
  initialAssessment,
  onSave,
  onPublish,
  className
}: AssessmentBuilderProps) {
  const [assessment, setAssessment] = React.useState<Assessment>(
    initialAssessment ?? {
      title: '',
      shuffleQuestions: false,
      shuffleAnswers: false,
      showCorrectAnswers: true,
      allowRetakes: false,
      maxAttempts: 1,
      questions: []
    }
  );

  const [mode, setMode] = React.useState<'edit' | 'preview'>('edit');
  const [selectedQuestion, setSelectedQuestion] = React.useState<number | null>(null);
  const [showSettings, setShowSettings] = React.useState(false);
  const [showRubricBuilder, setShowRubricBuilder] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const questions = Array.from(assessment.questions);
    const [removed] = questions.splice(result.source.index, 1);
    questions.splice(result.destination.index, 0, removed);

    // Update order indices
    questions.forEach((q, index) => {
      q.orderIndex = index;
    });

    setAssessment({ ...assessment, questions });
  };

  const addQuestion = (type: QuestionType) => {
    const newQuestion: Question = {
      id: `temp-${Date.now()}`,
      type,
      questionText: '',
      points: 1,
      partialCredit: false,
      hints: [],
      orderIndex: assessment.questions.length
    };

    if (type === 'MULTIPLE_CHOICE' || type === 'MULTIPLE_SELECT') {
      newQuestion.options = [
        { text: '', isCorrect: false },
        { text: '', isCorrect: false }
      ];
    }

    setAssessment({
      ...assessment,
      questions: [...assessment.questions, newQuestion]
    });

    setSelectedQuestion(assessment.questions.length);
  };

  const updateQuestion = (index: number, updates: Partial<Question>) => {
    const questions = [...assessment.questions];
    questions[index] = { ...questions[index], ...updates };
    setAssessment({ ...assessment, questions });
  };

  const deleteQuestion = (index: number) => {
    const questions = assessment.questions.filter((_, i) => i !== index);
    questions.forEach((q, i) => {
      q.orderIndex = i;
    });
    setAssessment({ ...assessment, questions });
    setSelectedQuestion(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(assessment);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!onPublish) return;
    setIsSaving(true);
    try {
      await onPublish(assessment);
    } finally {
      setIsSaving(false);
    }
  };

  const totalPoints = assessment.questions.reduce((sum, q) => sum + q.points, 0);

  return (
    <div className={cn('flex h-full flex-col bg-gray-50', className)}>
      {/* Header */}
      <div className="border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <input
              type="text"
              value={assessment.title}
              onChange={e => setAssessment({ ...assessment, title: e.target.value })}
              placeholder="Assessment Title"
              className="text-2xl font-bold border-0 bg-transparent focus:outline-none focus:ring-2 focus:ring-primary-500 rounded px-2 py-1"
            />
            <textarea
              value={assessment.description ?? ''}
              onChange={e => setAssessment({ ...assessment, description: e.target.value })}
              placeholder="Add description (optional)"
              className="mt-2 w-full text-sm text-gray-600 border-0 bg-transparent focus:outline-none focus:ring-2 focus:ring-primary-500 rounded px-2 py-1"
              rows={2}
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMode(mode === 'edit' ? 'preview' : 'edit')}
              className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
            >
              {mode === 'edit' ? 'Preview' : 'Edit'}
            </button>
            <button
              type="button"
              onClick={() => setShowSettings(true)}
              className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
            >
              Settings
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-lg bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Draft'}
            </button>
            {onPublish && (
              <button
                type="button"
                onClick={handlePublish}
                disabled={isSaving || assessment.questions.length === 0}
                className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
              >
                Publish
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-6 text-sm text-gray-600">
          <span>{assessment.questions.length} questions</span>
          <span>{totalPoints} total points</span>
          {assessment.timeLimit && <span>{assessment.timeLimit} min time limit</span>}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Question List */}
        <div className="w-2/3 overflow-y-auto border-r bg-white p-6">
          {mode === 'edit' ? (
            <>
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="questions">
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                      {assessment.questions.map((question, index) => (
                        <Draggable key={question.id} draggableId={question.id} index={index}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={cn(
                                'rounded-lg border p-4 bg-white cursor-pointer transition-shadow',
                                selectedQuestion === index && 'ring-2 ring-primary-500'
                              )}
                              onClick={() => setSelectedQuestion(index)}
                            >
                              <div className="flex items-start gap-4">
                                <div
                                  {...provided.dragHandleProps}
                                  className="mt-1 cursor-grab text-gray-400 hover:text-gray-600"
                                >
                                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z" />
                                  </svg>
                                </div>

                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="font-medium">Q{index + 1}</span>
                                    <span className="text-xs px-2 py-1 bg-gray-100 rounded">
                                      {formatQuestionType(question.type)}
                                    </span>
                                    <span className="text-xs text-gray-500">{question.points} pts</span>
                                  </div>
                                  <div className="text-sm text-gray-700">
                                    {question.questionText || (
                                      <span className="text-gray-400 italic">Empty question</span>
                                    )}
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteQuestion(index);
                                  }}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>

              {/* Add Question Button */}
              <div className="mt-6">
                <QuestionTypePalette onSelectType={addQuestion} />
              </div>
            </>
          ) : (
            <AssessmentPreview assessment={assessment} />
          )}
        </div>

        {/* Question Editor Sidebar */}
        <div className="w-1/3 overflow-y-auto bg-gray-50 p-6">
          {selectedQuestion !== null && mode === 'edit' ? (
            <QuestionEditor
              question={assessment.questions[selectedQuestion]}
              onUpdate={(updates) => updateQuestion(selectedQuestion, updates)}
              onClose={() => setSelectedQuestion(null)}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-gray-400">
              <p>Select a question to edit</p>
            </div>
          )}
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          settings={assessment}
          onUpdate={setAssessment}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

// Question Type Palette
function QuestionTypePalette({ onSelectType }: { onSelectType: (type: QuestionType) => void }) {
  const questionTypes: Array<{ type: QuestionType; label: string; icon: string }> = [
    { type: 'MULTIPLE_CHOICE', label: 'Multiple Choice', icon: '◉' },
    { type: 'MULTIPLE_SELECT', label: 'Multiple Select', icon: '☑' },
    { type: 'TRUE_FALSE', label: 'True/False', icon: '⊤⊥' },
    { type: 'SHORT_ANSWER', label: 'Short Answer', icon: '—' },
    { type: 'ESSAY', label: 'Essay', icon: '≡' },
    { type: 'FILL_BLANK', label: 'Fill in Blank', icon: '___' },
    { type: 'MATCHING', label: 'Matching', icon: '⇄' },
    { type: 'ORDERING', label: 'Ordering', icon: '↕' },
    { type: 'NUMERIC', label: 'Numeric', icon: '123' }
  ];

  return (
    <div>
      <h3 className="text-sm font-medium text-gray-700 mb-3">Add Question</h3>
      <div className="grid grid-cols-2 gap-2">
        {questionTypes.map(({ type, label, icon }) => (
          <button
            key={type}
            type="button"
            onClick={() => onSelectType(type)}
            className="flex items-center gap-2 rounded-lg border bg-white p-3 text-left text-sm hover:bg-gray-50 hover:border-primary-300"
          >
            <span className="text-xl">{icon}</span>
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// Question Editor
function QuestionEditor({
  question,
  onUpdate,
  onClose
}: {
  question: Question;
  onUpdate: (updates: Partial<Question>) => void;
  onClose: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Edit Question</h3>
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
          ✕
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Question Text</label>
        <textarea
          value={question.questionText}
          onChange={e => onUpdate({ questionText: e.target.value })}
          className="w-full rounded-lg border p-2 text-sm"
          rows={4}
          placeholder="Enter your question..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Points</label>
        <input
          type="number"
          value={question.points}
          onChange={e => onUpdate({ points: parseInt(e.target.value) || 1 })}
          min={1}
          className="w-full rounded-lg border p-2 text-sm"
        />
      </div>

      {(question.type === 'MULTIPLE_CHOICE' || question.type === 'MULTIPLE_SELECT') && (
        <OptionsEditor question={question} onUpdate={onUpdate} />
      )}

      {question.type === 'SHORT_ANSWER' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Accepted Answers (one per line)
          </label>
          <textarea
            value={question.acceptedAnswers?.join('\n') ?? ''}
            onChange={e => onUpdate({ acceptedAnswers: e.target.value.split('\n').filter(Boolean) })}
            className="w-full rounded-lg border p-2 text-sm"
            rows={3}
            placeholder="answer1&#10;answer2&#10;answer3"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Explanation (optional)</label>
        <textarea
          value={question.explanation ?? ''}
          onChange={e => onUpdate({ explanation: e.target.value })}
          className="w-full rounded-lg border p-2 text-sm"
          rows={3}
          placeholder="Explain the correct answer..."
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="partialCredit"
          checked={question.partialCredit}
          onChange={e => onUpdate({ partialCredit: e.target.checked })}
          className="rounded border-gray-300"
        />
        <label htmlFor="partialCredit" className="text-sm text-gray-700">
          Allow partial credit
        </label>
      </div>
    </div>
  );
}

// Options Editor for MC/MS questions
function OptionsEditor({
  question,
  onUpdate
}: {
  question: Question;
  onUpdate: (updates: Partial<Question>) => void;
}) {
  const options = question.options ?? [];

  const updateOption = (index: number, text: string) => {
    const newOptions = [...options];
    newOptions[index] = { ...newOptions[index], text };
    onUpdate({ options: newOptions });
  };

  const toggleCorrect = (index: number) => {
    const newOptions = [...options];
    if (question.type === 'MULTIPLE_CHOICE') {
      // Single correct answer
      newOptions.forEach((opt, i) => {
        opt.isCorrect = i === index;
      });
    } else {
      // Multiple correct answers
      newOptions[index].isCorrect = !newOptions[index].isCorrect;
    }
    onUpdate({ options: newOptions });
  };

  const addOption = () => {
    onUpdate({ options: [...options, { text: '', isCorrect: false }] });
  };

  const removeOption = (index: number) => {
    if (options.length <= 2) return; // Minimum 2 options
    onUpdate({ options: options.filter((_, i) => i !== index) });
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Answer Options</label>
      <div className="space-y-2">
        {options.map((option, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              type={question.type === 'MULTIPLE_CHOICE' ? 'radio' : 'checkbox'}
              checked={option.isCorrect}
              onChange={() => toggleCorrect(index)}
              className="mt-1"
            />
            <input
              type="text"
              value={option.text}
              onChange={e => updateOption(index, e.target.value)}
              className="flex-1 rounded border p-2 text-sm"
              placeholder={`Option ${index + 1}`}
            />
            {options.length > 2 && (
              <button
                type="button"
                onClick={() => removeOption(index)}
                className="text-red-500 hover:text-red-700"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addOption}
        className="mt-2 text-sm text-primary-600 hover:text-primary-700"
      >
        + Add Option
      </button>
    </div>
  );
}

// Assessment Preview
function AssessmentPreview({ assessment }: { assessment: Assessment }) {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold">{assessment.title}</h2>
        {assessment.description && (
          <p className="mt-2 text-gray-600">{assessment.description}</p>
        )}
      </div>

      <div className="space-y-6">
        {assessment.questions.map((question, index) => (
          <div key={question.id} className="rounded-lg border bg-white p-6">
            <div className="mb-4">
              <span className="font-medium">Question {index + 1}</span>
              <span className="ml-2 text-sm text-gray-500">({question.points} points)</span>
            </div>
            <p className="text-gray-800 mb-4">{question.questionText}</p>

            {/* Render question based on type */}
            {question.type === 'MULTIPLE_CHOICE' && question.options && (
              <div className="space-y-2">
                {question.options.map((option, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input type="radio" name={`q-${question.id}`} className="mt-0.5" />
                    <label className="text-sm">{option.text}</label>
                  </div>
                ))}
              </div>
            )}

            {question.type === 'MULTIPLE_SELECT' && question.options && (
              <div className="space-y-2">
                {question.options.map((option, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input type="checkbox" className="mt-0.5" />
                    <label className="text-sm">{option.text}</label>
                  </div>
                ))}
              </div>
            )}

            {question.type === 'SHORT_ANSWER' && (
              <input
                type="text"
                className="w-full rounded border p-2"
                placeholder="Your answer..."
                disabled
              />
            )}

            {question.type === 'ESSAY' && (
              <textarea
                className="w-full rounded border p-2"
                rows={6}
                placeholder="Your answer..."
                disabled
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Settings Modal
function SettingsModal({
  settings,
  onUpdate,
  onClose
}: {
  settings: Assessment;
  onUpdate: (settings: Assessment) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-2xl rounded-lg bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Assessment Settings</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Time Limit (minutes)
            </label>
            <input
              type="number"
              value={settings.timeLimit ?? ''}
              onChange={e => onUpdate({ ...settings, timeLimit: parseInt(e.target.value) || undefined })}
              className="w-full rounded border p-2"
              placeholder="No limit"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Passing Score (%)
            </label>
            <input
              type="number"
              value={settings.passingScore ?? ''}
              onChange={e => onUpdate({ ...settings, passingScore: parseFloat(e.target.value) || undefined })}
              className="w-full rounded border p-2"
              min={0}
              max={100}
              placeholder="Optional"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Maximum Attempts
            </label>
            <input
              type="number"
              value={settings.maxAttempts}
              onChange={e => onUpdate({ ...settings, maxAttempts: parseInt(e.target.value) || 1 })}
              className="w-full rounded border p-2"
              min={1}
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.shuffleQuestions}
                onChange={e => onUpdate({ ...settings, shuffleQuestions: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">Shuffle questions</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.shuffleAnswers}
                onChange={e => onUpdate({ ...settings, shuffleAnswers: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">Shuffle answer options</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.showCorrectAnswers}
                onChange={e => onUpdate({ ...settings, showCorrectAnswers: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">Show correct answers after submission</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.allowRetakes}
                onChange={e => onUpdate({ ...settings, allowRetakes: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">Allow retakes</span>
            </label>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded bg-gray-200 px-4 py-2 text-sm font-medium hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper function
function formatQuestionType(type: QuestionType): string {
  return type.split('_').map(word => word.charAt(0) + word.slice(1).toLowerCase()).join(' ');
}
