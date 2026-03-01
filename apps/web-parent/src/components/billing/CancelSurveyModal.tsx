'use client';

import { X, AlertTriangle, Gift, Clock, ArrowRight, Loader2 } from 'lucide-react';
import { useState, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RetentionOffer {
  id: string;
  type: 'discount' | 'pause' | 'downgrade' | 'extend_trial';
  title: string;
  description: string;
  discountPercent?: number;
  durationMonths?: number;
  pauseWeeks?: number;
}

export interface CancelPreview {
  accessEndDate: string;
  refundAmount: number;
  currency: string;
  prorated: boolean;
}

export interface CancelSurveyModalProps {
  isOpen: boolean;
  planName: string;
  onClose: () => void;
  onCancel: (reason: string, feedback: string) => Promise<void>;
  onAcceptOffer: (offerId: string) => Promise<void>;
  retentionOffers: RetentionOffer[];
  cancelPreview: CancelPreview | null;
  isLoading: boolean;
}

// ---------------------------------------------------------------------------
// Cancellation Reasons (matches Stripe cancellation_details.feedback enum)
// ---------------------------------------------------------------------------

const CANCELLATION_REASONS = [
  { value: 'too_expensive', label: 'Too expensive', icon: '💰' },
  { value: 'missing_features', label: 'Missing features', icon: '🔧' },
  { value: 'switched_service', label: 'Switched to another service', icon: '🔄' },
  { value: 'unused', label: 'Not using it enough', icon: '📉' },
  { value: 'customer_service', label: 'Customer service issues', icon: '📞' },
  { value: 'too_complex', label: 'Too complex / hard to use', icon: '🤔' },
  { value: 'low_quality', label: 'Quality didn\'t meet expectations', icon: '⭐' },
  { value: 'other', label: 'Other reason', icon: '💬' },
] as const;

type Step = 'reason' | 'offers' | 'confirm';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CancelSurveyModal({
  isOpen,
  planName,
  onClose,
  onCancel,
  onAcceptOffer,
  retentionOffers,
  cancelPreview,
  isLoading,
}: CancelSurveyModalProps) {
  const [step, setStep] = useState<Step>('reason');
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetState = useCallback(() => {
    setStep('reason');
    setSelectedReason('');
    setFeedback('');
    setIsSubmitting(false);
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [resetState, onClose]);

  const handleNextFromReason = useCallback(() => {
    if (!selectedReason) return;
    if (retentionOffers.length > 0) {
      setStep('offers');
    } else {
      setStep('confirm');
    }
  }, [selectedReason, retentionOffers.length]);

  const handleSkipOffers = useCallback(() => {
    setStep('confirm');
  }, []);

  const handleAcceptOffer = useCallback(
    async (offerId: string) => {
      setIsSubmitting(true);
      try {
        await onAcceptOffer(offerId);
        handleClose();
      } finally {
        setIsSubmitting(false);
      }
    },
    [onAcceptOffer, handleClose],
  );

  const handleConfirmCancel = useCallback(async () => {
    setIsSubmitting(true);
    try {
      await onCancel(selectedReason, feedback);
      handleClose();
    } finally {
      setIsSubmitting(false);
    }
  }, [onCancel, selectedReason, feedback, handleClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-survey-title"
        className="relative w-full max-w-lg mx-4 bg-white rounded-xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 id="cancel-survey-title" className="text-lg font-semibold text-gray-900">
            {step === 'reason' && 'Why are you canceling?'}
            {step === 'offers' && 'Before you go…'}
            {step === 'confirm' && 'Confirm cancellation'}
          </h2>
          <button
            onClick={handleClose}
            className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 px-6 pt-4">
          {(['reason', 'offers', 'confirm'] as const).map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i <= ['reason', 'offers', 'confirm'].indexOf(step)
                    ? 'bg-indigo-600'
                    : 'bg-gray-200'
                }`}
              />
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {/* Loading overlay */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
            </div>
          )}

          {/* Step 1: Reason */}
          {step === 'reason' && !isLoading && (
            <div className="space-y-3" data-testid="cancel-step-reason">
              <p className="text-sm text-gray-600 mb-4">
                We&apos;d love to know why you&apos;re leaving so we can improve.
              </p>
              <div className="grid grid-cols-1 gap-2">
                {CANCELLATION_REASONS.map(({ value, label, icon }) => (
                  <button
                    key={value}
                    onClick={() => { setSelectedReason(value); }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-all ${
                      selectedReason === value
                        ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    data-testid={`cancel-reason-${value}`}
                  >
                    <span className="text-xl" aria-hidden="true">{icon}</span>
                    <span className="text-sm font-medium text-gray-900">{label}</span>
                  </button>
                ))}
              </div>

              {selectedReason && (
                <div className="mt-4">
                  <label htmlFor="cancel-feedback" className="block text-sm font-medium text-gray-700 mb-1">
                    Anything else you&apos;d like to share? (optional)
                  </label>
                  <textarea
                    id="cancel-feedback"
                    value={feedback}
                    onChange={(e) => { setFeedback(e.target.value); }}
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                    placeholder="Tell us more…"
                    data-testid="cancel-feedback"
                  />
                </div>
              )}
            </div>
          )}

          {/* Step 2: Retention Offers */}
          {step === 'offers' && !isLoading && (
            <div className="space-y-4" data-testid="cancel-step-offers">
              <div className="flex items-center gap-2 text-amber-600 mb-2">
                <Gift className="w-5 h-5" />
                <p className="text-sm font-medium">We have some offers for you!</p>
              </div>

              {retentionOffers.map((offer) => (
                <div
                  key={offer.id}
                  className="rounded-lg border border-gray-200 p-4 hover:border-indigo-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-gray-900">{offer.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{offer.description}</p>
                      {offer.discountPercent && (
                        <span className="inline-block mt-2 px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                          {offer.discountPercent}% off
                        </span>
                      )}
                      {offer.pauseWeeks && (
                        <span className="inline-block mt-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                          Pause for {offer.pauseWeeks} weeks
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleAcceptOffer(offer.id)}
                      disabled={isSubmitting}
                      className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors whitespace-nowrap"
                      data-testid={`accept-offer-${offer.id}`}
                    >
                      Accept
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Step 3: Confirm */}
          {step === 'confirm' && !isLoading && (
            <div className="space-y-4" data-testid="cancel-step-confirm">
              <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800">
                    You&apos;re about to cancel {planName}
                  </p>
                  {cancelPreview && (
                    <div className="text-amber-700 mt-1 space-y-1">
                      <p className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Access until{' '}
                        {new Date(cancelPreview.accessEndDate).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                      {cancelPreview.refundAmount > 0 && (
                        <p>
                          Refund: {cancelPreview.currency === 'usd' ? '$' : cancelPreview.currency}
                          {(cancelPreview.refundAmount / 100).toFixed(2)}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <p className="text-sm text-gray-600">
                Your children will still have access to the free Basic tier (ELA &amp; Math) after
                your subscription ends.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          {step === 'reason' && (
            <>
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                Never mind
              </button>
              <button
                onClick={handleNextFromReason}
                disabled={!selectedReason}
                className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                data-testid="cancel-next"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}

          {step === 'offers' && (
            <>
              <button
                onClick={handleSkipOffers}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                data-testid="cancel-skip-offers"
              >
                No thanks, continue canceling
              </button>
              <button
                onClick={() => { setStep('reason'); }}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Back
              </button>
            </>
          )}

          {step === 'confirm' && (
            <>
              <button
                onClick={() => {
                  if (retentionOffers.length > 0) { setStep('offers'); } else { setStep('reason'); }
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-5 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                data-testid="cancel-confirm-btn"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : null}
                Cancel subscription
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
