'use client';

import { Button, Card } from '@aivo/ui-web';
import { useState } from 'react';

import { cn } from '../../lib/cn';
import type { LearningObjectVersion, ContentJson, ContentQuestion } from '../../lib/types';

interface ContentTabProps {
  version: LearningObjectVersion;
  canEdit: boolean;
  onSave: (updates: { contentJson: ContentJson; changeSummary?: string }) => Promise<void>;
}

export function ContentTab({ version, canEdit, onSave }: ContentTabProps) {
  const [content, setContent] = useState<ContentJson>(
    version.contentJson || { type: 'reading_passage' }
  );
  const [changeSummary, setChangeSummary] = useState('');
  const [saving, setSaving] = useState(false);

  const contentType = content.type || 'reading_passage';

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ contentJson: content, changeSummary: changeSummary || undefined });
      setChangeSummary('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Content Type Selector */}
      <Card title="Content Type">
        <div className="flex gap-4">
          {(['reading_passage', 'math_problem', 'generic'] as const).map((type) => (
            <button
              key={type}
              onClick={() => {
                if (canEdit) {
                  setContent((prev) => ({ ...prev, type }));
                }
              }}
              disabled={!canEdit}
              className={cn(
                'rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
                contentType === type
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted hover:bg-surface-muted',
                !canEdit && 'cursor-not-allowed opacity-60'
              )}
            >
              {type === 'reading_passage' && 'Reading Passage'}
              {type === 'math_problem' && 'Math Problem'}
              {type === 'generic' && 'Generic Content'}
            </button>
          ))}
        </div>
      </Card>

      {/* Content Editor based on type */}
      {contentType === 'reading_passage' && (
        <ReadingPassageEditor content={content} canEdit={canEdit} onChange={setContent} />
      )}
      {contentType === 'math_problem' && (
        <MathProblemEditor content={content} canEdit={canEdit} onChange={setContent} />
      )}
      {contentType === 'generic' && (
        <GenericContentEditor content={content} canEdit={canEdit} onChange={setContent} />
      )}

      {/* Save Section */}
      {canEdit && (
        <Card title="Save Changes">
          <div className="space-y-4">
            <div>
              <label htmlFor="changeSummary" className="block text-sm font-medium text-text">
                Change Summary (optional)
              </label>
              <textarea
                id="changeSummary"
                value={changeSummary}
                onChange={(e) => {
                  setChangeSummary(e.target.value);
                }}
                rows={2}
                className="mt-1 block w-full rounded-lg border border-border bg-surface px-3 py-2 text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Describe what you changed..."
              />
            </div>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Content'}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// READING PASSAGE EDITOR
// ══════════════════════════════════════════════════════════════════════════════

interface ReadingPassageEditorProps {
  content: ContentJson;
  canEdit: boolean;
  onChange: (content: ContentJson) => void;
}

function ReadingPassageEditor({ content, canEdit, onChange }: ReadingPassageEditorProps) {
  const questions = content.questions || [];

  const updateField = <K extends keyof ContentJson>(key: K, value: ContentJson[K]) => {
    onChange({ ...content, [key]: value });
  };

  const addQuestion = () => {
    const newQuestion: ContentQuestion = {
      id: `q-${Date.now()}`,
      prompt: '',
      answerChoices: ['', '', '', ''],
      correctIndex: 0,
    };
    onChange({ ...content, questions: [...questions, newQuestion] });
  };

  const updateQuestion = (index: number, updates: Partial<ContentQuestion>) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], ...updates };
    onChange({ ...content, questions: updated });
  };

  const removeQuestion = (index: number) => {
    onChange({ ...content, questions: questions.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-6">
      <Card title="Passage">
        <div className="space-y-4">
          <div>
            <label htmlFor="passageText" className="block text-sm font-medium text-text">
              Passage Text
            </label>
            <textarea
              id="passageText"
              value={content.passageText || ''}
              onChange={(e) => {
                updateField('passageText', e.target.value);
              }}
              disabled={!canEdit}
              rows={8}
              className="mt-1 block w-full rounded-lg border border-border bg-surface px-3 py-2 text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-60"
              placeholder="Enter the reading passage..."
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="lexileLevel" className="block text-sm font-medium text-text">
                Lexile Level
              </label>
              <input
                id="lexileLevel"
                type="number"
                value={content.lexileLevel || ''}
                onChange={(e) => {
                  updateField('lexileLevel', parseInt(e.target.value, 10) || undefined);
                }}
                disabled={!canEdit}
                className="mt-1 block w-full rounded-lg border border-border bg-surface px-3 py-2 text-text focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-60"
                placeholder="e.g., 650"
              />
            </div>
            <div>
              <label htmlFor="readingLevel" className="block text-sm font-medium text-text">
                Reading Level
              </label>
              <input
                id="readingLevel"
                type="text"
                value={content.readingLevel || ''}
                onChange={(e) => {
                  updateField('readingLevel', e.target.value);
                }}
                disabled={!canEdit}
                className="mt-1 block w-full rounded-lg border border-border bg-surface px-3 py-2 text-text focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-60"
                placeholder="e.g., Grade 4"
              />
            </div>
          </div>
        </div>
      </Card>

      <Card
        title="Questions"
        action={
          canEdit && (
            <Button variant="secondary" onClick={addQuestion}>
              Add Question
            </Button>
          )
        }
      >
        {questions.length === 0 ? (
          <p className="text-sm text-muted">No questions yet. Add one to get started.</p>
        ) : (
          <div className="space-y-6">
            {questions.map((question, index) => (
              <QuestionEditor
                key={question.id}
                question={question}
                index={index}
                canEdit={canEdit}
                onChange={(updates) => {
                  updateQuestion(index, updates);
                }}
                onRemove={() => {
                  removeQuestion(index);
                }}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

interface QuestionEditorProps {
  question: ContentQuestion;
  index: number;
  canEdit: boolean;
  onChange: (updates: Partial<ContentQuestion>) => void;
  onRemove: () => void;
}

function QuestionEditor({ question, index, canEdit, onChange, onRemove }: QuestionEditorProps) {
  const updateChoice = (choiceIndex: number, value: string) => {
    const updated = [...question.answerChoices];
    updated[choiceIndex] = value;
    onChange({ answerChoices: updated });
  };

  const addChoice = () => {
    onChange({ answerChoices: [...question.answerChoices, ''] });
  };

  const removeChoice = (choiceIndex: number) => {
    const updated = question.answerChoices.filter((_, i) => i !== choiceIndex);
    const newCorrectIndex =
      question.correctIndex >= choiceIndex && question.correctIndex > 0
        ? question.correctIndex - 1
        : question.correctIndex;
    onChange({
      answerChoices: updated,
      correctIndex: Math.min(newCorrectIndex, updated.length - 1),
    });
  };

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="mb-4 flex items-start justify-between">
        <span className="text-sm font-medium text-muted">Question {index + 1}</span>
        {canEdit && (
          <button onClick={onRemove} className="text-sm text-error hover:underline">
            Remove
          </button>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text">Prompt</label>
          <textarea
            value={question.prompt}
            onChange={(e) => {
              onChange({ prompt: e.target.value });
            }}
            disabled={!canEdit}
            rows={2}
            className="mt-1 block w-full rounded-lg border border-border bg-surface px-3 py-2 text-text focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-60"
            placeholder="Enter the question..."
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium text-text">Answer Choices</label>
            {canEdit && (
              <button onClick={addChoice} className="text-sm text-primary hover:underline">
                Add Choice
              </button>
            )}
          </div>
          <div className="space-y-2">
            {question.answerChoices.map((choice, choiceIndex) => (
              <div key={choiceIndex} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`correct-${question.id}`}
                  checked={question.correctIndex === choiceIndex}
                  onChange={() => {
                    onChange({ correctIndex: choiceIndex });
                  }}
                  disabled={!canEdit}
                  className="h-4 w-4 text-primary focus:ring-primary"
                  aria-label={`Mark choice ${choiceIndex + 1} as correct`}
                />
                <input
                  type="text"
                  value={choice}
                  onChange={(e) => {
                    updateChoice(choiceIndex, e.target.value);
                  }}
                  disabled={!canEdit}
                  className="flex-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-60"
                  placeholder={`Choice ${choiceIndex + 1}`}
                />
                {canEdit && question.answerChoices.length > 2 && (
                  <button
                    onClick={() => {
                      removeChoice(choiceIndex);
                    }}
                    className="text-muted hover:text-error"
                    aria-label="Remove choice"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
          <p className="mt-1 text-xs text-muted">Select the radio button for the correct answer.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-text">Explanation (optional)</label>
          <textarea
            value={question.explanation || ''}
            onChange={(e) => {
              onChange({ explanation: e.target.value });
            }}
            disabled={!canEdit}
            rows={2}
            className="mt-1 block w-full rounded-lg border border-border bg-surface px-3 py-2 text-text focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-60"
            placeholder="Explain why the correct answer is right..."
          />
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MATH PROBLEM EDITOR
// ══════════════════════════════════════════════════════════════════════════════

interface MathProblemEditorProps {
  content: ContentJson;
  canEdit: boolean;
  onChange: (content: ContentJson) => void;
}

function MathProblemEditor({ content, canEdit, onChange }: MathProblemEditorProps) {
  const solutionSteps = content.solutionSteps || [];

  const updateField = <K extends keyof ContentJson>(key: K, value: ContentJson[K]) => {
    onChange({ ...content, [key]: value });
  };

  const addStep = () => {
    onChange({ ...content, solutionSteps: [...solutionSteps, ''] });
  };

  const updateStep = (index: number, value: string) => {
    const updated = [...solutionSteps];
    updated[index] = value;
    onChange({ ...content, solutionSteps: updated });
  };

  const removeStep = (index: number) => {
    onChange({ ...content, solutionSteps: solutionSteps.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-6">
      <Card title="Problem">
        <div className="space-y-4">
          <div>
            <label htmlFor="problemStatement" className="block text-sm font-medium text-text">
              Problem Statement
            </label>
            <textarea
              id="problemStatement"
              value={content.problemStatement || ''}
              onChange={(e) => {
                updateField('problemStatement', e.target.value);
              }}
              disabled={!canEdit}
              rows={4}
              className="mt-1 block w-full rounded-lg border border-border bg-surface px-3 py-2 text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-60"
              placeholder="Enter the math problem..."
            />
          </div>
          <div>
            <label htmlFor="correctAnswer" className="block text-sm font-medium text-text">
              Correct Answer
            </label>
            <input
              id="correctAnswer"
              type="text"
              value={content.correctAnswer || ''}
              onChange={(e) => {
                updateField('correctAnswer', e.target.value);
              }}
              disabled={!canEdit}
              className="mt-1 block w-full rounded-lg border border-border bg-surface px-3 py-2 text-text focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-60"
              placeholder="e.g., 42"
            />
          </div>
        </div>
      </Card>

      <Card
        title="Solution Steps"
        action={
          canEdit && (
            <Button variant="secondary" onClick={addStep}>
              Add Step
            </Button>
          )
        }
      >
        {solutionSteps.length === 0 ? (
          <p className="text-sm text-muted">
            No solution steps. Add them to help learners understand.
          </p>
        ) : (
          <div className="space-y-3">
            {solutionSteps.map((step, index) => (
              <div key={index} className="flex items-start gap-3">
                <span className="mt-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                  {index + 1}
                </span>
                <textarea
                  value={step}
                  onChange={(e) => {
                    updateStep(index, e.target.value);
                  }}
                  disabled={!canEdit}
                  rows={2}
                  className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-60"
                  placeholder={`Step ${index + 1}...`}
                />
                {canEdit && (
                  <button
                    onClick={() => {
                      removeStep(index);
                    }}
                    className="mt-2 text-muted hover:text-error"
                    aria-label="Remove step"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// GENERIC CONTENT EDITOR
// ══════════════════════════════════════════════════════════════════════════════

interface GenericContentEditorProps {
  content: ContentJson;
  canEdit: boolean;
  onChange: (content: ContentJson) => void;
}

function GenericContentEditor({ content, canEdit, onChange }: GenericContentEditorProps) {
  return (
    <Card title="Content">
      <div>
        <label htmlFor="genericContent" className="block text-sm font-medium text-text">
          Content
        </label>
        <textarea
          id="genericContent"
          value={content.content || ''}
          onChange={(e) => {
            onChange({ ...content, content: e.target.value });
          }}
          disabled={!canEdit}
          rows={12}
          className="mt-1 block w-full rounded-lg border border-border bg-surface px-3 py-2 text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-60"
          placeholder="Enter content..."
        />
      </div>
    </Card>
  );
}
