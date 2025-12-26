'use client';

/**
 * Question Card
 * 
 * Displays a question in the assessment builder list.
 * Supports drag-and-drop reordering.
 */

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  GripVertical,
  MoreVertical,
  Pencil,
  Copy,
  Trash2,
  CheckCircle2,
  ListChecks,
  ToggleLeft,
  Type,
  FileText,
  SplitSquareVertical,
  ArrowUpDown,
  SortAsc,
  Hash,
  MousePointerClick,
  Move,
  Code,
  Calculator,
  AlertCircle,
} from 'lucide-react';

import type { Question, QuestionType } from './types';

// ============================================================================
// PROPS
// ============================================================================

interface QuestionCardProps {
  question: Question;
  index: number;
  onEdit?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  error?: string[];
  isDragging?: boolean;
}

// ============================================================================
// QUESTION TYPE CONFIG
// ============================================================================

const questionTypeConfig: Record<QuestionType, { icon: React.ElementType; label: string; color: string }> = {
  MULTIPLE_CHOICE: { icon: CheckCircle2, label: 'Multiple Choice', color: 'bg-blue-100 text-blue-700' },
  MULTIPLE_SELECT: { icon: ListChecks, label: 'Multiple Select', color: 'bg-indigo-100 text-indigo-700' },
  TRUE_FALSE: { icon: ToggleLeft, label: 'True/False', color: 'bg-green-100 text-green-700' },
  SHORT_ANSWER: { icon: Type, label: 'Short Answer', color: 'bg-yellow-100 text-yellow-700' },
  ESSAY: { icon: FileText, label: 'Essay', color: 'bg-orange-100 text-orange-700' },
  FILL_BLANK: { icon: SplitSquareVertical, label: 'Fill in Blank', color: 'bg-purple-100 text-purple-700' },
  MATCHING: { icon: ArrowUpDown, label: 'Matching', color: 'bg-pink-100 text-pink-700' },
  ORDERING: { icon: SortAsc, label: 'Ordering', color: 'bg-cyan-100 text-cyan-700' },
  NUMERIC: { icon: Hash, label: 'Numeric', color: 'bg-teal-100 text-teal-700' },
  HOTSPOT: { icon: MousePointerClick, label: 'Hotspot', color: 'bg-rose-100 text-rose-700' },
  DRAG_DROP: { icon: Move, label: 'Drag & Drop', color: 'bg-amber-100 text-amber-700' },
  CODE: { icon: Code, label: 'Code', color: 'bg-gray-100 text-gray-700' },
  MATH_EQUATION: { icon: Calculator, label: 'Math Equation', color: 'bg-violet-100 text-violet-700' },
};

// ============================================================================
// COMPONENT
// ============================================================================

export function QuestionCard({
  question,
  index,
  onEdit,
  onDelete,
  onDuplicate,
  error,
  isDragging = false,
}: QuestionCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: question.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const typeConfig = questionTypeConfig[question.type] ?? {
    icon: FileText,
    label: question.type,
    color: 'bg-gray-100 text-gray-700',
  };

  const Icon = typeConfig.icon;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${isDragging || isSortableDragging ? 'opacity-50' : ''}`}
    >
      <Card className={`${error?.length ? 'border-red-300' : ''}`}>
        <CardContent className="flex items-start gap-4 p-4">
          {/* Drag Handle */}
          <button
            className="mt-1 cursor-grab touch-none text-muted-foreground hover:text-foreground focus:outline-none"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-5 w-5" />
          </button>

          {/* Question Number */}
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
            {index + 1}
          </div>

          {/* Question Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="secondary" className={`${typeConfig.color} shrink-0`}>
                <Icon className="mr-1 h-3 w-3" />
                {typeConfig.label}
              </Badge>
              <Badge variant="outline" className="shrink-0">
                {question.points} {question.points === 1 ? 'pt' : 'pts'}
              </Badge>
              <Badge
                variant="outline"
                className={`shrink-0 ${
                  question.difficulty === 'EASY'
                    ? 'text-green-600'
                    : question.difficulty === 'HARD'
                    ? 'text-red-600'
                    : 'text-yellow-600'
                }`}
              >
                {question.difficulty}
              </Badge>
              {error?.length ? (
                <Badge variant="destructive" className="shrink-0">
                  <AlertCircle className="mr-1 h-3 w-3" />
                  Has errors
                </Badge>
              ) : null}
            </div>

            <p className="line-clamp-2 text-sm">
              {question.stem || <span className="text-muted-foreground italic">No question text</span>}
            </p>

            {/* Tags */}
            {question.tags?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {question.tags.slice(0, 3).map(tag => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {question.tags.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{question.tags.length - 3} more
                  </Badge>
                )}
              </div>
            )}

            {/* Error Messages */}
            {error?.length ? (
              <div className="mt-2 text-xs text-red-600">
                {error.map((e, i) => (
                  <div key={i}>• {e}</div>
                ))}
              </div>
            ) : null}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={onEdit} title="Edit">
              <Pencil className="h-4 w-4" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDuplicate}>
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDelete} className="text-red-600">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
