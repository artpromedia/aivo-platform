'use client';

/**
 * Question Palette
 * 
 * Sidebar component showing available question types
 * that can be added to the assessment.
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
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
  BookOpen,
} from 'lucide-react';

import type { QuestionType } from './types';

// ============================================================================
// PROPS
// ============================================================================

interface QuestionPaletteProps {
  onAddQuestion: (type: QuestionType) => void;
}

// ============================================================================
// QUESTION TYPES
// ============================================================================

interface QuestionTypeItem {
  type: QuestionType;
  label: string;
  description: string;
  icon: React.ElementType;
}

const basicQuestionTypes: QuestionTypeItem[] = [
  {
    type: 'MULTIPLE_CHOICE',
    label: 'Multiple Choice',
    description: 'Single correct answer',
    icon: CheckCircle2,
  },
  {
    type: 'MULTIPLE_SELECT',
    label: 'Multiple Select',
    description: 'Multiple correct answers',
    icon: ListChecks,
  },
  {
    type: 'TRUE_FALSE',
    label: 'True/False',
    description: 'Binary choice',
    icon: ToggleLeft,
  },
  {
    type: 'SHORT_ANSWER',
    label: 'Short Answer',
    description: 'Text response',
    icon: Type,
  },
  {
    type: 'ESSAY',
    label: 'Essay',
    description: 'Long-form response',
    icon: FileText,
  },
];

const advancedQuestionTypes: QuestionTypeItem[] = [
  {
    type: 'FILL_BLANK',
    label: 'Fill in the Blank',
    description: 'Complete the sentence',
    icon: SplitSquareVertical,
  },
  {
    type: 'MATCHING',
    label: 'Matching',
    description: 'Pair items together',
    icon: ArrowUpDown,
  },
  {
    type: 'ORDERING',
    label: 'Ordering',
    description: 'Sequence items correctly',
    icon: SortAsc,
  },
  {
    type: 'NUMERIC',
    label: 'Numeric',
    description: 'Number with tolerance',
    icon: Hash,
  },
];

const interactiveQuestionTypes: QuestionTypeItem[] = [
  {
    type: 'HOTSPOT',
    label: 'Hotspot',
    description: 'Click on image region',
    icon: MousePointerClick,
  },
  {
    type: 'DRAG_DROP',
    label: 'Drag & Drop',
    description: 'Move items to zones',
    icon: Move,
  },
  {
    type: 'CODE',
    label: 'Code',
    description: 'Programming question',
    icon: Code,
  },
  {
    type: 'MATH_EQUATION',
    label: 'Math Equation',
    description: 'Mathematical input',
    icon: Calculator,
  },
];

// ============================================================================
// COMPONENT
// ============================================================================

export function QuestionPalette({ onAddQuestion }: QuestionPaletteProps) {
  return (
    <ScrollArea className="h-full">
      <div className="p-4">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
          <BookOpen className="h-4 w-4" />
          Question Types
        </h2>

        {/* Basic Types */}
        <div className="space-y-1">
          <h3 className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Basic
          </h3>
          {basicQuestionTypes.map((item) => (
            <QuestionTypeButton
              key={item.type}
              item={item}
              onClick={() => onAddQuestion(item.type)}
            />
          ))}
        </div>

        <Separator className="my-4" />

        {/* Advanced Types */}
        <div className="space-y-1">
          <h3 className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Advanced
          </h3>
          {advancedQuestionTypes.map((item) => (
            <QuestionTypeButton
              key={item.type}
              item={item}
              onClick={() => onAddQuestion(item.type)}
            />
          ))}
        </div>

        <Separator className="my-4" />

        {/* Interactive Types */}
        <div className="space-y-1">
          <h3 className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Interactive
          </h3>
          {interactiveQuestionTypes.map((item) => (
            <QuestionTypeButton
              key={item.type}
              item={item}
              onClick={() => onAddQuestion(item.type)}
            />
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface QuestionTypeButtonProps {
  item: QuestionTypeItem;
  onClick: () => void;
}

function QuestionTypeButton({ item, onClick }: QuestionTypeButtonProps) {
  const Icon = item.icon;

  return (
    <Button
      variant="ghost"
      className="w-full justify-start h-auto py-2"
      onClick={onClick}
    >
      <Icon className="mr-2 h-4 w-4 shrink-0" />
      <div className="text-left">
        <div className="font-medium text-sm">{item.label}</div>
        <div className="text-xs text-muted-foreground">{item.description}</div>
      </div>
    </Button>
  );
}
