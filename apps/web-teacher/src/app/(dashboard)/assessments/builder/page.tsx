'use client';

/**
 * Assessment Builder Page
 *
 * Full-featured assessment builder interface for teachers
 * Features:
 * - Assessment settings (title, subject, grade, timing)
 * - Question editor with multiple question types
 * - Question bank integration
 * - Rubric builder for project-based assessments
 * - Auto-grading configuration
 * - Preview and publish controls
 */

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Loader2,
  Save,
  Send,
  Eye,
  AlertCircle,
  CheckCircle,
  Users,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  AssessmentSettings,
  QuestionEditor,
  QuestionBank,
  RubricBuilder,
  AutoGradingConfig,
} from '@/components/assessment';
import { useAssessmentBuilder } from '@/hooks/useAssessmentBuilder';
import type { Question } from '@/lib/types';

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

interface ClassOption {
  id: string;
  name: string;
  studentCount: number;
}

// ════════════════════════════════════════════════════════════════════════════
// MOCK DATA
// ════════════════════════════════════════════════════════════════════════════

const MOCK_CLASSES: ClassOption[] = [
  { id: '1', name: 'Math 101 - Period 1', studentCount: 28 },
  { id: '2', name: 'Math 101 - Period 2', studentCount: 25 },
  { id: '3', name: 'Algebra I - Period 3', studentCount: 30 },
  { id: '4', name: 'Geometry - Period 5', studentCount: 24 },
];

// ════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════

export default function AssessmentBuilderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const assessmentId = searchParams.get('id') || undefined;

  const {
    assessment,
    setAssessment,
    loading,
    saving,
    error,
    isDirty,
    addQuestion,
    updateQuestion,
    removeQuestion,
    saveAssessment,
    publishAssessment,
    assignToClass,
    isValid,
    validationErrors,
  } = useAssessmentBuilder({ assessmentId, autoSave: true });

  const [showPreview, setShowPreview] = React.useState(false);
  const [showAssignModal, setShowAssignModal] = React.useState(false);
  const [selectedClassId, setSelectedClassId] = React.useState<string>('');
  const [dueDate, setDueDate] = React.useState<string>('');
  const [assigning, setAssigning] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);

  // Show save success message temporarily
  React.useEffect(() => {
    if (saveSuccess) {
      const timer = setTimeout(() => setSaveSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [saveSuccess]);

  // ══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ══════════════════════════════════════════════════════════════════════════

  const handleAddQuestion = (question: Omit<Question, 'id' | 'order'>) => {
    addQuestion(question);
  };

  const handleSave = async () => {
    const result = await saveAssessment();
    if (result) {
      setSaveSuccess(true);
    }
  };

  const handlePublish = async () => {
    const result = await publishAssessment();
    if (result) {
      router.push('/assessments');
    }
  };

  const handleAssign = async () => {
    if (!selectedClassId) return;

    setAssigning(true);
    try {
      await assignToClass(selectedClassId, dueDate ? new Date(dueDate) : null);
      setShowAssignModal(false);
      setSelectedClassId('');
      setDueDate('');
    } catch {
      // Error is handled by the hook
    } finally {
      setAssigning(false);
    }
  };

  const createNewQuestion = () => {
    addQuestion({
      type: 'multiple-choice',
      text: '',
      options: [
        { id: crypto.randomUUID(), text: '', isCorrect: false },
        { id: crypto.randomUUID(), text: '', isCorrect: false },
        { id: crypto.randomUUID(), text: '', isCorrect: false },
        { id: crypto.randomUUID(), text: '', isCorrect: false },
      ],
      correctAnswer: null,
      points: 1,
    });
  };

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-purple-600" />
          <p className="mt-2 text-sm text-gray-500">Loading assessment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      {/* Header */}
      <header className="flex items-center justify-between border-b bg-white px-6 py-4">
        <div className="flex items-center gap-4">
          <Link href="/assessments">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Assessments
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-semibold">
              {assessmentId ? 'Edit Assessment' : 'Create Assessment'}
            </h1>
            <p className="text-sm text-gray-500">
              Build a custom assessment for your students
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Save Status */}
          {saveSuccess && (
            <span className="flex items-center gap-1 text-sm text-green-600">
              <CheckCircle className="h-4 w-4" />
              Saved
            </span>
          )}
          {isDirty && !saving && (
            <span className="text-sm text-gray-500">Unsaved changes</span>
          )}
          {saving && (
            <span className="flex items-center gap-1 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </span>
          )}

          {/* Actions */}
          <Button variant="outline" size="sm" onClick={() => setShowPreview(true)}>
            <Eye className="mr-2 h-4 w-4" />
            Preview
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={saving || !isDirty}
          >
            <Save className="mr-2 h-4 w-4" />
            Save Draft
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={() => setShowAssignModal(true)}
            disabled={!isValid}
            className="bg-green-600 hover:bg-green-700"
          >
            <Users className="mr-2 h-4 w-4" />
            Assign
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={handlePublish}
            disabled={!isValid || saving}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Send className="mr-2 h-4 w-4" />
            Publish
          </Button>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-3">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error.message}</span>
          </div>
        </div>
      )}

      {/* Validation Errors */}
      {validationErrors.length > 0 && !isValid && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-3">
          <div className="flex items-start gap-2 text-yellow-700">
            <AlertCircle className="h-4 w-4 mt-0.5" />
            <div className="text-sm">
              <span className="font-medium">Please fix the following issues:</span>
              <ul className="mt-1 list-disc list-inside">
                {validationErrors.slice(0, 3).map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
                {validationErrors.length > 3 && (
                  <li>...and {validationErrors.length - 3} more</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Main Editor */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Settings */}
            <AssessmentSettings
              assessment={assessment}
              onChange={(updates) => setAssessment((prev) => ({ ...prev, ...updates }))}
            />

            {/* Questions */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Questions</h2>
                  <p className="text-sm text-gray-500">
                    {assessment.questions.length} question
                    {assessment.questions.length !== 1 ? 's' : ''} •{' '}
                    {assessment.questions.reduce((sum, q) => sum + q.points, 0)} total points
                  </p>
                </div>
              </div>

              {assessment.questions.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                  <p className="text-gray-500 mb-4">No questions yet</p>
                  <Button onClick={createNewQuestion}>Add Your First Question</Button>
                </div>
              ) : (
                <>
                  {assessment.questions.map((question, index) => (
                    <QuestionEditor
                      key={question.id}
                      question={question}
                      index={index}
                      onUpdate={(updates) => updateQuestion(question.id, updates)}
                      onRemove={() => removeQuestion(question.id)}
                    />
                  ))}

                  <button
                    type="button"
                    onClick={createNewQuestion}
                    className="w-full py-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-purple-500 hover:text-purple-600 font-semibold transition-colors"
                  >
                    + Add Question
                  </button>
                </>
              )}
            </div>

            {/* Rubric (for project type) */}
            {assessment.type === 'project' && (
              <RubricBuilder
                rubric={assessment.rubric}
                onChange={(rubric) => setAssessment((prev) => ({ ...prev, rubric }))}
              />
            )}

            {/* Auto-Grading Config */}
            {assessment.autoGrade && (
              <AutoGradingConfig
                config={assessment.autoGradeConfig}
                onChange={(config) =>
                  setAssessment((prev) => ({ ...prev, autoGradeConfig: config }))
                }
              />
            )}
          </div>
        </main>

        {/* Sidebar */}
        <aside className="w-96 overflow-y-auto border-l bg-white">
          <div className="p-6 space-y-6">
            {/* Question Bank */}
            <QuestionBank
              subject={assessment.subject}
              gradeLevel={assessment.gradeLevel}
              onAddQuestion={handleAddQuestion}
            />

            {/* Quick Stats */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <h3 className="font-semibold text-gray-900">Assessment Summary</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-white rounded-lg p-3">
                  <div className="text-2xl font-bold text-purple-600">
                    {assessment.questions.length}
                  </div>
                  <div className="text-gray-500">Questions</div>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <div className="text-2xl font-bold text-green-600">
                    {assessment.questions.reduce((sum, q) => sum + q.points, 0)}
                  </div>
                  <div className="text-gray-500">Total Points</div>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <div className="text-2xl font-bold text-blue-600">
                    {assessment.timeLimit || '∞'}
                  </div>
                  <div className="text-gray-500">Minutes</div>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <div className="text-2xl font-bold text-orange-600">
                    {assessment.passingScore || 70}%
                  </div>
                  <div className="text-gray-500">To Pass</div>
                </div>
              </div>
            </div>

            {/* Question Type Distribution */}
            {assessment.questions.length > 0 && (
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <h3 className="font-semibold text-gray-900">Question Types</h3>
                <div className="space-y-2">
                  {Object.entries(
                    assessment.questions.reduce(
                      (acc, q) => {
                        acc[q.type] = (acc[q.type] || 0) + 1;
                        return acc;
                      },
                      {} as Record<string, number>
                    )
                  ).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 capitalize">
                        {type.replace('-', ' ')}
                      </span>
                      <span className="font-medium text-gray-900">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-xl font-bold">Assessment Preview</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowPreview(false)}>
                Close
              </Button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {assessment.title || 'Untitled Assessment'}
                  </h1>
                  <p className="text-gray-500 mt-1">
                    {assessment.subject} • {assessment.gradeLevel}
                    {assessment.timeLimit && ` • ${assessment.timeLimit} minutes`}
                  </p>
                </div>

                {assessment.description && (
                  <p className="text-gray-600">{assessment.description}</p>
                )}

                <div className="border-t pt-6 space-y-6">
                  {assessment.questions.map((question, index) => (
                    <div key={question.id} className="border rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <span className="font-bold text-purple-600">{index + 1}.</span>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{question.text || '(No question text)'}</p>
                          <p className="text-sm text-gray-500 mt-1">{question.points} point(s)</p>

                          {question.type === 'multiple-choice' && question.options && (
                            <div className="mt-3 space-y-2">
                              {question.options.map((opt, optIndex) => (
                                <div
                                  key={opt.id}
                                  className="flex items-center gap-2"
                                >
                                  <span className="w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center text-sm">
                                    {String.fromCharCode(65 + optIndex)}
                                  </span>
                                  <span className="text-gray-700">
                                    {opt.text || '(Empty option)'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                          {question.type === 'true-false' && (
                            <div className="mt-3 flex gap-4">
                              <span className="text-gray-700">○ True</span>
                              <span className="text-gray-700">○ False</span>
                            </div>
                          )}

                          {(question.type === 'short-answer' || question.type === 'essay') && (
                            <div className="mt-3">
                              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-gray-400 text-sm">
                                {question.type === 'essay'
                                  ? 'Student will write their essay here...'
                                  : 'Student will type their answer here...'}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign to Class Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b">
              <h2 className="text-xl font-bold">Assign to Class</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label htmlFor="select-class" className="block text-sm font-medium text-gray-700 mb-2">
                  Select Class
                </label>
                <select
                  id="select-class"
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">Choose a class...</option>
                  {MOCK_CLASSES.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} ({cls.studentCount} students)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="due-date" className="block text-sm font-medium text-gray-700 mb-2">
                  Due Date (optional)
                </label>
                <input
                  type="datetime-local"
                  id="due-date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedClassId('');
                  setDueDate('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAssign}
                disabled={!selectedClassId || assigning}
                className="bg-green-600 hover:bg-green-700"
              >
                {assigning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  'Assign Assessment'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
