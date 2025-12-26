'use client';

/**
 * Preview Panel
 * 
 * Renders a student-facing preview of the assessment.
 * Shows how questions will appear to students.
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertCircle,
  CheckCircle2,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';

import type { Assessment, Question, AssessmentSettings } from './types';

// ============================================================================
// PROPS
// ============================================================================

interface PreviewPanelProps {
  assessment: Assessment;
}

// ============================================================================
// QUESTION RENDERERS
// ============================================================================

interface QuestionRendererProps {
  question: Question;
  response: unknown;
  onResponseChange: (response: unknown) => void;
  showPoints?: boolean;
  disabled?: boolean;
}

function MultipleChoiceRenderer({ question, response, onResponseChange, showPoints }: QuestionRendererProps) {
  return (
    <div className="space-y-4">
      <QuestionHeader question={question} showPoints={showPoints} />
      <RadioGroup
        value={response as string ?? ''}
        onValueChange={onResponseChange}
      >
        <div className="space-y-2">
          {question.options?.map((option, idx) => (
            <div 
              key={option.id}
              className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
            >
              <RadioGroupItem value={option.id} id={option.id} />
              <Label htmlFor={option.id} className="flex-1 cursor-pointer font-normal">
                <span className="font-medium mr-2">{String.fromCharCode(65 + idx)}.</span>
                {option.text}
              </Label>
            </div>
          ))}
        </div>
      </RadioGroup>
    </div>
  );
}

function MultipleSelectRenderer({ question, response, onResponseChange, showPoints }: QuestionRendererProps) {
  const selected = (response as string[]) ?? [];
  
  const toggleOption = (optionId: string) => {
    if (selected.includes(optionId)) {
      onResponseChange(selected.filter(id => id !== optionId));
    } else {
      onResponseChange([...selected, optionId]);
    }
  };

  return (
    <div className="space-y-4">
      <QuestionHeader question={question} showPoints={showPoints} />
      <p className="text-sm text-muted-foreground">Select all that apply</p>
      <div className="space-y-2">
        {question.options?.map((option, idx) => (
          <div 
            key={option.id}
            className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
            onClick={() => toggleOption(option.id)}
          >
            <Checkbox 
              checked={selected.includes(option.id)}
              onCheckedChange={() => toggleOption(option.id)}
              id={option.id}
            />
            <Label htmlFor={option.id} className="flex-1 cursor-pointer font-normal">
              <span className="font-medium mr-2">{String.fromCharCode(65 + idx)}.</span>
              {option.text}
            </Label>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrueFalseRenderer({ question, response, onResponseChange, showPoints }: QuestionRendererProps) {
  return (
    <div className="space-y-4">
      <QuestionHeader question={question} showPoints={showPoints} />
      <RadioGroup
        value={response as string ?? ''}
        onValueChange={onResponseChange}
      >
        <div className="flex gap-4">
          <div 
            className="flex-1 flex items-center space-x-3 p-4 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
          >
            <RadioGroupItem value="true" id="true" />
            <Label htmlFor="true" className="cursor-pointer font-medium">True</Label>
          </div>
          <div 
            className="flex-1 flex items-center space-x-3 p-4 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
          >
            <RadioGroupItem value="false" id="false" />
            <Label htmlFor="false" className="cursor-pointer font-medium">False</Label>
          </div>
        </div>
      </RadioGroup>
    </div>
  );
}

function ShortAnswerRenderer({ question, response, onResponseChange, showPoints }: QuestionRendererProps) {
  return (
    <div className="space-y-4">
      <QuestionHeader question={question} showPoints={showPoints} />
      <Input
        placeholder="Enter your answer..."
        value={response as string ?? ''}
        onChange={e => onResponseChange(e.target.value)}
      />
    </div>
  );
}

function EssayRenderer({ question, response, onResponseChange, showPoints }: QuestionRendererProps) {
  const text = response as string ?? '';
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const minWords = question.minWords ?? 0;
  const maxWords = question.maxWords ?? Infinity;

  return (
    <div className="space-y-4">
      <QuestionHeader question={question} showPoints={showPoints} />
      <Textarea
        placeholder="Write your response here..."
        value={text}
        onChange={e => onResponseChange(e.target.value)}
        rows={10}
        className="resize-y"
      />
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{wordCount} words</span>
        {(minWords > 0 || maxWords < Infinity) && (
          <span>
            {minWords > 0 && `Min: ${minWords} words`}
            {minWords > 0 && maxWords < Infinity && ' | '}
            {maxWords < Infinity && `Max: ${maxWords} words`}
          </span>
        )}
      </div>
    </div>
  );
}

function FillBlankRenderer({ question, response, onResponseChange, showPoints }: QuestionRendererProps) {
  const answers = (response as Record<string, string>) ?? {};

  const updateBlank = (blankId: string, value: string) => {
    onResponseChange({ ...answers, [blankId]: value });
  };

  // Parse stem to find blanks (format: {{blank_id}})
  const parts = question.stem.split(/(\{\{[^}]+\}\})/);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          Fill in the blank{question.blanks && question.blanks.length > 1 ? 's' : ''}
        </span>
        {showPoints && (
          <Badge variant="outline">{question.points} pts</Badge>
        )}
      </div>
      <div className="text-lg leading-relaxed">
        {parts.map((part, idx) => {
          const match = part.match(/\{\{([^}]+)\}\}/);
          if (match) {
            const blankId = match[1];
            const blank = question.blanks?.find(b => b.id === blankId);
            return (
              <Input
                key={idx}
                className="inline-block w-32 mx-1 align-baseline"
                placeholder={blank?.placeholder ?? '...'}
                value={answers[blankId] ?? ''}
                onChange={e => updateBlank(blankId, e.target.value)}
              />
            );
          }
          return <span key={idx}>{part}</span>;
        })}
      </div>
    </div>
  );
}

function MatchingRenderer({ question, response, onResponseChange, showPoints }: QuestionRendererProps) {
  const matches = (response as Record<string, string>) ?? {};

  const updateMatch = (leftId: string, rightId: string) => {
    onResponseChange({ ...matches, [leftId]: rightId });
  };

  const rightItems = question.pairs?.map(p => ({ id: p.id, text: p.right })) ?? [];

  return (
    <div className="space-y-4">
      <QuestionHeader question={question} showPoints={showPoints} />
      <div className="space-y-3">
        {question.pairs?.map((pair, idx) => (
          <div key={pair.id} className="flex items-center gap-4">
            <div className="flex-1 p-3 rounded-lg border bg-muted/30">
              <span className="font-medium mr-2">{idx + 1}.</span>
              {pair.left}
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <select
              className="flex-1 h-10 px-3 rounded-lg border bg-background"
              value={matches[pair.id] ?? ''}
              onChange={e => updateMatch(pair.id, e.target.value)}
            >
              <option value="">Select a match...</option>
              {rightItems.map((item, i) => (
                <option key={item.id} value={item.id}>
                  {String.fromCharCode(65 + i)}. {item.text}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}

function OrderingRenderer({ question, response, onResponseChange, showPoints }: QuestionRendererProps) {
  const ordered = (response as string[]) ?? question.options?.map(o => o.id) ?? [];

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    const newOrder = [...ordered];
    [newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]];
    onResponseChange(newOrder);
  };

  const moveDown = (idx: number) => {
    if (idx === ordered.length - 1) return;
    const newOrder = [...ordered];
    [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
    onResponseChange(newOrder);
  };

  return (
    <div className="space-y-4">
      <QuestionHeader question={question} showPoints={showPoints} />
      <p className="text-sm text-muted-foreground">Drag to reorder, or use the arrows</p>
      <div className="space-y-2">
        {ordered.map((optionId, idx) => {
          const option = question.options?.find(o => o.id === optionId);
          return (
            <div 
              key={optionId}
              className="flex items-center gap-2 p-3 rounded-lg border bg-background"
            >
              <span className="w-6 h-6 flex items-center justify-center rounded-full bg-muted text-sm font-medium">
                {idx + 1}
              </span>
              <span className="flex-1">{option?.text}</span>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => moveUp(idx)}
                  disabled={idx === 0}
                >
                  <ChevronLeft className="h-4 w-4 rotate-90" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => moveDown(idx)}
                  disabled={idx === ordered.length - 1}
                >
                  <ChevronRight className="h-4 w-4 rotate-90" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NumericRenderer({ question, response, onResponseChange, showPoints }: QuestionRendererProps) {
  return (
    <div className="space-y-4">
      <QuestionHeader question={question} showPoints={showPoints} />
      <div className="flex items-center gap-2">
        <Input
          type="number"
          step="any"
          placeholder="Enter a number..."
          value={response as string ?? ''}
          onChange={e => onResponseChange(e.target.value)}
          className="max-w-xs"
        />
        {question.unit && (
          <span className="text-muted-foreground">{question.unit}</span>
        )}
      </div>
    </div>
  );
}

function HotspotRenderer({ question, response, showPoints }: QuestionRendererProps) {
  // Simplified preview - in real implementation would have interactive image
  return (
    <div className="space-y-4">
      <QuestionHeader question={question} showPoints={showPoints} />
      <div className="flex items-center justify-center h-64 bg-muted rounded-lg border border-dashed">
        <div className="text-center text-muted-foreground">
          <Eye className="h-8 w-8 mx-auto mb-2" />
          <p>Interactive hotspot image</p>
          <p className="text-sm">Click to select regions</p>
        </div>
      </div>
    </div>
  );
}

function DragDropRenderer({ question, response, showPoints }: QuestionRendererProps) {
  return (
    <div className="space-y-4">
      <QuestionHeader question={question} showPoints={showPoints} />
      <div className="flex items-center justify-center h-48 bg-muted rounded-lg border border-dashed">
        <div className="text-center text-muted-foreground">
          <Eye className="h-8 w-8 mx-auto mb-2" />
          <p>Drag and drop interface</p>
          <p className="text-sm">Drag items to their correct positions</p>
        </div>
      </div>
    </div>
  );
}

function CodeRenderer({ question, response, onResponseChange, showPoints }: QuestionRendererProps) {
  return (
    <div className="space-y-4">
      <QuestionHeader question={question} showPoints={showPoints} />
      {question.language && (
        <Badge variant="secondary">{question.language}</Badge>
      )}
      <Textarea
        placeholder="Write your code here..."
        value={response as string ?? ''}
        onChange={e => onResponseChange(e.target.value)}
        rows={12}
        className="font-mono text-sm resize-y"
      />
    </div>
  );
}

function MathEquationRenderer({ question, response, onResponseChange, showPoints }: QuestionRendererProps) {
  return (
    <div className="space-y-4">
      <QuestionHeader question={question} showPoints={showPoints} />
      <div className="p-4 bg-muted rounded-lg text-center">
        <p className="text-sm text-muted-foreground mb-2">Math equation editor</p>
        {/* Would integrate with MathQuill or similar */}
        <Input
          placeholder="Enter your mathematical expression..."
          value={response as string ?? ''}
          onChange={e => onResponseChange(e.target.value)}
          className="font-mono"
        />
      </div>
    </div>
  );
}

function QuestionHeader({ question, showPoints }: { question: Question; showPoints?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div 
        className="prose prose-sm max-w-none flex-1"
        dangerouslySetInnerHTML={{ __html: question.stem }}
      />
      {showPoints && (
        <Badge variant="outline" className="flex-shrink-0">
          {question.points} pts
        </Badge>
      )}
    </div>
  );
}

function QuestionRenderer(props: QuestionRendererProps) {
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
    case 'HOTSPOT':
      return <HotspotRenderer {...props} />;
    case 'DRAG_DROP':
      return <DragDropRenderer {...props} />;
    case 'CODE':
      return <CodeRenderer {...props} />;
    case 'MATH_EQUATION':
      return <MathEquationRenderer {...props} />;
    default:
      return <div>Unknown question type</div>;
  }
}

// ============================================================================
// PREVIEW PANEL
// ============================================================================

export function PreviewPanel({ assessment }: PreviewPanelProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, unknown>>({});
  const [timeRemaining] = useState(assessment.settings.timeLimit ? assessment.settings.timeLimit * 60 : null);
  
  const questions = assessment.questions;
  const showOneAtATime = assessment.settings.showOneQuestionAtATime;
  const showPoints = assessment.settings.showPointValues;
  const currentQuestion = questions[currentIndex];

  const updateResponse = (questionId: string, response: unknown) => {
    setResponses(prev => ({ ...prev, [questionId]: response }));
  };

  const progress = Object.keys(responses).length / questions.length * 100;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (questions.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-muted-foreground">
          <AlertCircle className="h-12 w-12 mx-auto mb-4" />
          <p className="text-lg font-medium">No questions yet</p>
          <p className="text-sm">Add questions to see the preview</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-muted/30">
      {/* Header */}
      <div className="p-4 bg-background border-b flex items-center justify-between">
        <div>
          <h2 className="font-semibold">{assessment.name || 'Untitled Assessment'}</h2>
          <p className="text-sm text-muted-foreground">
            {questions.length} question{questions.length !== 1 ? 's' : ''} · {assessment.totalPoints} points
          </p>
        </div>
        {timeRemaining !== null && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className="font-mono">{formatTime(timeRemaining)}</span>
          </div>
        )}
      </div>

      {/* Progress */}
      <div className="px-4 py-2 bg-background border-b">
        <div className="flex items-center gap-2 text-sm">
          <Progress value={progress} className="flex-1 h-2" />
          <span className="text-muted-foreground">
            {Object.keys(responses).length}/{questions.length} answered
          </span>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="max-w-3xl mx-auto p-6">
          {/* Instructions */}
          {assessment.instructions && currentIndex === 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-base">Instructions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{assessment.instructions}</p>
              </CardContent>
            </Card>
          )}

          {/* Questions */}
          {showOneAtATime ? (
            // One at a time mode
            <Card>
              <CardHeader>
                <CardDescription>
                  Question {currentIndex + 1} of {questions.length}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <QuestionRenderer
                  question={currentQuestion}
                  response={responses[currentQuestion.id]}
                  onResponseChange={r => updateResponse(currentQuestion.id, r)}
                  showPoints={showPoints}
                />
              </CardContent>
            </Card>
          ) : (
            // All at once mode
            <div className="space-y-6">
              {questions.map((question, idx) => (
                <Card key={question.id}>
                  <CardHeader>
                    <CardDescription>
                      Question {idx + 1}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <QuestionRenderer
                      question={question}
                      response={responses[question.id]}
                      onResponseChange={r => updateResponse(question.id, r)}
                      showPoints={showPoints}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Navigation (one at a time mode) */}
      {showOneAtATime && (
        <div className="p-4 bg-background border-t flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentIndex(i => i - 1)}
            disabled={currentIndex === 0 || !assessment.settings.allowBackNavigation}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          
          <div className="flex gap-1">
            {questions.map((q, idx) => (
              <button
                key={q.id}
                className={cn(
                  'w-8 h-8 rounded-full text-xs font-medium transition-colors',
                  idx === currentIndex
                    ? 'bg-primary text-primary-foreground'
                    : responses[q.id]
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-muted hover:bg-muted/80'
                )}
                onClick={() => assessment.settings.allowBackNavigation && setCurrentIndex(idx)}
                disabled={!assessment.settings.allowBackNavigation && idx < currentIndex}
              >
                {idx + 1}
              </button>
            ))}
          </div>

          {currentIndex === questions.length - 1 ? (
            <Button>
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Submit
            </Button>
          ) : (
            <Button onClick={() => setCurrentIndex(i => i + 1)}>
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      )}

      {/* Submit button (all at once mode) */}
      {!showOneAtATime && (
        <div className="p-4 bg-background border-t flex justify-end">
          <Button size="lg">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Submit Assessment
          </Button>
        </div>
      )}
    </div>
  );
}
