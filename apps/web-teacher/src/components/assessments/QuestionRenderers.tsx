'use client';

/**
 * Question Renderers
 * 
 * Student-facing components for rendering and interacting with questions.
 * Each renderer handles a specific question type with proper validation
 * and accessibility support.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertCircle,
  ChevronUp,
  ChevronDown,
  GripVertical,
  Check,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

import type { Question, QuestionOption, QuestionBlank, QuestionPair } from './types';

// ============================================================================
// TYPES
// ============================================================================

export interface QuestionRendererProps {
  question: Question;
  response: unknown;
  onResponseChange: (response: unknown) => void;
  showPoints?: boolean;
  showFeedback?: boolean;
  showCorrectAnswer?: boolean;
  isSubmitted?: boolean;
  isCorrect?: boolean;
  disabled?: boolean;
  className?: string;
}

interface QuestionHeaderProps {
  question: Question;
  questionNumber?: number;
  showPoints?: boolean;
  isSubmitted?: boolean;
  isCorrect?: boolean;
}

// ============================================================================
// QUESTION HEADER
// ============================================================================

export function QuestionHeader({
  question,
  questionNumber,
  showPoints,
  isSubmitted,
  isCorrect,
}: QuestionHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 mb-4">
      <div className="flex-1">
        {questionNumber !== undefined && (
          <span className="text-sm font-medium text-muted-foreground block mb-1">
            Question {questionNumber}
          </span>
        )}
        <div
          className="prose prose-sm max-w-none dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: question.stem }}
        />
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {showPoints && (
          <Badge variant="outline">{question.points} pts</Badge>
        )}
        {isSubmitted && (
          <Badge variant={isCorrect ? 'default' : 'destructive'}>
            {isCorrect ? (
              <><Check className="h-3 w-3 mr-1" /> Correct</>
            ) : (
              <><X className="h-3 w-3 mr-1" /> Incorrect</>
            )}
          </Badge>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// MULTIPLE CHOICE RENDERER
// ============================================================================

export function MultipleChoiceRenderer({
  question,
  response,
  onResponseChange,
  showPoints,
  showFeedback,
  showCorrectAnswer,
  isSubmitted,
  disabled,
}: QuestionRendererProps) {
  const selectedId = response as string | undefined;
  const correctOption = question.options?.find(o => o.isCorrect);
  const isCorrect = isSubmitted && selectedId === correctOption?.id;

  return (
    <div className="space-y-4">
      <QuestionHeader
        question={question}
        showPoints={showPoints}
        isSubmitted={isSubmitted}
        isCorrect={isCorrect}
      />
      
      <RadioGroup
        value={selectedId ?? ''}
        onValueChange={onResponseChange}
        disabled={disabled}
      >
        <div className="space-y-2">
          {question.options?.map((option, idx) => {
            const isSelected = selectedId === option.id;
            const isOptionCorrect = option.isCorrect;
            
            return (
              <label
                key={option.id}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                  !disabled && 'hover:bg-muted/50',
                  isSelected && !isSubmitted && 'border-primary bg-primary/5',
                  isSubmitted && isSelected && isOptionCorrect && 'border-green-500 bg-green-50 dark:bg-green-950/30',
                  isSubmitted && isSelected && !isOptionCorrect && 'border-red-500 bg-red-50 dark:bg-red-950/30',
                  isSubmitted && showCorrectAnswer && isOptionCorrect && !isSelected && 'border-green-500 border-dashed',
                  disabled && 'cursor-not-allowed opacity-60'
                )}
              >
                <RadioGroupItem value={option.id} id={option.id} />
                <span className="font-medium mr-2">
                  {String.fromCharCode(65 + idx)}.
                </span>
                <span className="flex-1">{option.text}</span>
                {isSubmitted && isSelected && (
                  isOptionCorrect ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <X className="h-4 w-4 text-red-600" />
                  )
                )}
                {isSubmitted && showCorrectAnswer && isOptionCorrect && !isSelected && (
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    Correct
                  </Badge>
                )}
              </label>
            );
          })}
        </div>
      </RadioGroup>

      {showFeedback && isSubmitted && question.feedback && (
        <FeedbackDisplay
          feedback={isCorrect ? question.feedback.correct : question.feedback.incorrect}
          isCorrect={isCorrect}
        />
      )}
    </div>
  );
}

// ============================================================================
// MULTIPLE SELECT RENDERER
// ============================================================================

export function MultipleSelectRenderer({
  question,
  response,
  onResponseChange,
  showPoints,
  showFeedback,
  showCorrectAnswer,
  isSubmitted,
  disabled,
}: QuestionRendererProps) {
  const selectedIds = (response as string[]) ?? [];
  const correctIds = question.options?.filter(o => o.isCorrect).map(o => o.id) ?? [];
  
  const isFullyCorrect = useMemo(() => {
    if (!isSubmitted) return false;
    if (selectedIds.length !== correctIds.length) return false;
    return correctIds.every(id => selectedIds.includes(id));
  }, [isSubmitted, selectedIds, correctIds]);

  const toggleOption = useCallback((optionId: string) => {
    if (disabled) return;
    
    if (selectedIds.includes(optionId)) {
      onResponseChange(selectedIds.filter(id => id !== optionId));
    } else {
      onResponseChange([...selectedIds, optionId]);
    }
  }, [selectedIds, onResponseChange, disabled]);

  return (
    <div className="space-y-4">
      <QuestionHeader
        question={question}
        showPoints={showPoints}
        isSubmitted={isSubmitted}
        isCorrect={isFullyCorrect}
      />
      
      <p className="text-sm text-muted-foreground">Select all that apply</p>
      
      <div className="space-y-2">
        {question.options?.map((option, idx) => {
          const isSelected = selectedIds.includes(option.id);
          const isOptionCorrect = option.isCorrect;
          const selectedCorrectly = isSelected === isOptionCorrect;
          
          return (
            <label
              key={option.id}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                !disabled && 'hover:bg-muted/50',
                isSelected && !isSubmitted && 'border-primary bg-primary/5',
                isSubmitted && isSelected && selectedCorrectly && 'border-green-500 bg-green-50 dark:bg-green-950/30',
                isSubmitted && isSelected && !selectedCorrectly && 'border-red-500 bg-red-50 dark:bg-red-950/30',
                isSubmitted && showCorrectAnswer && isOptionCorrect && !isSelected && 'border-green-500 border-dashed',
                disabled && 'cursor-not-allowed opacity-60'
              )}
              onClick={() => toggleOption(option.id)}
            >
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => toggleOption(option.id)}
                disabled={disabled}
              />
              <span className="font-medium mr-2">
                {String.fromCharCode(65 + idx)}.
              </span>
              <span className="flex-1">{option.text}</span>
              {isSubmitted && isSelected && (
                selectedCorrectly ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <X className="h-4 w-4 text-red-600" />
                )
              )}
            </label>
          );
        })}
      </div>

      {showFeedback && isSubmitted && question.feedback && (
        <FeedbackDisplay
          feedback={isFullyCorrect ? question.feedback.correct : question.feedback.incorrect}
          isCorrect={isFullyCorrect}
        />
      )}
    </div>
  );
}

// ============================================================================
// TRUE/FALSE RENDERER
// ============================================================================

export function TrueFalseRenderer({
  question,
  response,
  onResponseChange,
  showPoints,
  showFeedback,
  showCorrectAnswer,
  isSubmitted,
  disabled,
}: QuestionRendererProps) {
  const selectedValue = response as string | undefined;
  const correctAnswer = question.correctAnswer === true ? 'true' : 'false';
  const isCorrect = isSubmitted && selectedValue === correctAnswer;

  return (
    <div className="space-y-4">
      <QuestionHeader
        question={question}
        showPoints={showPoints}
        isSubmitted={isSubmitted}
        isCorrect={isCorrect}
      />
      
      <RadioGroup
        value={selectedValue ?? ''}
        onValueChange={onResponseChange}
        disabled={disabled}
        className="flex gap-4"
      >
        {['true', 'false'].map(value => {
          const isSelected = selectedValue === value;
          const isThisCorrect = value === correctAnswer;
          
          return (
            <label
              key={value}
              className={cn(
                'flex-1 flex items-center justify-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors',
                !disabled && 'hover:bg-muted/50',
                isSelected && !isSubmitted && 'border-primary bg-primary/5',
                isSubmitted && isSelected && isThisCorrect && 'border-green-500 bg-green-50 dark:bg-green-950/30',
                isSubmitted && isSelected && !isThisCorrect && 'border-red-500 bg-red-50 dark:bg-red-950/30',
                isSubmitted && showCorrectAnswer && isThisCorrect && !isSelected && 'border-green-500 border-dashed',
                disabled && 'cursor-not-allowed opacity-60'
              )}
            >
              <RadioGroupItem value={value} />
              <span className="font-medium capitalize">{value}</span>
            </label>
          );
        })}
      </RadioGroup>

      {showFeedback && isSubmitted && question.feedback && (
        <FeedbackDisplay
          feedback={isCorrect ? question.feedback.correct : question.feedback.incorrect}
          isCorrect={isCorrect}
        />
      )}
    </div>
  );
}

// ============================================================================
// SHORT ANSWER RENDERER
// ============================================================================

export function ShortAnswerRenderer({
  question,
  response,
  onResponseChange,
  showPoints,
  showFeedback,
  showCorrectAnswer,
  isSubmitted,
  isCorrect,
  disabled,
}: QuestionRendererProps) {
  const value = (response as string) ?? '';

  return (
    <div className="space-y-4">
      <QuestionHeader
        question={question}
        showPoints={showPoints}
        isSubmitted={isSubmitted}
        isCorrect={isCorrect}
      />
      
      <Input
        value={value}
        onChange={e => onResponseChange(e.target.value)}
        placeholder="Enter your answer..."
        disabled={disabled}
        className={cn(
          isSubmitted && isCorrect && 'border-green-500',
          isSubmitted && !isCorrect && 'border-red-500'
        )}
      />

      {showCorrectAnswer && isSubmitted && !isCorrect && question.correctAnswer && (
        <div className="text-sm text-muted-foreground">
          <span className="font-medium">Correct answer:</span> {question.correctAnswer as string}
        </div>
      )}

      {showFeedback && isSubmitted && question.feedback && (
        <FeedbackDisplay
          feedback={isCorrect ? question.feedback.correct : question.feedback.incorrect}
          isCorrect={isCorrect}
        />
      )}
    </div>
  );
}

// ============================================================================
// ESSAY RENDERER
// ============================================================================

export function EssayRenderer({
  question,
  response,
  onResponseChange,
  showPoints,
  disabled,
}: QuestionRendererProps) {
  const value = (response as string) ?? '';
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;
  const minWords = question.minWords ?? 0;
  const maxWords = question.maxWords ?? Infinity;

  const isUnderMin = minWords > 0 && wordCount < minWords;
  const isOverMax = maxWords < Infinity && wordCount > maxWords;

  return (
    <div className="space-y-4">
      <QuestionHeader question={question} showPoints={showPoints} />
      
      {question.rubricId && (
        <Badge variant="outline" className="text-muted-foreground">
          Rubric graded
        </Badge>
      )}
      
      <Textarea
        value={value}
        onChange={e => onResponseChange(e.target.value)}
        placeholder="Write your response here..."
        disabled={disabled}
        rows={12}
        className={cn(
          'resize-y',
          isUnderMin && 'border-yellow-500',
          isOverMax && 'border-red-500'
        )}
      />
      
      <div className="flex items-center justify-between text-sm">
        <span className={cn(
          'text-muted-foreground',
          isUnderMin && 'text-yellow-600',
          isOverMax && 'text-red-600'
        )}>
          {wordCount} words
          {isUnderMin && ` (minimum ${minWords})`}
          {isOverMax && ` (maximum ${maxWords})`}
        </span>
        {(minWords > 0 || maxWords < Infinity) && (
          <span className="text-muted-foreground">
            {minWords > 0 && `Min: ${minWords}`}
            {minWords > 0 && maxWords < Infinity && ' | '}
            {maxWords < Infinity && `Max: ${maxWords}`}
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// FILL IN THE BLANK RENDERER
// ============================================================================

export function FillBlankRenderer({
  question,
  response,
  onResponseChange,
  showPoints,
  showFeedback,
  showCorrectAnswer,
  isSubmitted,
  disabled,
}: QuestionRendererProps) {
  const answers = (response as Record<string, string>) ?? {};
  
  const updateBlank = useCallback((blankId: string, value: string) => {
    onResponseChange({ ...answers, [blankId]: value });
  }, [answers, onResponseChange]);

  // Parse stem to find blanks (format: {{blank_id}} or ____)
  const parts = question.stem.split(/(\{\{[^}]+\}\}|____)/);
  let blankIndex = 0;

  const checkBlankCorrect = (blankId: string): boolean => {
    const blank = question.blanks?.find(b => b.id === blankId);
    if (!blank) return false;
    
    const answer = answers[blankId]?.trim() ?? '';
    if (blank.caseSensitive) {
      return blank.correctAnswers.includes(answer);
    }
    return blank.correctAnswers.some(ca => ca.toLowerCase() === answer.toLowerCase());
  };

  const allCorrect = question.blanks?.every(b => checkBlankCorrect(b.id)) ?? false;

  return (
    <div className="space-y-4">
      <QuestionHeader
        question={question}
        showPoints={showPoints}
        isSubmitted={isSubmitted}
        isCorrect={allCorrect}
      />
      
      <div className="text-lg leading-relaxed flex flex-wrap items-center gap-1">
        {parts.map((part, idx) => {
          const isBlankMarker = part.match(/\{\{([^}]+)\}\}/) || part === '____';
          
          if (isBlankMarker) {
            const matchResult = part.match(/\{\{([^}]+)\}\}/);
            const blankId = matchResult ? matchResult[1] : question.blanks?.[blankIndex]?.id ?? `blank-${blankIndex}`;
            const blank = question.blanks?.find(b => b.id === blankId);
            blankIndex++;
            
            const isCorrect = checkBlankCorrect(blankId);
            
            return (
              <span key={idx} className="inline-flex items-center gap-1">
                <Input
                  value={answers[blankId] ?? ''}
                  onChange={e => updateBlank(blankId, e.target.value)}
                  placeholder={blank?.placeholder ?? '...'}
                  disabled={disabled}
                  className={cn(
                    'w-32 inline-flex',
                    isSubmitted && isCorrect && 'border-green-500 bg-green-50 dark:bg-green-950/30',
                    isSubmitted && !isCorrect && 'border-red-500 bg-red-50 dark:bg-red-950/30'
                  )}
                />
                {isSubmitted && (
                  isCorrect ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <X className="h-4 w-4 text-red-600" />
                  )
                )}
              </span>
            );
          }
          
          return <span key={idx}>{part}</span>;
        })}
      </div>

      {showCorrectAnswer && isSubmitted && !allCorrect && (
        <div className="text-sm text-muted-foreground space-y-1">
          <span className="font-medium">Correct answers:</span>
          <ul className="list-disc list-inside">
            {question.blanks?.map((blank, idx) => (
              <li key={blank.id}>
                Blank {idx + 1}: {blank.correctAnswers.join(' or ')}
              </li>
            ))}
          </ul>
        </div>
      )}

      {showFeedback && isSubmitted && question.feedback && (
        <FeedbackDisplay
          feedback={allCorrect ? question.feedback.correct : question.feedback.incorrect}
          isCorrect={allCorrect}
        />
      )}
    </div>
  );
}

// ============================================================================
// MATCHING RENDERER
// ============================================================================

export function MatchingRenderer({
  question,
  response,
  onResponseChange,
  showPoints,
  showFeedback,
  showCorrectAnswer,
  isSubmitted,
  disabled,
}: QuestionRendererProps) {
  const matches = (response as Record<string, string>) ?? {};
  
  // Create shuffled right-side options
  const rightOptions = useMemo(() => {
    return question.pairs?.map(p => ({ id: p.id, text: p.right })) ?? [];
  }, [question.pairs]);

  const updateMatch = useCallback((leftId: string, rightId: string) => {
    onResponseChange({ ...matches, [leftId]: rightId });
  }, [matches, onResponseChange]);

  const checkMatchCorrect = (pairId: string): boolean => {
    return matches[pairId] === pairId;
  };

  const allCorrect = question.pairs?.every(p => checkMatchCorrect(p.id)) ?? false;

  return (
    <div className="space-y-4">
      <QuestionHeader
        question={question}
        showPoints={showPoints}
        isSubmitted={isSubmitted}
        isCorrect={allCorrect}
      />
      
      <p className="text-sm text-muted-foreground">
        Match each item on the left with the correct item on the right
      </p>
      
      <div className="space-y-3">
        {question.pairs?.map((pair, idx) => {
          const isCorrect = checkMatchCorrect(pair.id);
          
          return (
            <div key={pair.id} className="flex items-center gap-4">
              <div className={cn(
                'flex-1 p-3 rounded-lg border bg-muted/30',
                isSubmitted && isCorrect && 'border-green-500',
                isSubmitted && !isCorrect && 'border-red-500'
              )}>
                <span className="font-medium mr-2">{idx + 1}.</span>
                {pair.left}
              </div>
              
              <span className="text-muted-foreground">→</span>
              
              <Select
                value={matches[pair.id] ?? ''}
                onValueChange={v => updateMatch(pair.id, v)}
                disabled={disabled}
              >
                <SelectTrigger className={cn(
                  'flex-1',
                  isSubmitted && isCorrect && 'border-green-500',
                  isSubmitted && !isCorrect && 'border-red-500'
                )}>
                  <SelectValue placeholder="Select a match..." />
                </SelectTrigger>
                <SelectContent>
                  {rightOptions.map((option, i) => (
                    <SelectItem key={option.id} value={option.id}>
                      {String.fromCharCode(65 + i)}. {option.text}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {isSubmitted && (
                isCorrect ? (
                  <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                ) : (
                  <X className="h-5 w-5 text-red-600 flex-shrink-0" />
                )
              )}
            </div>
          );
        })}
      </div>

      {showCorrectAnswer && isSubmitted && !allCorrect && (
        <div className="text-sm text-muted-foreground">
          <span className="font-medium">Correct matches:</span>
          <ul className="list-disc list-inside mt-1">
            {question.pairs?.map((pair, idx) => (
              <li key={pair.id}>
                {idx + 1}. {pair.left} → {pair.right}
              </li>
            ))}
          </ul>
        </div>
      )}

      {showFeedback && isSubmitted && question.feedback && (
        <FeedbackDisplay
          feedback={allCorrect ? question.feedback.correct : question.feedback.incorrect}
          isCorrect={allCorrect}
        />
      )}
    </div>
  );
}

// ============================================================================
// ORDERING RENDERER
// ============================================================================

export function OrderingRenderer({
  question,
  response,
  onResponseChange,
  showPoints,
  showFeedback,
  showCorrectAnswer,
  isSubmitted,
  disabled,
}: QuestionRendererProps) {
  const ordered = (response as string[]) ?? question.options?.map(o => o.id) ?? [];
  const correctOrder = question.correctOrder ?? question.options?.map(o => o.id) ?? [];
  
  const isCorrect = useMemo(() => {
    if (!isSubmitted) return false;
    if (ordered.length !== correctOrder.length) return false;
    return ordered.every((id, idx) => id === correctOrder[idx]);
  }, [isSubmitted, ordered, correctOrder]);

  const moveUp = useCallback((idx: number) => {
    if (disabled || idx === 0) return;
    const newOrder = [...ordered];
    [newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]];
    onResponseChange(newOrder);
  }, [ordered, onResponseChange, disabled]);

  const moveDown = useCallback((idx: number) => {
    if (disabled || idx === ordered.length - 1) return;
    const newOrder = [...ordered];
    [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
    onResponseChange(newOrder);
  }, [ordered, onResponseChange, disabled]);

  const getPositionCorrect = (optionId: string, currentIdx: number): boolean => {
    return correctOrder[currentIdx] === optionId;
  };

  return (
    <div className="space-y-4">
      <QuestionHeader
        question={question}
        showPoints={showPoints}
        isSubmitted={isSubmitted}
        isCorrect={isCorrect}
      />
      
      <p className="text-sm text-muted-foreground">
        Arrange the items in the correct order
      </p>
      
      <div className="space-y-2">
        {ordered.map((optionId, idx) => {
          const option = question.options?.find(o => o.id === optionId);
          const positionCorrect = getPositionCorrect(optionId, idx);
          
          return (
            <div
              key={optionId}
              className={cn(
                'flex items-center gap-2 p-3 rounded-lg border bg-background',
                isSubmitted && positionCorrect && 'border-green-500 bg-green-50 dark:bg-green-950/30',
                isSubmitted && !positionCorrect && 'border-red-500 bg-red-50 dark:bg-red-950/30'
              )}
            >
              <div className="w-8 h-8 flex items-center justify-center rounded-full bg-muted text-sm font-medium">
                {idx + 1}
              </div>
              
              {!disabled && (
                <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
              )}
              
              <span className="flex-1">{option?.text}</span>
              
              {!disabled && (
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => moveUp(idx)}
                    disabled={idx === 0}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => moveDown(idx)}
                    disabled={idx === ordered.length - 1}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {isSubmitted && (
                positionCorrect ? (
                  <Check className="h-5 w-5 text-green-600" />
                ) : (
                  <X className="h-5 w-5 text-red-600" />
                )
              )}
            </div>
          );
        })}
      </div>

      {showCorrectAnswer && isSubmitted && !isCorrect && (
        <div className="text-sm text-muted-foreground">
          <span className="font-medium">Correct order:</span>
          <ol className="list-decimal list-inside mt-1">
            {correctOrder.map(id => {
              const option = question.options?.find(o => o.id === id);
              return <li key={id}>{option?.text}</li>;
            })}
          </ol>
        </div>
      )}

      {showFeedback && isSubmitted && question.feedback && (
        <FeedbackDisplay
          feedback={isCorrect ? question.feedback.correct : question.feedback.incorrect}
          isCorrect={isCorrect}
        />
      )}
    </div>
  );
}

// ============================================================================
// NUMERIC RENDERER
// ============================================================================

export function NumericRenderer({
  question,
  response,
  onResponseChange,
  showPoints,
  showFeedback,
  showCorrectAnswer,
  isSubmitted,
  disabled,
}: QuestionRendererProps) {
  const value = (response as string) ?? '';
  const numericValue = parseFloat(value);
  const correctAnswer = question.correctAnswer as number;
  const tolerance = question.tolerance ?? 0;
  
  const isCorrect = useMemo(() => {
    if (!isSubmitted || value === '' || isNaN(numericValue)) return false;
    return Math.abs(numericValue - correctAnswer) <= tolerance;
  }, [isSubmitted, value, numericValue, correctAnswer, tolerance]);

  return (
    <div className="space-y-4">
      <QuestionHeader
        question={question}
        showPoints={showPoints}
        isSubmitted={isSubmitted}
        isCorrect={isCorrect}
      />
      
      <div className="flex items-center gap-2">
        <Input
          type="number"
          step="any"
          value={value}
          onChange={e => onResponseChange(e.target.value)}
          placeholder="Enter a number..."
          disabled={disabled}
          className={cn(
            'max-w-xs',
            isSubmitted && isCorrect && 'border-green-500',
            isSubmitted && !isCorrect && 'border-red-500'
          )}
        />
        {question.unit && (
          <span className="text-muted-foreground">{question.unit}</span>
        )}
        {isSubmitted && (
          isCorrect ? (
            <Check className="h-5 w-5 text-green-600" />
          ) : (
            <X className="h-5 w-5 text-red-600" />
          )
        )}
      </div>

      {showCorrectAnswer && isSubmitted && !isCorrect && (
        <div className="text-sm text-muted-foreground">
          <span className="font-medium">Correct answer:</span> {correctAnswer}
          {tolerance > 0 && ` (±${tolerance})`}
          {question.unit && ` ${question.unit}`}
        </div>
      )}

      {showFeedback && isSubmitted && question.feedback && (
        <FeedbackDisplay
          feedback={isCorrect ? question.feedback.correct : question.feedback.incorrect}
          isCorrect={isCorrect}
        />
      )}
    </div>
  );
}

// ============================================================================
// CODE RENDERER
// ============================================================================

export function CodeRenderer({
  question,
  response,
  onResponseChange,
  showPoints,
  disabled,
}: QuestionRendererProps) {
  const value = (response as string) ?? (question.starterCode || '');

  return (
    <div className="space-y-4">
      <QuestionHeader question={question} showPoints={showPoints} />
      
      {question.language && (
        <Badge variant="secondary" className="uppercase">
          {question.language}
        </Badge>
      )}
      
      <Textarea
        value={value}
        onChange={e => onResponseChange(e.target.value)}
        placeholder="Write your code here..."
        disabled={disabled}
        rows={16}
        className="font-mono text-sm resize-y"
      />
      
      {question.testCases && question.testCases.length > 0 && (
        <div className="text-sm text-muted-foreground">
          <span className="font-medium">Test cases:</span> {question.testCases.length}
          {question.testCases.some(tc => !tc.hidden) && (
            <span className="ml-1">
              ({question.testCases.filter(tc => !tc.hidden).length} visible)
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MATH EQUATION RENDERER
// ============================================================================

export function MathEquationRenderer({
  question,
  response,
  onResponseChange,
  showPoints,
  showCorrectAnswer,
  isSubmitted,
  isCorrect,
  disabled,
}: QuestionRendererProps) {
  const value = (response as string) ?? '';

  return (
    <div className="space-y-4">
      <QuestionHeader
        question={question}
        showPoints={showPoints}
        isSubmitted={isSubmitted}
        isCorrect={isCorrect}
      />
      
      <div className="p-4 bg-muted/30 rounded-lg">
        <p className="text-sm text-muted-foreground mb-2">
          Enter your mathematical expression
        </p>
        {/* In production, integrate MathQuill or similar */}
        <Input
          value={value}
          onChange={e => onResponseChange(e.target.value)}
          placeholder="e.g., x^2 + 2x + 1"
          disabled={disabled}
          className={cn(
            'font-mono',
            isSubmitted && isCorrect && 'border-green-500',
            isSubmitted && !isCorrect && 'border-red-500'
          )}
        />
      </div>

      {showCorrectAnswer && isSubmitted && !isCorrect && question.correctAnswer && (
        <div className="text-sm text-muted-foreground">
          <span className="font-medium">Correct answer:</span>
          <code className="ml-2 px-2 py-1 bg-muted rounded">
            {question.correctAnswer as string}
          </code>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// FEEDBACK DISPLAY
// ============================================================================

interface FeedbackDisplayProps {
  feedback?: string;
  isCorrect?: boolean;
}

function FeedbackDisplay({ feedback, isCorrect }: FeedbackDisplayProps) {
  if (!feedback) return null;

  return (
    <Card className={cn(
      'border-l-4',
      isCorrect ? 'border-l-green-500 bg-green-50 dark:bg-green-950/30' : 'border-l-blue-500 bg-blue-50 dark:bg-blue-950/30'
    )}>
      <CardContent className="p-4">
        <p className="text-sm">{feedback}</p>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN QUESTION RENDERER
// ============================================================================

export function QuestionRenderer(props: QuestionRendererProps) {
  const { question } = props;

  switch (question.type) {
    case 'MULTIPLE_CHOICE':
      return <MultipleChoiceRenderer {...props} />;
    case 'MULTIPLE_SELECT':
      return <MultipleSelectRenderer {...props} />;
    case 'TRUE_FALSE':
      return <TrueFalseRenderer {...props} />;
    case 'SHORT_ANSWER':
      return <ShortAnswerRenderer {...props} />;
    case 'ESSAY':
      return <EssayRenderer {...props} />;
    case 'FILL_BLANK':
      return <FillBlankRenderer {...props} />;
    case 'MATCHING':
      return <MatchingRenderer {...props} />;
    case 'ORDERING':
      return <OrderingRenderer {...props} />;
    case 'NUMERIC':
      return <NumericRenderer {...props} />;
    case 'CODE':
      return <CodeRenderer {...props} />;
    case 'MATH_EQUATION':
      return <MathEquationRenderer {...props} />;
    default:
      return (
        <div className="p-4 border rounded-lg bg-muted/50">
          <AlertCircle className="h-6 w-6 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            Unknown question type: {question.type}
          </p>
        </div>
      );
  }
}

export default QuestionRenderer;
