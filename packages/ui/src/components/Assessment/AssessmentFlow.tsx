'use client';

import { cn } from '../../utils';
import { AssessmentCard } from './AssessmentCard';
import { QuestionRenderer } from './QuestionRenderer';
import { GameBreak } from './GameBreak';
import { ProgressIndicator } from './ProgressIndicator';
import type { AssessmentFlowProps } from './types';

// Game break activities
const GAME_BREAKS = [
  { emoji: '🎈', title: 'Balloon Breath!', instruction: 'Take a deep breath in... now blow up an imaginary balloon!', duration: 8 },
  { emoji: '💃', title: 'Shake It Out!', instruction: 'Stand up and shake your arms and legs for 10 seconds!', duration: 10 },
  { emoji: '⭐', title: 'Star Gazing', instruction: "Close your eyes and imagine you're looking at stars in the sky...", duration: 8 },
  { emoji: '🎉', title: 'Dance Party!', instruction: 'Do your favorite dance move! You earned it!', duration: 8 },
];

/**
 * AssessmentFlow Component
 *
 * A multi-phase assessment flow with domain introductions, questions,
 * and game breaks between domains.
 */
export function AssessmentFlow({
  phase,
  domains,
  currentDomainIndex,
  currentQuestionIndex,
  questionsPerDomain = 5,
  questions = [],
  isLoading = false,
  onAnswer,
  onPhaseChange,
  onStartDomain,
  onSkipBreak,
  progress,
  className,
}: AssessmentFlowProps) {
  const currentDomain = domains[currentDomainIndex];
  const currentQuestion = questions[currentQuestionIndex];
  const currentBreak = GAME_BREAKS[currentDomainIndex % GAME_BREAKS.length];

  // Render loading state
  if (isLoading) {
    return (
      <div className={cn('flex min-h-[400px] items-center justify-center', className)}>
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 animate-pulse items-center justify-center rounded-full bg-gradient-to-br from-[var(--aivo-teal-100)] to-[var(--aivo-purple-100)]">
            <span className="text-4xl">{currentDomain?.emoji}</span>
          </div>
          <p className="text-lg text-[var(--aivo-neutral-600)]">
            Getting your questions ready...
          </p>
        </div>
      </div>
    );
  }

  // Render domain intro
  if (phase === 'domain_intro') {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="mx-auto max-w-xl text-center">
          <div
            className={cn(
              'mx-auto mb-6 flex h-28 w-28 items-center justify-center rounded-full shadow-lg',
              `bg-gradient-to-br ${currentDomain?.color}`
            )}
          >
            <span className="text-6xl">{currentDomain?.emoji}</span>
          </div>
          <h2 className="mb-3 text-3xl font-bold text-[var(--aivo-brand-navy)]">
            {currentDomain?.name}
          </h2>
          <p className="mb-2 text-lg text-[var(--aivo-neutral-600)]">
            {currentDomain?.description}
          </p>
          <div className="mb-6 inline-block rounded-full bg-[var(--aivo-purple-100)] px-4 py-2 text-sm font-medium text-[var(--aivo-brand-primary)]">
            {questionsPerDomain} quick questions
          </div>

          <button
            onClick={onStartDomain}
            className="w-full rounded-xl bg-gradient-to-r from-[var(--aivo-brand-primary)] to-[var(--aivo-purple-500)] px-6 py-4 text-xl font-bold text-white transition-all hover:opacity-90"
          >
            Start! ✨
          </button>
        </div>

        {/* Domain progress indicator */}
        <div className="flex justify-center gap-2">
          {domains.map((domain, idx) => (
            <div
              key={domain.id}
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-lg transition-all',
                idx < currentDomainIndex
                  ? 'bg-[var(--aivo-teal-400)] text-white'
                  : idx === currentDomainIndex
                    ? 'bg-[var(--aivo-brand-primary)] text-white ring-4 ring-[var(--aivo-purple-200)]'
                    : 'border-2 border-[var(--aivo-neutral-200)] bg-white text-[var(--aivo-neutral-400)]'
              )}
            >
              {idx < currentDomainIndex ? '✓' : <span className="text-lg">{domain.emoji}</span>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Render questions
  if (phase === 'domain_questions' && currentQuestion) {
    return (
      <div className={cn('mx-auto max-w-xl', className)}>
        <QuestionRenderer
          question={currentQuestion}
          domain={currentDomain}
          questionNumber={currentQuestionIndex + 1}
          totalQuestions={questionsPerDomain}
          onAnswer={(optionIndex) => onAnswer(currentQuestion.id, optionIndex)}
        />
      </div>
    );
  }

  // Render game break
  if (phase === 'game_break') {
    const remainingDomains = domains.length - currentDomainIndex - 1;
    return (
      <div className={cn('mx-auto max-w-xl', className)}>
        <GameBreak
          activity={currentBreak}
          countdown={currentBreak.duration}
          message={`🎉 You completed ${currentDomain?.name}! ${remainingDomains} more to go!`}
          onSkip={onSkipBreak}
        />
      </div>
    );
  }

  // Render completion
  if (phase === 'completing') {
    return (
      <div className={cn('flex min-h-[400px] items-center justify-center', className)}>
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-32 w-32 animate-pulse items-center justify-center rounded-full bg-gradient-to-br from-[var(--aivo-teal-400)] to-[var(--aivo-brand-primary)] shadow-lg">
            <span className="text-6xl">🧠</span>
          </div>
          <h2 className="mb-2 text-2xl font-bold text-[var(--aivo-brand-navy)]">
            Amazing work! 🌟
          </h2>
          <p className="text-lg text-[var(--aivo-neutral-600)]">
            Preparing your personalized learning brain...
          </p>
          <div className="mt-4 flex justify-center gap-1">
            <div className="h-3 w-3 animate-bounce rounded-full bg-[var(--aivo-brand-primary)]" style={{ animationDelay: '0ms' }} />
            <div className="h-3 w-3 animate-bounce rounded-full bg-[var(--aivo-brand-primary)]" style={{ animationDelay: '150ms' }} />
            <div className="h-3 w-3 animate-bounce rounded-full bg-[var(--aivo-brand-primary)]" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    );
  }

  return null;
}
