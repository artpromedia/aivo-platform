'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import type { AssessmentQuestion as QuestionType } from '../../../hooks/useAssessmentEngine';

interface AssessmentQuestionProps {
  question: QuestionType;
  onSubmit: (answer: number | string | null) => void;
  showHint?: boolean;
}

export function AssessmentQuestion({ question, onSubmit, showHint }: AssessmentQuestionProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showingHint, setShowingHint] = useState(false);

  const handleOptionSelect = (index: number) => {
    setSelectedAnswer(index);
    // Auto-submit after a short delay for better UX
    setTimeout(() => {
      onSubmit(index);
      setSelectedAnswer(null);
    }, 300);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-3xl shadow-xl p-8 border-2 border-[var(--aivo-teal-100)]"
    >
      {/* Question header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="px-3 py-1 bg-[var(--aivo-purple-100)] text-[var(--aivo-brand-primary)] rounded-full text-sm font-medium capitalize">
            {question.subject}
          </span>
          <div className="flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full ${
                  i < question.difficulty
                    ? 'bg-[var(--aivo-brand-primary)]'
                    : 'bg-[var(--aivo-neutral-200)]'
                }`}
              />
            ))}
          </div>
        </div>
        <h2 className="text-xl md:text-2xl font-bold text-[var(--aivo-brand-navy)]">
          {question.content.question}
        </h2>
      </div>

      {/* Multiple choice options */}
      {question.type === 'multiple-choice' && question.content.options && (
        <div className="space-y-3">
          {question.content.options.map((option, index) => (
            <motion.button
              key={index}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => handleOptionSelect(index)}
              className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-4 ${
                selectedAnswer === index
                  ? 'border-[var(--aivo-brand-primary)] bg-[var(--aivo-purple-50)] shadow-md'
                  : 'border-[var(--aivo-neutral-200)] hover:border-[var(--aivo-purple-300)] hover:bg-[var(--aivo-purple-50)]'
              }`}
            >
              <span
                className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0 ${
                  selectedAnswer === index
                    ? 'bg-[var(--aivo-brand-primary)] text-white'
                    : 'bg-[var(--aivo-purple-100)] text-[var(--aivo-brand-primary)]'
                }`}
              >
                {String.fromCharCode(65 + index)}
              </span>
              <span
                className={`font-medium ${
                  selectedAnswer === index
                    ? 'text-[var(--aivo-brand-primary)]'
                    : 'text-[var(--aivo-brand-navy)]'
                }`}
              >
                {option}
              </span>
            </motion.button>
          ))}
        </div>
      )}

      {/* Open-ended response */}
      {question.type === 'open-ended' && (
        <div className="space-y-4">
          <textarea
            className="w-full p-4 border-2 border-[var(--aivo-neutral-200)] rounded-xl
              focus:border-[var(--aivo-brand-primary)] focus:outline-none focus:ring-2
              focus:ring-[var(--aivo-purple-100)] min-h-[150px] resize-none"
            placeholder="Type your answer here..."
          />
          <button
            onClick={() => onSubmit(null)}
            className="px-8 py-3 bg-gradient-to-r from-[var(--aivo-brand-primary)] to-[var(--aivo-purple-500)]
              text-white font-bold rounded-xl hover:opacity-90 transition-all"
          >
            Submit Answer
          </button>
        </div>
      )}

      {/* Hint section */}
      {showHint && question.content.hint && (
        <div className="mt-6">
          {!showingHint ? (
            <button
              onClick={() => setShowingHint(true)}
              className="text-[var(--aivo-brand-primary)] hover:text-[var(--aivo-purple-700)] font-medium"
            >
              Need a hint?
            </button>
          ) : (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="p-4 bg-yellow-50 border-2 border-yellow-200 rounded-xl"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">💡</span>
                <p className="text-yellow-800">{question.content.hint}</p>
              </div>
            </motion.div>
          )}
        </div>
      )}
    </motion.div>
  );
}
