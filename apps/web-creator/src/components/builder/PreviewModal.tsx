/**
 * Preview Modal Component
 * Simulates student view of lesson content
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Monitor,
  Tablet,
  Smartphone,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Volume2,
  VolumeX,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from 'lucide-react';
import { LessonBlock } from '@/lib/api/content';
import { cn } from '@/lib/utils';

interface PreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lessonId: string;
  blocks: LessonBlock[];
}

type DeviceType = 'desktop' | 'tablet' | 'mobile';
type LearnerProfile = 'default' | 'struggling' | 'advanced' | 'accessibility';

const DEVICE_SIZES: Record<DeviceType, { width: number; height: number }> = {
  desktop: { width: 1200, height: 800 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 667 },
};

export const PreviewModal: React.FC<PreviewModalProps> = ({
  open,
  onOpenChange,
  lessonId,
  blocks,
}) => {
  const [device, setDevice] = useState<DeviceType>('desktop');
  const [learnerProfile, setLearnerProfile] = useState<LearnerProfile>('default');
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [showFeedback, setShowFeedback] = useState<Record<string, boolean>>({});

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setCurrentBlockIndex(0);
      setResponses({});
      setShowFeedback({});
    }
  }, [open]);

  const currentBlock = blocks[currentBlockIndex];
  const progress = blocks.length > 0 ? ((currentBlockIndex + 1) / blocks.length) * 100 : 0;

  const handleNext = () => {
    if (currentBlockIndex < blocks.length - 1) {
      setCurrentBlockIndex(currentBlockIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentBlockIndex > 0) {
      setCurrentBlockIndex(currentBlockIndex - 1);
    }
  };

  const handleResponse = (blockId: string, response: any) => {
    setResponses({ ...responses, [blockId]: response });
  };

  const handleSubmit = (blockId: string) => {
    setShowFeedback({ ...showFeedback, [blockId]: true });
  };

  const handleReset = () => {
    setCurrentBlockIndex(0);
    setResponses({});
    setShowFeedback({});
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] h-[90vh] flex flex-col p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <DialogTitle className="text-lg font-semibold">
            Preview Mode
          </DialogTitle>

          <div className="flex items-center gap-4">
            {/* Learner Profile */}
            <Select value={learnerProfile} onValueChange={(v) => setLearnerProfile(v as LearnerProfile)}>
              <SelectTrigger className="w-40 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default Learner</SelectItem>
                <SelectItem value="struggling">Struggling Learner</SelectItem>
                <SelectItem value="advanced">Advanced Learner</SelectItem>
                <SelectItem value="accessibility">Accessibility Mode</SelectItem>
              </SelectContent>
            </Select>

            {/* Device Toggle */}
            <div className="flex items-center border rounded-md">
              <Button
                variant={device === 'desktop' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setDevice('desktop')}
              >
                <Monitor className="h-4 w-4" />
              </Button>
              <Button
                variant={device === 'tablet' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setDevice('tablet')}
              >
                <Tablet className="h-4 w-4" />
              </Button>
              <Button
                variant={device === 'mobile' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setDevice('mobile')}
              >
                <Smartphone className="h-4 w-4" />
              </Button>
            </div>

            {/* Reset Button */}
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </Button>
          </div>
        </div>

        {/* Preview Area */}
        <div className="flex-1 flex items-center justify-center bg-muted/50 p-4 overflow-hidden">
          <div
            className={cn(
              'bg-background rounded-lg shadow-xl overflow-hidden transition-all',
              device === 'mobile' && 'rounded-3xl border-8 border-gray-800'
            )}
            style={{
              width: Math.min(DEVICE_SIZES[device].width, window.innerWidth - 100),
              height: Math.min(DEVICE_SIZES[device].height, window.innerHeight - 200),
            }}
          >
            {/* Simulated Browser/Device Chrome */}
            <div className="h-full flex flex-col">
              {/* Progress Bar */}
              <div className="p-3 border-b bg-card">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">
                    {currentBlockIndex + 1} of {blocks.length}
                  </span>
                  <Badge variant="secondary">{Math.round(progress)}%</Badge>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              {/* Content */}
              <ScrollArea className="flex-1">
                <div className="p-6">
                  {currentBlock ? (
                    <BlockPreview
                      block={currentBlock}
                      response={responses[currentBlock.id]}
                      showFeedback={showFeedback[currentBlock.id]}
                      onResponse={(r) => handleResponse(currentBlock.id, r)}
                      onSubmit={() => handleSubmit(currentBlock.id)}
                      learnerProfile={learnerProfile}
                    />
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      No content to preview
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Navigation */}
              <div className="p-3 border-t bg-card flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentBlockIndex === 0}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>

                <Button
                  onClick={handleNext}
                  disabled={currentBlockIndex === blocks.length - 1}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Block Preview Renderer
interface BlockPreviewProps {
  block: LessonBlock;
  response: any;
  showFeedback: boolean;
  onResponse: (response: any) => void;
  onSubmit: () => void;
  learnerProfile: LearnerProfile;
}

const BlockPreview: React.FC<BlockPreviewProps> = ({
  block,
  response,
  showFeedback,
  onResponse,
  onSubmit,
  learnerProfile,
}) => {
  switch (block.type) {
    case 'text':
      return (
        <div
          className="prose prose-sm dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: block.content.html || '' }}
        />
      );

    case 'heading':
      const HeadingTag = `h${block.content.level || 2}` as keyof JSX.IntrinsicElements;
      return <HeadingTag className="font-bold">{block.content.text}</HeadingTag>;

    case 'image':
      return (
        <figure className="my-4">
          {block.content.src ? (
            <img
              src={block.content.src}
              alt={block.content.alt || 'Lesson image'}
              className="rounded-lg max-w-full mx-auto"
            />
          ) : (
            <div className="h-48 bg-muted rounded-lg flex items-center justify-center">
              <span className="text-muted-foreground">Image placeholder</span>
            </div>
          )}
          {block.content.caption && (
            <figcaption className="text-center text-sm text-muted-foreground mt-2">
              {block.content.caption}
            </figcaption>
          )}
        </figure>
      );

    case 'video':
      return (
        <div className="my-4">
          {block.content.src ? (
            <video
              src={block.content.src}
              poster={block.content.poster}
              controls={block.content.controls !== false}
              autoPlay={block.content.autoplay}
              className="rounded-lg max-w-full mx-auto"
            />
          ) : (
            <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
              <Play className="h-12 w-12 text-muted-foreground" />
            </div>
          )}
        </div>
      );

    case 'multiple-choice':
      return (
        <MultipleChoicePreview
          content={block.content}
          response={response}
          showFeedback={showFeedback}
          onResponse={onResponse}
          onSubmit={onSubmit}
        />
      );

    case 'true-false':
      return (
        <TrueFalsePreview
          content={block.content}
          response={response}
          showFeedback={showFeedback}
          onResponse={onResponse}
          onSubmit={onSubmit}
        />
      );

    case 'flashcard':
      return <FlashcardPreview content={block.content} />;

    default:
      return (
        <div className="p-4 border rounded-lg bg-muted/30">
          <p className="text-sm text-muted-foreground">
            {block.type} block preview
          </p>
        </div>
      );
  }
};

// Multiple Choice Preview
const MultipleChoicePreview: React.FC<{
  content: any;
  response: any;
  showFeedback: boolean;
  onResponse: (response: any) => void;
  onSubmit: () => void;
}> = ({ content, response, showFeedback, onResponse, onSubmit }) => {
  const selectedIds = response?.selectedIds || [];
  const isCorrect = showFeedback && content.options?.every((opt: any) =>
    opt.isCorrect === selectedIds.includes(opt.id)
  );

  const toggleOption = (optionId: string) => {
    if (showFeedback) return;
    
    let newSelection;
    if (content.allowMultiple) {
      newSelection = selectedIds.includes(optionId)
        ? selectedIds.filter((id: string) => id !== optionId)
        : [...selectedIds, optionId];
    } else {
      newSelection = [optionId];
    }
    onResponse({ selectedIds: newSelection });
  };

  return (
    <div className="space-y-4">
      <div
        className="prose prose-sm dark:prose-invert"
        dangerouslySetInnerHTML={{ __html: content.question || '' }}
      />

      <div className="space-y-2">
        {content.options?.map((option: any) => {
          const isSelected = selectedIds.includes(option.id);
          const showCorrect = showFeedback && option.isCorrect;
          const showIncorrect = showFeedback && isSelected && !option.isCorrect;

          return (
            <button
              key={option.id}
              onClick={() => toggleOption(option.id)}
              disabled={showFeedback}
              className={cn(
                'w-full p-3 text-left border rounded-lg transition-colors',
                isSelected && !showFeedback && 'border-primary bg-primary/5',
                showCorrect && 'border-green-500 bg-green-50',
                showIncorrect && 'border-red-500 bg-red-50',
                !showFeedback && 'hover:border-primary/50'
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                    isSelected && 'border-primary bg-primary',
                    showCorrect && 'border-green-500 bg-green-500',
                    showIncorrect && 'border-red-500 bg-red-500'
                  )}
                >
                  {(isSelected || showCorrect) && (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>
                <span>{option.text}</span>
                {showFeedback && option.isCorrect && (
                  <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />
                )}
                {showIncorrect && (
                  <XCircle className="h-4 w-4 text-red-500 ml-auto" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {!showFeedback && selectedIds.length > 0 && (
        <Button onClick={onSubmit} className="w-full">
          Submit Answer
        </Button>
      )}

      {showFeedback && (
        <div
          className={cn(
            'p-4 rounded-lg',
            isCorrect ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          )}
        >
          <div className="flex items-center gap-2 font-medium">
            {isCorrect ? (
              <>
                <CheckCircle2 className="h-5 w-5" />
                {content.feedback?.correct || 'Correct!'}
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5" />
                {content.feedback?.incorrect || 'Not quite right. Try again!'}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// True/False Preview
const TrueFalsePreview: React.FC<{
  content: any;
  response: any;
  showFeedback: boolean;
  onResponse: (response: any) => void;
  onSubmit: () => void;
}> = ({ content, response, showFeedback, onResponse, onSubmit }) => {
  const selectedAnswer = response?.answer;
  const isCorrect = showFeedback && selectedAnswer === content.correctAnswer;

  return (
    <div className="space-y-4">
      <div
        className="prose prose-sm dark:prose-invert"
        dangerouslySetInnerHTML={{ __html: content.question || '' }}
      />

      <div className="grid grid-cols-2 gap-3">
        {[true, false].map((value) => {
          const isSelected = selectedAnswer === value;
          const showCorrect = showFeedback && content.correctAnswer === value;
          const showIncorrect = showFeedback && isSelected && content.correctAnswer !== value;

          return (
            <button
              key={String(value)}
              onClick={() => !showFeedback && onResponse({ answer: value })}
              disabled={showFeedback}
              className={cn(
                'p-4 text-center border rounded-lg transition-colors font-medium',
                isSelected && !showFeedback && 'border-primary bg-primary/5',
                showCorrect && 'border-green-500 bg-green-50',
                showIncorrect && 'border-red-500 bg-red-50',
                !showFeedback && 'hover:border-primary/50'
              )}
            >
              {value ? 'True' : 'False'}
            </button>
          );
        })}
      </div>

      {!showFeedback && selectedAnswer !== undefined && (
        <Button onClick={onSubmit} className="w-full">
          Submit Answer
        </Button>
      )}

      {showFeedback && (
        <div
          className={cn(
            'p-4 rounded-lg',
            isCorrect ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          )}
        >
          {isCorrect ? content.feedback?.correct : content.feedback?.incorrect}
        </div>
      )}
    </div>
  );
};

// Flashcard Preview
const FlashcardPreview: React.FC<{ content: any }> = ({ content }) => {
  const [currentCard, setCurrentCard] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const cards = content.cards || [];
  const card = cards[currentCard];

  if (!card) {
    return <div className="text-muted-foreground">No flashcards</div>;
  }

  return (
    <div className="space-y-4">
      <div
        className="relative h-64 cursor-pointer perspective-1000"
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div
          className={cn(
            'absolute inset-0 transition-transform duration-500 transform-style-preserve-3d',
            isFlipped && 'rotate-y-180'
          )}
        >
          {/* Front */}
          <div className="absolute inset-0 backface-hidden bg-card border rounded-xl p-6 flex items-center justify-center">
            <div dangerouslySetInnerHTML={{ __html: card.front }} />
          </div>
          {/* Back */}
          <div className="absolute inset-0 backface-hidden rotate-y-180 bg-primary text-primary-foreground rounded-xl p-6 flex items-center justify-center">
            <div dangerouslySetInnerHTML={{ __html: card.back }} />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => {
            setCurrentCard(Math.max(0, currentCard - 1));
            setIsFlipped(false);
          }}
          disabled={currentCard === 0}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground">
          {currentCard + 1} / {cards.length}
        </span>
        <Button
          variant="outline"
          onClick={() => {
            setCurrentCard(Math.min(cards.length - 1, currentCard + 1));
            setIsFlipped(false);
          }}
          disabled={currentCard === cards.length - 1}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
