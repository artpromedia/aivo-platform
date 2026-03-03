'use client';

import { Button } from '@aivo/ui-web';
import { useCallback, useState } from 'react';

import type { SeatUsage } from '../../../lib/billing-api';

interface SeatRequestModalProps {
  seatUsage: SeatUsage;
  open: boolean;
  onClose: () => void;
}

type Urgency = 'NORMAL' | 'URGENT';

export function SeatRequestModal({ seatUsage, open, onClose }: SeatRequestModalProps) {
  const [additionalSeats, setAdditionalSeats] = useState(10);
  const [urgency, setUrgency] = useState<Urgency>('NORMAL');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: React.SyntheticEvent) => {
      e.preventDefault();
      setSubmitting(true);
      setError(null);

      try {
        const res = await fetch('/api/billing/seat-request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ additionalSeats, urgency, notes: notes || undefined }),
        });

        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error || 'Failed to submit request');
        }

        setSubmitted(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setSubmitting(false);
      }
    },
    [additionalSeats, urgency, notes],
  );

  const handleClose = useCallback(() => {
    setSubmitted(false);
    setError(null);
    setAdditionalSeats(10);
    setUrgency('NORMAL');
    setNotes('');
    onClose();
  }, [onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="seat-request-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-lg">
        {submitted ? (
          <SuccessView onClose={handleClose} />
        ) : (
          <RequestForm
            seatUsage={seatUsage}
            additionalSeats={additionalSeats}
            urgency={urgency}
            notes={notes}
            submitting={submitting}
            error={error}
            onAdditionalSeatsChange={setAdditionalSeats}
            onUrgencyChange={setUrgency}
            onNotesChange={setNotes}
            onSubmit={handleSubmit}
            onClose={handleClose}
          />
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Success View                                                       */
/* ------------------------------------------------------------------ */

function SuccessView({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col items-center py-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/20">
        <svg
          className="h-6 w-6 text-success"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h3 className="mt-4 text-lg font-semibold text-text">Request Submitted</h3>
      <p className="mt-2 text-sm text-muted">
        Your seat request has been submitted. Our team will reach out within 1 business day.
      </p>
      <div className="mt-6">
        <Button variant="primary" onClick={onClose}>
          Done
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Request Form                                                       */
/* ------------------------------------------------------------------ */

interface RequestFormProps {
  seatUsage: SeatUsage;
  additionalSeats: number;
  urgency: Urgency;
  notes: string;
  submitting: boolean;
  error: string | null;
  onAdditionalSeatsChange: (v: number) => void;
  onUrgencyChange: (v: Urgency) => void;
  onNotesChange: (v: string) => void;
  onSubmit: (e: React.SyntheticEvent) => void;
  onClose: () => void;
}

function RequestForm({
  seatUsage,
  additionalSeats,
  urgency,
  notes,
  submitting,
  error,
  onAdditionalSeatsChange,
  onUrgencyChange,
  onNotesChange,
  onSubmit,
  onClose,
}: RequestFormProps) {
  return (
    <form onSubmit={onSubmit}>
      <div className="flex items-start justify-between">
        <h3 id="seat-request-title" className="text-lg font-semibold text-text">
          Request More Seats
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-muted transition-colors hover:bg-surface-muted hover:text-text"
          aria-label="Close"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <p className="mt-2 text-sm text-muted">
        Currently using <strong>{seatUsage.usedSeats}</strong> of{' '}
        <strong>{seatUsage.totalSeats}</strong> seats ({seatUsage.availableSeats} available).
      </p>

      {error && (
        <div className="mt-3 rounded-lg border border-error/40 bg-error/10 px-3 py-2 text-sm text-error">
          {error}
        </div>
      )}

      {/* Additional Seats */}
      <div className="mt-4">
        <label htmlFor="additional-seats" className="block text-sm font-medium text-text">
          Additional Seats Needed
        </label>
        <input
          id="additional-seats"
          type="number"
          min={1}
          max={10000}
          value={additionalSeats}
          onChange={(e) => { onAdditionalSeatsChange(Math.max(1, Number((e.target as HTMLInputElement).value))); }}
          className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          required
        />
        <p className="mt-1 text-xs text-muted">
          New total would be {seatUsage.totalSeats + additionalSeats} seats
        </p>
      </div>

      {/* Urgency */}
      <div className="mt-4">
        <label className="block text-sm font-medium text-text">Urgency</label>
        <div className="mt-2 flex gap-3">
          <label
            className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
              urgency === 'NORMAL'
                ? 'border-primary bg-primary/10 font-medium text-primary'
                : 'border-border text-muted hover:bg-surface-muted'
            }`}
          >
            <input
              type="radio"
              name="urgency"
              value="NORMAL"
              checked={urgency === 'NORMAL'}
              onChange={() => { onUrgencyChange('NORMAL'); }}
              className="sr-only"
            />
            Normal
          </label>
          <label
            className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
              urgency === 'URGENT'
                ? 'border-error bg-error/10 font-medium text-error'
                : 'border-border text-muted hover:bg-surface-muted'
            }`}
          >
            <input
              type="radio"
              name="urgency"
              value="URGENT"
              checked={urgency === 'URGENT'}
              onChange={() => { onUrgencyChange('URGENT'); }}
              className="sr-only"
            />
            Urgent
          </label>
        </div>
      </div>

      {/* Notes */}
      <div className="mt-4">
        <label htmlFor="seat-notes" className="block text-sm font-medium text-text">
          Notes <span className="font-normal text-muted">(optional)</span>
        </label>
        <textarea
          id="seat-notes"
          rows={3}
          value={notes}
          onChange={(e) => { onNotesChange((e.target as HTMLTextAreaElement).value); }}
          placeholder="Any additional context for your request..."
          className="mt-1 w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Actions */}
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose} type="button" disabled={submitting}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit Request'}
        </Button>
      </div>
    </form>
  );
}
