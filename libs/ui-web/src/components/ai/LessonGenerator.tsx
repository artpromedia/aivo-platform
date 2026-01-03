'use client';

import { useState, useCallback } from 'react';
import type { ReactNode } from 'react';

import { cn } from '../../utils/cn';
import { Button } from '../button';
import { Card } from '../card';

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

export interface LessonGeneratorProps {
  /** API endpoint for lesson generation */
  apiEndpoint?: string;
  /** Callback when lesson is generated */
  onGenerate?: (lesson: GeneratedLesson) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Additional class names */
  className?: string;
  /** Default form values */
  defaults?: Partial<LessonFormData>;
}

interface LessonFormData {
  subject: string;
  topic: string;
  gradeLevel: string;
  objectives: string[];
  duration: number;
  difficulty: number;
  includeAssessment: boolean;
  learningStyle?: 'visual' | 'auditory' | 'kinesthetic' | 'reading';
}

interface GeneratedLesson {
  id: string;
  title: string;
  subject: string;
  topic: string;
  objectives: string[];
  blocks: LessonBlock[];
  vocabulary: VocabularyItem[];
  assessmentQuestions: AssessmentQuestion[];
  metadata?: {
    model?: string;
    tokensUsed?: number;
    latencyMs?: number;
  };
}

interface LessonBlock {
  id: string;
  type: 'text' | 'activity' | 'media' | 'discussion' | 'example' | 'practice';
  content: string;
  duration?: number;
}

interface VocabularyItem {
  term: string;
  definition: string;
}

interface AssessmentQuestion {
  id: string;
  questionText: string;
  options?: string[];
  correctAnswer: string;
}

// ────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ────────────────────────────────────────────────────────────────────────────

const SUBJECTS = [
  'Mathematics',
  'Science',
  'English Language Arts',
  'Social Studies',
  'History',
  'Geography',
  'Biology',
  'Chemistry',
  'Physics',
  'Computer Science',
  'Art',
  'Music',
  'Physical Education',
  'Health',
  'Foreign Language',
];

const GRADE_LEVELS = [
  'Kindergarten',
  '1st Grade',
  '2nd Grade',
  '3rd Grade',
  '4th Grade',
  '5th Grade',
  '6th Grade',
  '7th Grade',
  '8th Grade',
  '9th Grade',
  '10th Grade',
  '11th Grade',
  '12th Grade',
  'College/University',
];

const LEARNING_STYLES = [
  { value: 'visual', label: 'Visual', icon: '👁️' },
  { value: 'auditory', label: 'Auditory', icon: '👂' },
  { value: 'kinesthetic', label: 'Kinesthetic', icon: '✋' },
  { value: 'reading', label: 'Reading/Writing', icon: '📖' },
];

// ────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ────────────────────────────────────────────────────────────────────────────

export function LessonGenerator({
  apiEndpoint = '/api/ai/generation/lessons',
  onGenerate,
  onError,
  className,
  defaults,
}: LessonGeneratorProps) {
  // Form state
  const [formData, setFormData] = useState<LessonFormData>({
    subject: defaults?.subject ?? '',
    topic: defaults?.topic ?? '',
    gradeLevel: defaults?.gradeLevel ?? '',
    objectives: defaults?.objectives ?? [''],
    duration: defaults?.duration ?? 45,
    difficulty: defaults?.difficulty ?? 3,
    includeAssessment: defaults?.includeAssessment ?? true,
    learningStyle: defaults?.learningStyle,
  });

  // UI state
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedLesson, setGeneratedLesson] = useState<GeneratedLesson | null>(null);
  const [activeTab, setActiveTab] = useState<'form' | 'preview'>('form');

  // ──────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ──────────────────────────────────────────────────────────────────────────

  const handleInputChange = useCallback(
    (field: keyof LessonFormData, value: unknown) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const handleObjectiveChange = useCallback((index: number, value: string) => {
    setFormData((prev) => {
      const objectives = [...prev.objectives];
      objectives[index] = value;
      return { ...prev, objectives };
    });
  }, []);

  const handleAddObjective = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      objectives: [...prev.objectives, ''],
    }));
  }, []);

  const handleRemoveObjective = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      objectives: prev.objectives.filter((_, i) => i !== index),
    }));
  }, []);

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          objectives: formData.objectives.filter((o) => o.trim()),
          learnerProfile: formData.learningStyle
            ? { learningStyle: formData.learningStyle }
            : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message ?? `Generation failed: ${response.status}`);
      }

      const data = await response.json();
      const lesson = data.lesson as GeneratedLesson;

      setGeneratedLesson(lesson);
      setActiveTab('preview');
      onGenerate?.(lesson);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Generation failed');
      setError(error.message);
      onError?.(error);
    } finally {
      setIsGenerating(false);
    }
  }, [apiEndpoint, formData, onGenerate, onError]);

  const handleReset = useCallback(() => {
    setGeneratedLesson(null);
    setActiveTab('form');
    setError(null);
  }, []);

  // ──────────────────────────────────────────────────────────────────────────
  // VALIDATION
  // ──────────────────────────────────────────────────────────────────────────

  const isValid =
    formData.subject.trim() !== '' &&
    formData.topic.trim() !== '' &&
    formData.gradeLevel.trim() !== '';

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────────────────

  return (
    <Card
      className={cn('max-w-4xl', className)}
      title={
        <div className="flex items-center gap-2">
          <SparklesIcon className="h-5 w-5 text-primary" />
          <span>AI Lesson Generator</span>
        </div>
      }
      subtitle="Generate engaging, standards-aligned lessons with AI"
    >
      {/* Tabs */}
      <div className="mb-6 flex border-b border-border">
        <TabButton active={activeTab === 'form'} onClick={() => setActiveTab('form')}>
          Configuration
        </TabButton>
        <TabButton
          active={activeTab === 'preview'}
          onClick={() => setActiveTab('preview')}
          disabled={!generatedLesson}
        >
          Preview
        </TabButton>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-700 dark:bg-red-900/20 dark:text-red-400">
          <div className="flex items-center gap-2">
            <ErrorIcon className="h-5 w-5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Form */}
      {activeTab === 'form' && (
        <div className="space-y-6">
          {/* Subject & Topic */}
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Subject" required>
              <select
                value={formData.subject}
                onChange={(e) => handleInputChange('subject', e.target.value)}
                className="form-select"
              >
                <option value="">Select subject...</option>
                {SUBJECTS.map((subject) => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Topic" required>
              <input
                type="text"
                value={formData.topic}
                onChange={(e) => handleInputChange('topic', e.target.value)}
                placeholder="e.g., Photosynthesis, Fractions, The Civil War"
                className="form-input"
              />
            </FormField>
          </div>

          {/* Grade Level */}
          <FormField label="Grade Level" required>
            <select
              value={formData.gradeLevel}
              onChange={(e) => handleInputChange('gradeLevel', e.target.value)}
              className="form-select"
            >
              <option value="">Select grade level...</option>
              {GRADE_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </FormField>

          {/* Learning Objectives */}
          <FormField label="Learning Objectives" hint="What should students learn?">
            <div className="space-y-2">
              {formData.objectives.map((objective, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={objective}
                    onChange={(e) => handleObjectiveChange(index, e.target.value)}
                    placeholder={`Objective ${index + 1}`}
                    className="form-input flex-1"
                  />
                  {formData.objectives.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveObjective(index)}
                      aria-label="Remove objective"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="secondary" size="sm" onClick={handleAddObjective}>
                + Add Objective
              </Button>
            </div>
          </FormField>

          {/* Duration & Difficulty */}
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Duration" hint="Minutes">
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="15"
                  max="90"
                  step="5"
                  value={formData.duration}
                  onChange={(e) => handleInputChange('duration', parseInt(e.target.value, 10))}
                  className="flex-1"
                />
                <span className="w-16 text-center font-medium">{formData.duration} min</span>
              </div>
            </FormField>

            <FormField label="Difficulty" hint="1-5 scale">
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={formData.difficulty}
                  onChange={(e) => handleInputChange('difficulty', parseInt(e.target.value, 10))}
                  className="flex-1"
                />
                <span className="w-16 text-center font-medium">
                  {['Easy', 'Basic', 'Medium', 'Hard', 'Expert'][formData.difficulty - 1]}
                </span>
              </div>
            </FormField>
          </div>

          {/* Learning Style */}
          <FormField label="Learning Style" hint="Optional personalization">
            <div className="flex flex-wrap gap-2">
              {LEARNING_STYLES.map(({ value, label, icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    handleInputChange(
                      'learningStyle',
                      formData.learningStyle === value ? undefined : value
                    )
                  }
                  className={cn(
                    'rounded-lg border px-3 py-2 text-sm transition-colors',
                    formData.learningStyle === value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  {icon} {label}
                </button>
              ))}
            </div>
          </FormField>

          {/* Include Assessment */}
          <FormField>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.includeAssessment}
                onChange={(e) => handleInputChange('includeAssessment', e.target.checked)}
                className="form-checkbox"
              />
              <span>Include assessment questions</span>
            </label>
          </FormField>

          {/* Generate Button */}
          <div className="flex justify-end gap-3">
            <Button
              variant="primary"
              size="lg"
              onClick={handleGenerate}
              disabled={!isValid || isGenerating}
            >
              {isGenerating ? (
                <>
                  <LoadingSpinner />
                  Generating...
                </>
              ) : (
                <>
                  <SparklesIcon className="h-5 w-5" />
                  Generate Lesson
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Preview */}
      {activeTab === 'preview' && generatedLesson && (
        <LessonPreview lesson={generatedLesson} onReset={handleReset} />
      )}
    </Card>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ────────────────────────────────────────────────────────────────────────────

function FormField({
  label,
  required,
  hint,
  children,
}: {
  label?: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-text">
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
          {hint && <span className="ml-2 text-xs text-muted">({hint})</span>}
        </label>
      )}
      {children}
    </div>
  );
}

function TabButton({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'border-b-2 px-4 py-2 text-sm font-medium transition-colors',
        active
          ? 'border-primary text-primary'
          : 'border-transparent text-muted hover:text-text',
        disabled && 'cursor-not-allowed opacity-50'
      )}
    >
      {children}
    </button>
  );
}

function LessonPreview({
  lesson,
  onReset,
}: {
  lesson: GeneratedLesson;
  onReset: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-text">{lesson.title}</h2>
        <div className="mt-1 flex flex-wrap gap-2 text-sm text-muted">
          <span>{lesson.subject}</span>
          <span>•</span>
          <span>{lesson.topic}</span>
        </div>
      </div>

      {/* Objectives */}
      {lesson.objectives.length > 0 && (
        <div>
          <h3 className="mb-2 font-semibold text-text">Learning Objectives</h3>
          <ul className="list-inside list-disc space-y-1 text-sm text-muted">
            {lesson.objectives.map((obj, i) => (
              <li key={i}>{obj}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Lesson Content */}
      <div>
        <h3 className="mb-3 font-semibold text-text">Lesson Content</h3>
        <div className="space-y-4">
          {lesson.blocks.map((block) => (
            <LessonBlockCard key={block.id} block={block} />
          ))}
        </div>
      </div>

      {/* Vocabulary */}
      {lesson.vocabulary.length > 0 && (
        <div>
          <h3 className="mb-2 font-semibold text-text">Vocabulary</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {lesson.vocabulary.map((item, i) => (
              <div key={i} className="rounded-lg bg-surface-muted p-3">
                <div className="font-medium text-text">{item.term}</div>
                <div className="text-sm text-muted">{item.definition}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assessment Questions */}
      {lesson.assessmentQuestions.length > 0 && (
        <div>
          <h3 className="mb-2 font-semibold text-text">Assessment Questions</h3>
          <div className="space-y-3">
            {lesson.assessmentQuestions.map((q, i) => (
              <div key={q.id} className="rounded-lg border border-border p-3">
                <div className="font-medium text-text">
                  {i + 1}. {q.questionText}
                </div>
                {q.options && (
                  <ul className="mt-2 space-y-1 pl-4 text-sm text-muted">
                    {q.options.map((opt, j) => (
                      <li key={j} className={opt === q.correctAnswer ? 'text-green-600' : ''}>
                        {String.fromCharCode(65 + j)}. {opt}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metadata */}
      {lesson.metadata && (
        <div className="rounded-lg bg-surface-muted p-3 text-xs text-muted">
          <span className="font-medium">AI Generated:</span> Model: {lesson.metadata.model} •
          Tokens: {lesson.metadata.tokensUsed} • Time: {lesson.metadata.latencyMs}ms
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between border-t border-border pt-4">
        <Button variant="secondary" onClick={onReset}>
          Generate Another
        </Button>
        <div className="flex gap-2">
          <Button variant="secondary">
            <DownloadIcon className="h-4 w-4" />
            Export
          </Button>
          <Button variant="primary">
            <SaveIcon className="h-4 w-4" />
            Save to Library
          </Button>
        </div>
      </div>
    </div>
  );
}

function LessonBlockCard({ block }: { block: LessonBlock }) {
  const typeConfig: Record<string, { label: string; color: string; icon: string }> = {
    text: { label: 'Content', color: 'bg-blue-100 text-blue-700', icon: '📝' },
    activity: { label: 'Activity', color: 'bg-green-100 text-green-700', icon: '🎯' },
    media: { label: 'Media', color: 'bg-purple-100 text-purple-700', icon: '🎬' },
    discussion: { label: 'Discussion', color: 'bg-yellow-100 text-yellow-700', icon: '💬' },
    example: { label: 'Example', color: 'bg-orange-100 text-orange-700', icon: '💡' },
    practice: { label: 'Practice', color: 'bg-pink-100 text-pink-700', icon: '✏️' },
  };

  const config = typeConfig[block.type] ?? typeConfig.text;

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', config.color)}>
          {config.icon} {config.label}
        </span>
        {block.duration && <span className="text-xs text-muted">{block.duration} min</span>}
      </div>
      <div className="prose prose-sm max-w-none text-text">{block.content}</div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// ICONS
// ────────────────────────────────────────────────────────────────────────────

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path d="M7 3a1 1 0 00-.707.293l-4 4a1 1 0 00.708 1.414l.999-.999V17a1 1 0 001 1h10a1 1 0 001-1V7.707l.999.999a1 1 0 001.414-1.414l-4-4A1 1 0 0013 3H7zM6 9h8v7H6V9z" />
    </svg>
  );
}

function ErrorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
      />
    </svg>
  );
}

function SaveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
      />
    </svg>
  );
}

function LoadingSpinner() {
  return (
    <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
