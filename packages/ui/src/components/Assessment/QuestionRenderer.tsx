'use client';

import { cn } from '../../utils';
import type { QuestionRendererProps } from './types';

/**
 * QuestionRenderer Component
 *
 * Renders an assessment question with options.
 */
export function QuestionRenderer({
  question,
  domain,
  questionNumber,
  totalQuestions,
  onAnswer,
  className,
}: QuestionRendererProps) {
  const handleOptionClick = (index: number) => {
    onAnswer(index);
  };

  return (
    <div
      className={cn(
        'rounded-3xl border-2 border-[var(--aivo-teal-100)] bg-white p-8 shadow-xl',
        className
      )}
    >
      {/* Domain badge */}
      <div className="mb-4 flex items-center justify-center gap-2">
        <span className="text-2xl">{domain.emoji}</span>
        <span className="text-sm font-medium text-[var(--aivo-neutral-500)]">
          {domain.name} • Question {questionNumber} of {totalQuestions}
        </span>
      </div>

      {/* Question */}
      <h2 className="mb-6 text-center text-xl font-bold text-[var(--aivo-brand-navy)]">
        {question.questionText}
      </h2>

      {/* Options */}
      <div className="grid gap-3">
        {question.options?.map((option, idx) => (
          <button
            key={idx}
            onClick={() => handleOptionClick(idx)}
            className="rounded-xl border-2 border-[var(--aivo-neutral-200)] p-4 text-left font-medium text-[var(--aivo-brand-navy)] transition-all hover:border-[var(--aivo-brand-primary)] hover:bg-[var(--aivo-purple-50)]"
          >
            <span className="mr-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--aivo-purple-100)] text-sm font-bold text-[var(--aivo-brand-primary)]">
              {String.fromCharCode(65 + idx)}
            </span>
            {option}
          </button>
        ))}
      </div>

      {/* Question progress dots */}
      <div className="mt-6 flex justify-center gap-2">
        {Array.from({ length: totalQuestions }).map((_, idx) => (
          <div
            key={idx}
            className={cn(
              'h-3 w-3 rounded-full transition-colors',
              idx === questionNumber - 1
                ? 'bg-[var(--aivo-brand-primary)]'
                : idx < questionNumber - 1
                  ? 'bg-[var(--aivo-teal-400)]'
                  : 'bg-[var(--aivo-neutral-200)]'
            )}
          />
        ))}
      </div>
    </div>
  );
}
