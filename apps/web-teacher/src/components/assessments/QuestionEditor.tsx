'use client';

/**
 * Question Editor
 * 
 * Form for creating and editing questions.
 * Adapts to different question types.
 */

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Plus, Trash2, GripVertical, Check, X } from 'lucide-react';

import type { Question, QuestionOption, MatchingPair, FillBlankSlot, Difficulty } from './types';

// ============================================================================
// PROPS
// ============================================================================

interface QuestionEditorProps {
  question: Question;
  onSave: (question: Question) => void;
  onCancel: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function QuestionEditor({ question: initialQuestion, onSave, onCancel }: QuestionEditorProps) {
  const [question, setQuestion] = useState<Question>(initialQuestion);
  const [tagInput, setTagInput] = useState('');

  // Update question field
  const updateField = useCallback(<K extends keyof Question>(field: K, value: Question[K]) => {
    setQuestion(prev => ({ ...prev, [field]: value }));
  }, []);

  // Handle save
  const handleSave = useCallback(() => {
    onSave(question);
  }, [question, onSave]);

  // Option handlers
  const addOption = useCallback(() => {
    const newOption: QuestionOption = {
      id: crypto.randomUUID(),
      text: '',
      isCorrect: false,
    };
    setQuestion(prev => ({
      ...prev,
      options: [...(prev.options ?? []), newOption],
    }));
  }, []);

  const updateOption = useCallback((index: number, updates: Partial<QuestionOption>) => {
    setQuestion(prev => {
      const options = [...(prev.options ?? [])];
      options[index] = { ...options[index], ...updates };
      return { ...prev, options };
    });
  }, []);

  const removeOption = useCallback((index: number) => {
    setQuestion(prev => ({
      ...prev,
      options: (prev.options ?? []).filter((_, i) => i !== index),
    }));
  }, []);

  const setCorrectOption = useCallback((index: number) => {
    setQuestion(prev => ({
      ...prev,
      correctOption: index,
      options: (prev.options ?? []).map((opt, i) => ({
        ...opt,
        isCorrect: i === index,
      })),
    }));
  }, []);

  const toggleCorrectOption = useCallback((index: number) => {
    setQuestion(prev => {
      const options = [...(prev.options ?? [])];
      options[index] = { ...options[index], isCorrect: !options[index].isCorrect };
      return {
        ...prev,
        options,
        correctOptions: options
          .map((opt, i) => (opt.isCorrect ? i : -1))
          .filter(i => i >= 0),
      };
    });
  }, []);

  // Tag handlers
  const addTag = useCallback(() => {
    if (tagInput.trim() && !question.tags.includes(tagInput.trim())) {
      setQuestion(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()],
      }));
      setTagInput('');
    }
  }, [tagInput, question.tags]);

  const removeTag = useCallback((tag: string) => {
    setQuestion(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag),
    }));
  }, []);

  // Pair handlers for matching
  const addPair = useCallback(() => {
    const newPair: MatchingPair = {
      id: crypto.randomUUID(),
      left: '',
      right: '',
    };
    setQuestion(prev => ({
      ...prev,
      pairs: [...(prev.pairs ?? []), newPair],
    }));
  }, []);

  const updatePair = useCallback((index: number, updates: Partial<MatchingPair>) => {
    setQuestion(prev => {
      const pairs = [...(prev.pairs ?? [])];
      pairs[index] = { ...pairs[index], ...updates };
      return { ...prev, pairs };
    });
  }, []);

  const removePair = useCallback((index: number) => {
    setQuestion(prev => ({
      ...prev,
      pairs: (prev.pairs ?? []).filter((_, i) => i !== index),
    }));
  }, []);

  return (
    <ScrollArea className="h-[calc(100vh-200px)] pr-4">
      <div className="space-y-6 py-4">
        {/* Question Text */}
        <div className="space-y-2">
          <Label htmlFor="stem">Question Text *</Label>
          <Textarea
            id="stem"
            placeholder="Enter your question..."
            value={question.stem}
            onChange={e => updateField('stem', e.target.value)}
            rows={3}
          />
        </div>

        {/* Points & Difficulty */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="points">Points *</Label>
            <Input
              id="points"
              type="number"
              min={1}
              value={question.points}
              onChange={e => updateField('points', parseInt(e.target.value) || 1)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="difficulty">Difficulty</Label>
            <Select
              value={question.difficulty}
              onValueChange={v => updateField('difficulty', v as Difficulty)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EASY">Easy</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HARD">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        {/* Type-Specific Fields */}
        {renderTypeSpecificFields()}

        <Separator />

        {/* Additional Settings */}
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="feedback">
            <AccordionTrigger>Feedback & Hints</AccordionTrigger>
            <AccordionContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="hint">Hint</Label>
                <Textarea
                  id="hint"
                  placeholder="Provide a hint for students..."
                  value={question.hint ?? ''}
                  onChange={e => updateField('hint', e.target.value)}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="explanation">Explanation</Label>
                <Textarea
                  id="explanation"
                  placeholder="Explain the correct answer..."
                  value={question.explanation ?? ''}
                  onChange={e => updateField('explanation', e.target.value)}
                  rows={2}
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="tags">
            <AccordionTrigger>Tags & Metadata</AccordionTrigger>
            <AccordionContent className="space-y-4">
              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a tag..."
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  />
                  <Button variant="outline" size="icon" onClick={addTag}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {question.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <button onClick={() => removeTag(tag)}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="partialCredit">Partial Credit</Label>
                  <p className="text-xs text-muted-foreground">
                    Allow partial points for partially correct answers
                  </p>
                </div>
                <Switch
                  id="partialCredit"
                  checked={question.partialCredit ?? false}
                  onCheckedChange={v => updateField('partialCredit', v)}
                />
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Question
          </Button>
        </div>
      </div>
    </ScrollArea>
  );

  // ============================================================================
  // TYPE-SPECIFIC FIELDS
  // ============================================================================

  function renderTypeSpecificFields() {
    switch (question.type) {
      case 'MULTIPLE_CHOICE':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Answer Options</Label>
              <Button variant="outline" size="sm" onClick={addOption}>
                <Plus className="mr-1 h-4 w-4" />
                Add Option
              </Button>
            </div>
            <div className="space-y-2">
              {question.options?.map((option, index) => (
                <div key={option.id} className="flex items-center gap-2">
                  <button
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                      option.isCorrect
                        ? 'border-green-500 bg-green-500 text-white'
                        : 'border-muted-foreground'
                    }`}
                    onClick={() => setCorrectOption(index)}
                    title="Mark as correct"
                  >
                    {option.isCorrect && <Check className="h-4 w-4" />}
                  </button>
                  <Input
                    placeholder={`Option ${index + 1}`}
                    value={option.text}
                    onChange={e => updateOption(index, { text: e.target.value })}
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeOption(index)}
                    disabled={(question.options?.length ?? 0) <= 2}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        );

      case 'MULTIPLE_SELECT':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Answer Options (select all that apply)</Label>
              <Button variant="outline" size="sm" onClick={addOption}>
                <Plus className="mr-1 h-4 w-4" />
                Add Option
              </Button>
            </div>
            <div className="space-y-2">
              {question.options?.map((option, index) => (
                <div key={option.id} className="flex items-center gap-2">
                  <button
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded border-2 ${
                      option.isCorrect
                        ? 'border-green-500 bg-green-500 text-white'
                        : 'border-muted-foreground'
                    }`}
                    onClick={() => toggleCorrectOption(index)}
                    title="Toggle correct"
                  >
                    {option.isCorrect && <Check className="h-4 w-4" />}
                  </button>
                  <Input
                    placeholder={`Option ${index + 1}`}
                    value={option.text}
                    onChange={e => updateOption(index, { text: e.target.value })}
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeOption(index)}
                    disabled={(question.options?.length ?? 0) <= 2}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        );

      case 'TRUE_FALSE':
        return (
          <div className="space-y-2">
            <Label>Correct Answer</Label>
            <div className="flex gap-4">
              <Button
                variant={question.correctAnswer === true ? 'default' : 'outline'}
                onClick={() => updateField('correctAnswer', true)}
              >
                True
              </Button>
              <Button
                variant={question.correctAnswer === false ? 'default' : 'outline'}
                onClick={() => updateField('correctAnswer', false)}
              >
                False
              </Button>
            </div>
          </div>
        );

      case 'SHORT_ANSWER':
        return (
          <div className="space-y-2">
            <Label htmlFor="correctAnswer">Correct Answer(s)</Label>
            <Input
              id="correctAnswer"
              placeholder="Enter accepted answers (comma-separated)"
              value={
                Array.isArray(question.correctAnswer)
                  ? question.correctAnswer.join(', ')
                  : question.correctAnswer ?? ''
              }
              onChange={e => {
                const answers = e.target.value.split(',').map(a => a.trim()).filter(Boolean);
                updateField('correctAnswer', answers.length === 1 ? answers[0] : answers);
              }}
            />
            <p className="text-xs text-muted-foreground">
              Enter multiple accepted answers separated by commas
            </p>
          </div>
        );

      case 'ESSAY':
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Essays are graded manually. Consider adding a rubric for consistent grading.
            </p>
            <div className="flex items-center justify-between">
              <div>
                <Label>Use Rubric</Label>
                <p className="text-xs text-muted-foreground">
                  Attach a grading rubric
                </p>
              </div>
              <Button variant="outline" size="sm">
                Select Rubric
              </Button>
            </div>
          </div>
        );

      case 'MATCHING':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Matching Pairs</Label>
              <Button variant="outline" size="sm" onClick={addPair}>
                <Plus className="mr-1 h-4 w-4" />
                Add Pair
              </Button>
            </div>
            <div className="space-y-2">
              {question.pairs?.map((pair, index) => (
                <div key={pair.id} className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Term"
                    value={pair.left}
                    onChange={e => updatePair(index, { left: e.target.value })}
                    className="flex-1"
                  />
                  <span className="text-muted-foreground">→</span>
                  <Input
                    placeholder="Definition"
                    value={pair.right}
                    onChange={e => updatePair(index, { right: e.target.value })}
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removePair(index)}
                    disabled={(question.pairs?.length ?? 0) <= 2}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        );

      case 'NUMERIC':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="correctAnswer">Correct Answer</Label>
                <Input
                  id="correctAnswer"
                  type="number"
                  value={question.correctAnswer as number ?? ''}
                  onChange={e => updateField('correctAnswer', parseFloat(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tolerance">Tolerance (±)</Label>
                <Input
                  id="tolerance"
                  type="number"
                  min={0}
                  step={0.01}
                  value={question.tolerance ?? 0}
                  onChange={e => updateField('tolerance', parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Unit (optional)</Label>
              <Input
                id="unit"
                placeholder="e.g., meters, kg, %"
                value={question.unit ?? ''}
                onChange={e => updateField('unit', e.target.value)}
              />
            </div>
          </div>
        );

      case 'CODE':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="language">Programming Language</Label>
              <Select
                value={question.language ?? 'javascript'}
                onValueChange={v => updateField('language', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="javascript">JavaScript</SelectItem>
                  <SelectItem value="python">Python</SelectItem>
                  <SelectItem value="java">Java</SelectItem>
                  <SelectItem value="cpp">C++</SelectItem>
                  <SelectItem value="csharp">C#</SelectItem>
                  <SelectItem value="typescript">TypeScript</SelectItem>
                  <SelectItem value="go">Go</SelectItem>
                  <SelectItem value="rust">Rust</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="starterCode">Starter Code</Label>
              <Textarea
                id="starterCode"
                placeholder="// Write your starter code here..."
                value={question.starterCode ?? ''}
                onChange={e => updateField('starterCode', e.target.value)}
                rows={5}
                className="font-mono text-sm"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Test cases can be configured in advanced settings
            </p>
          </div>
        );

      default:
        return (
          <p className="text-sm text-muted-foreground">
            Additional configuration options for {question.type} questions.
          </p>
        );
    }
  }
}
