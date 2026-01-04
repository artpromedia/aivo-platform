'use client';

/**
 * Lesson Preview Component
 *
 * Preview lesson as students would see it with:
 * - Mobile/tablet/desktop preview modes
 * - Interactive preview (can try quizzes)
 * - Responsive layout preview
 */

import React from 'react';
import { Monitor, Tablet, Smartphone, X, Eye } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

export type PreviewMode = 'desktop' | 'tablet' | 'mobile';

export interface Block {
  id: string;
  type: string;
  position: number;
  content: Record<string, any>;
  settings?: Record<string, any>;
}

export interface LessonPreviewData {
  lessonId: string;
  title: string;
  description?: string;
  blocks: Block[];
  metadata: {
    subject: string;
    gradeBand: string;
    totalBlocks: number;
    estimatedDuration: number;
  };
}

interface LessonPreviewProps {
  lesson: LessonPreviewData;
  defaultMode?: PreviewMode;
  onClose?: () => void;
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════

export function LessonPreview({ lesson, defaultMode = 'desktop', onClose }: LessonPreviewProps) {
  const [mode, setMode] = React.useState<PreviewMode>(defaultMode);

  const containerWidths: Record<PreviewMode, string> = {
    desktop: 'max-w-6xl',
    tablet: 'max-w-3xl',
    mobile: 'max-w-sm',
  };

  return (
    <div className="flex h-full flex-col bg-gray-100">
      {/* Preview Header */}
      <div className="flex items-center justify-between border-b bg-white px-6 py-4">
        <div className="flex items-center gap-4">
          <Eye className="h-5 w-5 text-muted-foreground" />
          <div>
            <h2 className="font-semibold">Preview Mode</h2>
            <p className="text-xs text-muted-foreground">
              {lesson.metadata.totalBlocks} blocks · {lesson.metadata.estimatedDuration} min
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Preview Mode Selector */}
          <div className="flex items-center gap-1 rounded-lg border bg-gray-50 p-1">
            <Button
              variant={mode === 'desktop' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setMode('desktop')}
              title="Desktop Preview"
            >
              <Monitor className="h-4 w-4" />
            </Button>
            <Button
              variant={mode === 'tablet' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setMode('tablet')}
              title="Tablet Preview"
            >
              <Tablet className="h-4 w-4" />
            </Button>
            <Button
              variant={mode === 'mobile' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setMode('mobile')}
              title="Mobile Preview"
            >
              <Smartphone className="h-4 w-4" />
            </Button>
          </div>

          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Preview Content */}
      <ScrollArea className="flex-1">
        <div className="flex min-h-full items-start justify-center p-8">
          <div
            className={cn(
              'w-full rounded-lg border bg-white shadow-xl transition-all',
              containerWidths[mode]
            )}
          >
            {/* Lesson Header */}
            <div className="border-b p-6">
              <h1 className="mb-2 text-2xl font-bold">{lesson.title}</h1>
              {lesson.description && (
                <p className="text-muted-foreground">{lesson.description}</p>
              )}
              <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div>
                  <span className="font-medium">Subject:</span> {lesson.metadata.subject}
                </div>
                <div>
                  <span className="font-medium">Grade:</span> {formatGradeBand(lesson.metadata.gradeBand)}
                </div>
                <div>
                  <span className="font-medium">Duration:</span> ~{lesson.metadata.estimatedDuration} min
                </div>
              </div>
            </div>

            {/* Lesson Blocks */}
            <div className="p-6">
              {lesson.blocks.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  No content blocks in this lesson yet.
                </div>
              ) : (
                <div className="space-y-6">
                  {lesson.blocks.map((block) => (
                    <BlockRenderer key={block.id} block={block} mode={mode} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// BLOCK RENDERER
// ════════════════════════════════════════════════════════════════════════════

interface BlockRendererProps {
  block: Block;
  mode: PreviewMode;
}

function BlockRenderer({ block, mode }: BlockRendererProps) {
  const { type, content, settings = {} } = block;

  const getAlignment = () => {
    const alignment = settings.alignment || 'left';
    return {
      left: 'text-left',
      center: 'text-center',
      right: 'text-right',
      justify: 'text-justify',
    }[alignment];
  };

  const getFontSize = () => {
    const fontSize = settings.fontSize || 'medium';
    return {
      small: 'text-sm',
      medium: 'text-base',
      large: 'text-lg',
    }[fontSize];
  };

  switch (type) {
    case 'TEXT_PARAGRAPH':
      return (
        <div className={cn('prose max-w-none', getAlignment(), getFontSize())}>
          <div dangerouslySetInnerHTML={{ __html: content.text || '' }} />
        </div>
      );

    case 'TEXT_HEADING':
      const HeadingTag = `h${content.level || 2}` as keyof JSX.IntrinsicElements;
      return (
        <HeadingTag className={cn('font-bold', getAlignment())}>
          {content.text}
        </HeadingTag>
      );

    case 'TEXT_LIST':
      const ListTag = content.listType === 'ordered' ? 'ol' : 'ul';
      return (
        <ListTag className={cn('space-y-2', content.listType === 'ordered' ? 'list-decimal' : 'list-disc', 'ml-6')}>
          {(content.items || []).map((item: string, index: number) => (
            <li key={index}>{item}</li>
          ))}
        </ListTag>
      );

    case 'TEXT_QUOTE':
      return (
        <blockquote className="border-l-4 border-primary bg-gray-50 p-4 italic">
          <div dangerouslySetInnerHTML={{ __html: content.text || '' }} />
          {content.author && (
            <footer className="mt-2 text-sm font-medium not-italic text-muted-foreground">
              — {content.author}
            </footer>
          )}
        </blockquote>
      );

    case 'MEDIA_IMAGE':
      return (
        <figure className={cn(getAlignment())}>
          {content.url ? (
            <img
              src={content.url}
              alt={content.alt || ''}
              className={cn(
                'rounded-lg',
                settings.size === 'small' && 'max-w-sm',
                settings.size === 'medium' && 'max-w-2xl',
                settings.size === 'large' && 'max-w-4xl',
                settings.size === 'full' && 'w-full'
              )}
            />
          ) : (
            <div className="flex h-64 items-center justify-center rounded-lg bg-gray-100 text-muted-foreground">
              No image
            </div>
          )}
          {content.caption && (
            <figcaption className="mt-2 text-sm text-muted-foreground">
              {content.caption}
            </figcaption>
          )}
        </figure>
      );

    case 'MEDIA_VIDEO':
      return (
        <div className="aspect-video overflow-hidden rounded-lg bg-gray-900">
          {content.url ? (
            <VideoEmbed url={content.url} provider={content.provider} title={content.title} />
          ) : (
            <div className="flex h-full items-center justify-center text-white">
              No video URL
            </div>
          )}
        </div>
      );

    case 'MEDIA_AUDIO':
      return (
        <div className="rounded-lg border p-4">
          {content.url ? (
            <audio controls className="w-full" src={content.url}>
              Your browser does not support the audio element.
            </audio>
          ) : (
            <div className="py-8 text-center text-muted-foreground">No audio URL</div>
          )}
          {content.title && <p className="mt-2 text-sm font-medium">{content.title}</p>}
        </div>
      );

    case 'QUIZ':
      return <QuizBlock content={content} settings={settings} />;

    case 'POLL':
      return <PollBlock content={content} settings={settings} />;

    case 'FLASHCARD':
      return <FlashcardBlock content={content} />;

    case 'ACTIVITY_WORKSHEET':
      return (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
          <h3 className="mb-2 text-lg font-semibold text-blue-900">
            {content.title || 'Worksheet'}
          </h3>
          <div
            className="prose max-w-none text-blue-800"
            dangerouslySetInnerHTML={{ __html: content.instructions || '' }}
          />
        </div>
      );

    case 'ACTIVITY_ASSIGNMENT':
      return (
        <div className="rounded-lg border border-purple-200 bg-purple-50 p-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-purple-900">
              {content.title || 'Assignment'}
            </h3>
            <span className="rounded bg-purple-200 px-2 py-1 text-sm font-medium text-purple-900">
              {content.points || 0} points
            </span>
          </div>
          <div
            className="prose max-w-none text-purple-800"
            dangerouslySetInnerHTML={{ __html: content.instructions || '' }}
          />
        </div>
      );

    case 'ACTIVITY_DISCUSSION':
      return (
        <div className="rounded-lg border border-green-200 bg-green-50 p-6">
          <h3 className="mb-2 text-lg font-semibold text-green-900">Discussion</h3>
          <div
            className="prose max-w-none text-green-800"
            dangerouslySetInnerHTML={{ __html: content.prompt || '' }}
          />
          {content.minimumWords > 0 && (
            <p className="mt-3 text-sm text-green-700">
              Minimum {content.minimumWords} words required
            </p>
          )}
        </div>
      );

    case 'LAYOUT_DIVIDER':
      return <hr className="my-8 border-gray-300" />;

    case 'LAYOUT_CALLOUT':
      const calloutStyles = {
        info: 'border-blue-200 bg-blue-50 text-blue-900',
        warning: 'border-yellow-200 bg-yellow-50 text-yellow-900',
        success: 'border-green-200 bg-green-50 text-green-900',
        error: 'border-red-200 bg-red-50 text-red-900',
      };
      return (
        <div className={cn('rounded-lg border p-4', calloutStyles[settings.type as keyof typeof calloutStyles] || calloutStyles.info)}>
          {content.title && <h4 className="mb-2 font-semibold">{content.title}</h4>}
          <div dangerouslySetInnerHTML={{ __html: content.text || '' }} />
        </div>
      );

    default:
      return (
        <div className="rounded-lg border border-dashed p-4 text-center text-muted-foreground">
          {type} block (preview not available)
        </div>
      );
  }
}

// ════════════════════════════════════════════════════════════════════════════
// INTERACTIVE BLOCKS
// ════════════════════════════════════════════════════════════════════════════

function QuizBlock({ content, settings }: { content: any; settings: any }) {
  const [selectedAnswer, setSelectedAnswer] = React.useState<number | null>(null);
  const [submitted, setSubmitted] = React.useState(false);

  const handleSubmit = () => {
    setSubmitted(true);
  };

  const isCorrect = selectedAnswer === content.correctAnswer;

  return (
    <div className="rounded-lg border p-6">
      <div className="mb-4">
        <div className="mb-3 text-lg font-semibold" dangerouslySetInnerHTML={{ __html: content.question || '' }} />
      </div>

      <div className="space-y-2">
        {(content.options || []).map((option: string, index: number) => (
          <label
            key={index}
            className={cn(
              'flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors',
              selectedAnswer === index && 'border-primary bg-primary/5',
              submitted && index === content.correctAnswer && 'border-green-500 bg-green-50',
              submitted && selectedAnswer === index && index !== content.correctAnswer && 'border-red-500 bg-red-50'
            )}
          >
            <input
              type="radio"
              name="quiz-answer"
              checked={selectedAnswer === index}
              onChange={() => setSelectedAnswer(index)}
              disabled={submitted}
              className="h-4 w-4"
            />
            <span>{option}</span>
          </label>
        ))}
      </div>

      {!submitted && (
        <Button
          onClick={handleSubmit}
          disabled={selectedAnswer === null}
          className="mt-4"
        >
          Submit Answer
        </Button>
      )}

      {submitted && settings.showFeedback && (
        <div className={cn('mt-4 rounded-lg p-4', isCorrect ? 'bg-green-50 text-green-900' : 'bg-red-50 text-red-900')}>
          <p className="font-semibold">
            {isCorrect ? '✓ Correct!' : '✗ Incorrect'}
          </p>
          {content.explanation && (
            <div className="mt-2" dangerouslySetInnerHTML={{ __html: content.explanation }} />
          )}
        </div>
      )}
    </div>
  );
}

function PollBlock({ content, settings }: { content: any; settings: any }) {
  const [selectedOptions, setSelectedOptions] = React.useState<Set<number>>(new Set());
  const [submitted, setSubmitted] = React.useState(false);

  const toggleOption = (index: number) => {
    const newSet = new Set(selectedOptions);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      if (!settings.multipleChoice) {
        newSet.clear();
      }
      newSet.add(index);
    }
    setSelectedOptions(newSet);
  };

  return (
    <div className="rounded-lg border p-6">
      <h3 className="mb-4 text-lg font-semibold">{content.question}</h3>
      <div className="space-y-2">
        {(content.options || []).map((option: string, index: number) => (
          <label
            key={index}
            className={cn(
              'flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors',
              selectedOptions.has(index) && 'border-primary bg-primary/5'
            )}
          >
            <input
              type={settings.multipleChoice ? 'checkbox' : 'radio'}
              checked={selectedOptions.has(index)}
              onChange={() => toggleOption(index)}
              disabled={submitted}
              className="h-4 w-4"
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
      {!submitted && (
        <Button
          onClick={() => setSubmitted(true)}
          disabled={selectedOptions.size === 0}
          className="mt-4"
        >
          Submit Vote
        </Button>
      )}
      {submitted && (
        <p className="mt-4 text-sm text-green-600">Thank you for your response!</p>
      )}
    </div>
  );
}

function FlashcardBlock({ content }: { content: any }) {
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [isFlipped, setIsFlipped] = React.useState(false);

  const cards = content.cards || [];
  const currentCard = cards[currentIndex];

  if (cards.length === 0) {
    return <div className="rounded-lg border p-6 text-center text-muted-foreground">No flashcards</div>;
  }

  return (
    <div className="rounded-lg border p-6">
      <div className="mb-4 flex items-center justify-between text-sm text-muted-foreground">
        <span>Flashcard {currentIndex + 1} of {cards.length}</span>
        <span>Click card to flip</span>
      </div>

      <div
        onClick={() => setIsFlipped(!isFlipped)}
        className="mb-4 flex min-h-[200px] cursor-pointer items-center justify-center rounded-lg border-2 bg-white p-8 text-center text-lg shadow-md transition-transform hover:scale-105"
      >
        {isFlipped ? currentCard?.back : currentCard?.front}
      </div>

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => {
            setCurrentIndex(Math.max(0, currentIndex - 1));
            setIsFlipped(false);
          }}
          disabled={currentIndex === 0}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setCurrentIndex(Math.min(cards.length - 1, currentIndex + 1));
            setIsFlipped(false);
          }}
          disabled={currentIndex === cards.length - 1}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// VIDEO EMBED
// ════════════════════════════════════════════════════════════════════════════

function VideoEmbed({ url, provider, title }: { url: string; provider: string; title?: string }) {
  const getEmbedUrl = () => {
    if (provider === 'youtube') {
      const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/)?.[1];
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    } else if (provider === 'vimeo') {
      const videoId = url.match(/vimeo\.com\/(\d+)/)?.[1];
      return videoId ? `https://player.vimeo.com/video/${videoId}` : null;
    }
    return url;
  };

  const embedUrl = getEmbedUrl();

  if (!embedUrl) {
    return <div className="flex h-full items-center justify-center text-white">Invalid video URL</div>;
  }

  return (
    <iframe
      src={embedUrl}
      title={title || 'Video'}
      className="h-full w-full"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
    />
  );
}

// ════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════

function formatGradeBand(gradeBand: string): string {
  const formats: Record<string, string> = {
    K_2: 'K-2',
    G3_5: '3-5',
    G6_8: '6-8',
    G9_12: '9-12',
  };
  return formats[gradeBand] || gradeBand;
}
