'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  extractDisclaimer,
  FEATURE_DISPLAY,
  formatReviewDate,
  parseBestFor,
  parseNotAppropriateFor,
  PROVIDER_DISPLAY,
  type TenantModelCard,
} from '../../lib/model-cards-api';

interface ModelDetailModalProps {
  model: TenantModelCard;
}

export function ModelDetailModal({ model }: ModelDetailModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  const openModal = useCallback(() => setIsOpen(true), []);
  const closeModal = useCallback(() => setIsOpen(false), []);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeModal();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeModal]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const provider = PROVIDER_DISPLAY[model.provider];
  const feature = FEATURE_DISPLAY[model.featureKey] ?? { name: model.featureKey, icon: '🤖' };
  const bestFor = parseBestFor(model.intendedUseCases);
  const notFor = parseNotAppropriateFor(model.limitations);
  const disclaimer = extractDisclaimer(model.limitations) || extractDisclaimer(model.safetyConsiderations);

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
      >
        View full details →
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="model-detail-title"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeModal}
            aria-hidden="true"
          />

          {/* Modal */}
          <div className="relative w-full max-w-2xl max-h-[90vh] bg-surface rounded-xl shadow-xl overflow-hidden">
            {/* Header */}
            <div className="sticky top-0 bg-surface border-b border-border px-6 py-4 z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl" role="img" aria-label={feature.name}>
                    {feature.icon}
                  </span>
                  <div>
                    <h2 id="model-detail-title" className="text-lg font-semibold text-text">
                      {model.displayName}
                    </h2>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${provider.colorClass}`}>
                        {provider.name}
                      </span>
                      <span className="text-xs text-muted">•</span>
                      <span className="text-xs text-muted">{feature.name}</span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  className="p-2 rounded-lg hover:bg-surface-muted transition-colors"
                  aria-label="Close"
                >
                  <svg className="h-5 w-5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="overflow-y-auto max-h-[calc(90vh-140px)] px-6 py-5 space-y-6">
              {/* Review Date Banner */}
              <div className="bg-surface-muted rounded-lg px-4 py-2 flex items-center gap-2">
                <svg className="h-4 w-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span className="text-sm text-muted">
                  Last reviewed: <strong className="text-text">{formatReviewDate(model.lastReviewedAt)}</strong>
                </span>
              </div>

              {/* Description */}
              <section>
                <h3 className="text-sm font-semibold text-text mb-2">Overview</h3>
                <p className="text-sm text-muted leading-relaxed">{model.description}</p>
              </section>

              {/* Best For */}
              {bestFor.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-text mb-2 flex items-center gap-2">
                    <svg className="h-4 w-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Best for
                  </h3>
                  <ul className="space-y-1.5">
                    {bestFor.map((item, idx) => (
                      <li key={idx} className="text-sm text-text flex items-start gap-2">
                        <span className="text-emerald-500 font-bold">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Not Appropriate For */}
              {notFor.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-text mb-2 flex items-center gap-2">
                    <svg className="h-4 w-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Not appropriate for
                  </h3>
                  <ul className="space-y-1.5">
                    {notFor.map((item, idx) => (
                      <li key={idx} className="text-sm text-muted flex items-start gap-2">
                        <span className="text-amber-500 font-bold">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Input/Output */}
              <section className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-text mb-1">Input Types</h3>
                  <p className="text-sm text-muted">{model.inputTypes}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-text mb-1">Output Types</h3>
                  <p className="text-sm text-muted">{model.outputTypes}</p>
                </div>
              </section>

              {/* Data Sources */}
              <section>
                <h3 className="text-sm font-semibold text-text mb-1">Training Data Summary</h3>
                <p className="text-sm text-muted">{model.dataSourcesSummary}</p>
              </section>

              {/* Disclaimer */}
              {disclaimer && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <svg
                      className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <div>
                      <h4 className="text-sm font-medium text-amber-900 dark:text-amber-100">
                        Important Disclaimer
                      </h4>
                      <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">{disclaimer}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-surface-muted border-t border-border px-6 py-4">
              <p className="text-xs text-muted text-center">
                For questions about this AI model or to report concerns,{' '}
                <a href="mailto:support@aivolearning.com" className="text-primary hover:underline">
                  contact Aivo support
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
