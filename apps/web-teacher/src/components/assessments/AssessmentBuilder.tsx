'use client';

/**
 * Assessment Builder
 * 
 * Main component for creating and editing assessments.
 * Features:
 * - Drag-and-drop question ordering
 * - Multiple question types
 * - Real-time preview
 * - Auto-save
 * - Settings panel
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useDebounce } from 'use-debounce';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  Settings,
  Eye,
  Save,
  Undo,
  Redo,
  MoreVertical,
  GripVertical,
  Trash2,
  Copy,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  BookOpen,
  AlertTriangle,
} from 'lucide-react';

import { QuestionEditor } from './QuestionEditor';
import { QuestionCard } from './QuestionCard';
import { AssessmentSettings } from './AssessmentSettings';
import { QuestionPalette } from './QuestionPalette';
import { PreviewPanel } from './PreviewPanel';
import { useAssessmentBuilder } from './useAssessmentBuilder';
import type {
  Assessment,
  Question,
  QuestionType,
  BuilderState,
} from './types';

// ============================================================================
// PROPS
// ============================================================================

interface AssessmentBuilderProps {
  assessmentId?: string;
  tenantId: string;
  onSave?: (assessment: Assessment) => Promise<void>;
  onPublish?: (assessment: Assessment) => Promise<void>;
  onClose?: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function AssessmentBuilder({
  assessmentId,
  tenantId,
  onSave,
  onPublish,
  onClose,
}: AssessmentBuilderProps) {
  // State
  const [activeTab, setActiveTab] = useState<'build' | 'preview' | 'settings'>('build');
  const [showQuestionEditor, setShowQuestionEditor] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Custom hook for assessment state management
  const {
    assessment,
    isDirty,
    isSaving,
    errors,
    canUndo,
    canRedo,
    
    // Actions
    updateAssessment,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    reorderQuestions,
    duplicateQuestion,
    updateSettings,
    save,
    undo,
    redo,
    validate,
  } = useAssessmentBuilder({ assessmentId, tenantId });

  // Auto-save with debounce
  const [debouncedAssessment] = useDebounce(assessment, 2000);
  
  useEffect(() => {
    if (isDirty && debouncedAssessment) {
      save();
    }
  }, [debouncedAssessment, isDirty, save]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // DnD handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const oldIndex = assessment.questions.findIndex(q => q.id === active.id);
    const newIndex = assessment.questions.findIndex(q => q.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      reorderQuestions(oldIndex, newIndex);
    }
  }, [assessment.questions, reorderQuestions]);

  // Question handlers
  const handleAddQuestion = useCallback((type: QuestionType) => {
    const newQuestion = createEmptyQuestion(type);
    addQuestion(newQuestion);
    setEditingQuestion(newQuestion);
    setShowQuestionEditor(true);
  }, [addQuestion]);

  const handleEditQuestion = useCallback((question: Question) => {
    setEditingQuestion(question);
    setShowQuestionEditor(true);
  }, []);

  const handleSaveQuestion = useCallback((question: Question) => {
    if (editingQuestion) {
      updateQuestion(question);
    }
    setShowQuestionEditor(false);
    setEditingQuestion(null);
  }, [editingQuestion, updateQuestion]);

  const handleDeleteQuestion = useCallback((questionId: string) => {
    deleteQuestion(questionId);
    if (editingQuestion?.id === questionId) {
      setShowQuestionEditor(false);
      setEditingQuestion(null);
    }
  }, [deleteQuestion, editingQuestion]);

  const handleDuplicateQuestion = useCallback((questionId: string) => {
    duplicateQuestion(questionId);
  }, [duplicateQuestion]);

  const handlePublish = useCallback(async () => {
    const validationErrors = validate();
    if (validationErrors.length > 0) {
      // Show validation errors
      return;
    }
    
    if (onPublish) {
      await onPublish(assessment);
    }
  }, [assessment, validate, onPublish]);

  // Calculate totals
  const totalPoints = useMemo(() => {
    return assessment.questions.reduce((sum, q) => sum + q.points, 0);
  }, [assessment.questions]);

  const questionCount = assessment.questions.length;

  // Active question for drag overlay
  const activeQuestion = useMemo(() => {
    if (!activeId) return null;
    return assessment.questions.find(q => q.id === activeId) ?? null;
  }, [activeId, assessment.questions]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <XCircle className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">{assessment.name || 'Untitled Assessment'}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant={assessment.status === 'PUBLISHED' ? 'default' : 'secondary'}>
                {assessment.status}
              </Badge>
              <span>•</span>
              <span>{questionCount} questions</span>
              <span>•</span>
              <span>{totalPoints} points</span>
              {isDirty && (
                <>
                  <span>•</span>
                  <span className="text-yellow-600">Unsaved changes</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={undo}
            disabled={!canUndo}
            title="Undo"
          >
            <Undo className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={redo}
            disabled={!canRedo}
            title="Redo"
          >
            <Redo className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="h-6" />

          <Button
            variant="outline"
            onClick={() => save()}
            disabled={!isDirty || isSaving}
          >
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>

          <Button onClick={handlePublish} disabled={assessment.status === 'PUBLISHED'}>
            <CheckCircle className="mr-2 h-4 w-4" />
            Publish
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Question Palette */}
        <aside className="w-64 border-r bg-muted/30">
          <QuestionPalette onAddQuestion={handleAddQuestion} />
        </aside>

        {/* Main Area */}
        <main className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex h-full flex-col">
            <TabsList className="mx-6 mt-4 w-fit">
              <TabsTrigger value="build">
                <FileText className="mr-2 h-4 w-4" />
                Build
              </TabsTrigger>
              <TabsTrigger value="preview">
                <Eye className="mr-2 h-4 w-4" />
                Preview
              </TabsTrigger>
              <TabsTrigger value="settings">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="build" className="flex-1 overflow-hidden p-6">
              <ScrollArea className="h-full">
                {/* Validation Errors */}
                {Object.keys(errors).length > 0 && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Please fix the following issues before publishing:
                      <ul className="mt-2 list-inside list-disc">
                        {Object.entries(errors).map(([key, messages]) => (
                          <li key={key}>{messages.join(', ')}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Questions List */}
                {assessment.questions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <BookOpen className="mb-4 h-12 w-12 text-muted-foreground" />
                    <h3 className="mb-2 text-lg font-medium">No questions yet</h3>
                    <p className="mb-4 text-muted-foreground">
                      Drag a question type from the sidebar or click the button below to get started.
                    </p>
                    <Button onClick={() => handleAddQuestion('MULTIPLE_CHOICE')}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Question
                    </Button>
                  </div>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={assessment.questions.map(q => q.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-4">
                        {assessment.questions.map((question, index) => (
                          <QuestionCard
                            key={question.id}
                            question={question}
                            index={index}
                            onEdit={() => handleEditQuestion(question)}
                            onDelete={() => handleDeleteQuestion(question.id)}
                            onDuplicate={() => handleDuplicateQuestion(question.id)}
                            error={errors[question.id]}
                          />
                        ))}
                      </div>
                    </SortableContext>

                    <DragOverlay>
                      {activeQuestion && (
                        <QuestionCard
                          question={activeQuestion}
                          index={0}
                          isDragging
                        />
                      )}
                    </DragOverlay>
                  </DndContext>
                )}

                {/* Add Question Button */}
                {assessment.questions.length > 0 && (
                  <div className="mt-6 flex justify-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline">
                          <Plus className="mr-2 h-4 w-4" />
                          Add Question
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuLabel>Question Type</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleAddQuestion('MULTIPLE_CHOICE')}>
                          Multiple Choice
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleAddQuestion('MULTIPLE_SELECT')}>
                          Multiple Select
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleAddQuestion('TRUE_FALSE')}>
                          True/False
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleAddQuestion('SHORT_ANSWER')}>
                          Short Answer
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleAddQuestion('ESSAY')}>
                          Essay
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleAddQuestion('FILL_BLANK')}>
                          Fill in the Blank
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleAddQuestion('MATCHING')}>
                          Matching
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleAddQuestion('ORDERING')}>
                          Ordering
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="preview" className="flex-1 overflow-hidden p-6">
              <PreviewPanel assessment={assessment} />
            </TabsContent>

            <TabsContent value="settings" className="flex-1 overflow-hidden p-6">
              <AssessmentSettings
                assessment={assessment}
                onUpdate={updateAssessment}
                onUpdateSettings={updateSettings}
              />
            </TabsContent>
          </Tabs>
        </main>
      </div>

      {/* Question Editor Sheet */}
      <Sheet open={showQuestionEditor} onOpenChange={setShowQuestionEditor}>
        <SheetContent side="right" className="w-[600px] sm:max-w-[600px]">
          <SheetHeader>
            <SheetTitle>
              {editingQuestion ? 'Edit Question' : 'New Question'}
            </SheetTitle>
            <SheetDescription>
              Configure your question settings and content.
            </SheetDescription>
          </SheetHeader>
          
          {editingQuestion && (
            <QuestionEditor
              question={editingQuestion}
              onSave={handleSaveQuestion}
              onCancel={() => {
                setShowQuestionEditor(false);
                setEditingQuestion(null);
              }}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function createEmptyQuestion(type: QuestionType): Question {
  const baseQuestion: Question = {
    id: crypto.randomUUID(),
    type,
    stem: '',
    points: 1,
    difficulty: 'MEDIUM',
    tags: [],
  };

  switch (type) {
    case 'MULTIPLE_CHOICE':
      return {
        ...baseQuestion,
        options: [
          { id: crypto.randomUUID(), text: '', isCorrect: true },
          { id: crypto.randomUUID(), text: '', isCorrect: false },
          { id: crypto.randomUUID(), text: '', isCorrect: false },
          { id: crypto.randomUUID(), text: '', isCorrect: false },
        ],
        correctOption: 0,
      };

    case 'MULTIPLE_SELECT':
      return {
        ...baseQuestion,
        options: [
          { id: crypto.randomUUID(), text: '', isCorrect: false },
          { id: crypto.randomUUID(), text: '', isCorrect: false },
          { id: crypto.randomUUID(), text: '', isCorrect: false },
          { id: crypto.randomUUID(), text: '', isCorrect: false },
        ],
        correctOptions: [],
        partialCredit: true,
      };

    case 'TRUE_FALSE':
      return {
        ...baseQuestion,
        options: [
          { id: crypto.randomUUID(), text: 'True', isCorrect: true },
          { id: crypto.randomUUID(), text: 'False', isCorrect: false },
        ],
        correctAnswer: true,
      };

    case 'SHORT_ANSWER':
      return {
        ...baseQuestion,
        correctAnswer: '',
      };

    case 'ESSAY':
      return {
        ...baseQuestion,
        points: 10,
        rubricId: undefined,
      };

    case 'FILL_BLANK':
      return {
        ...baseQuestion,
        stem: 'The capital of France is ____.',
        blanks: [
          {
            id: crypto.randomUUID(),
            position: 0,
            correctAnswers: ['Paris'],
            caseSensitive: false,
          },
        ],
      };

    case 'MATCHING':
      return {
        ...baseQuestion,
        pairs: [
          { id: crypto.randomUUID(), left: '', right: '' },
          { id: crypto.randomUUID(), left: '', right: '' },
        ],
        partialCredit: true,
      };

    case 'ORDERING':
      return {
        ...baseQuestion,
        correctOrder: [],
        options: [
          { id: crypto.randomUUID(), text: '', isCorrect: false },
          { id: crypto.randomUUID(), text: '', isCorrect: false },
          { id: crypto.randomUUID(), text: '', isCorrect: false },
        ],
        partialCredit: true,
      };

    case 'NUMERIC':
      return {
        ...baseQuestion,
        correctAnswer: 0,
        tolerance: 0,
        unit: '',
      };

    case 'CODE':
      return {
        ...baseQuestion,
        points: 10,
        language: 'javascript',
        starterCode: '',
        testCases: [],
      };

    default:
      return baseQuestion;
  }
}

export default AssessmentBuilder;
