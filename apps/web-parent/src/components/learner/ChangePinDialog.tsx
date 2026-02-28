/**
 * ChangePinDialog
 *
 * Modal dialog for parents to change their child's 6-digit login PIN.
 * Validates format, strength, and match before submitting.
 */

'use client';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
} from '@aivo/ui-web';
import { AlertCircle, CheckCircle2, KeyRound, Loader2 } from 'lucide-react';
import { useState, useCallback } from 'react';

import { changeLearnerPin } from '@/lib/api/learner-pin.api';

// ============================================================================
// Types
// ============================================================================

interface ChangePinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  learnerId: string;
  learnerName: string;
}

// ============================================================================
// Constants
// ============================================================================

const WEAK_PINS = [
  '000000',
  '111111',
  '222222',
  '333333',
  '444444',
  '555555',
  '666666',
  '777777',
  '888888',
  '999999',
  '123456',
  '654321',
  '012345',
  '123123',
  '112233',
];

// ============================================================================
// Component
// ============================================================================

export function ChangePinDialog({
  open,
  onOpenChange,
  learnerId,
  learnerName,
}: ChangePinDialogProps) {
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const resetForm = useCallback(() => {
    setNewPin('');
    setConfirmPin('');
    setStatus('idle');
    setErrorMessage('');
  }, []);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        resetForm();
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange, resetForm]
  );

  // ── Validation ─────────────────────────────────────────────────────────────

  const pinFormatValid = /^\d{6}$/.test(newPin);
  const pinIsWeak = WEAK_PINS.includes(newPin);
  const pinsMatch = newPin === confirmPin && confirmPin.length > 0;
  const canSubmit = pinFormatValid && !pinIsWeak && pinsMatch && status !== 'submitting';

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setStatus('submitting');
    setErrorMessage('');

    try {
      await changeLearnerPin(learnerId, { newPin, confirmPin });
      setStatus('success');
    } catch (err: unknown) {
      setStatus('error');
      const message =
        err instanceof Error ? err.message : 'Failed to change PIN. Please try again.';
      setErrorMessage(message);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-indigo-600" />
            Change Login PIN
          </DialogTitle>
          <DialogDescription>
            Set a new 6-digit login PIN for{' '}
            <span className="font-medium text-gray-900">{learnerName}</span>.
          </DialogDescription>
        </DialogHeader>

        {status === 'success' ? (
          /* ── Success state ────────────────────────────────────────────── */
          <div className="py-6 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">PIN Updated</p>
              <p className="text-sm text-gray-500 mt-1">
                {learnerName}&apos;s login PIN has been changed successfully.
              </p>
            </div>
            <Button
              className="w-full"
              onClick={() => {
                handleOpenChange(false);
              }}
            >
              Done
            </Button>
          </div>
        ) : (
          /* ── Form state ───────────────────────────────────────────────── */
          <div className="space-y-4 pt-2">
            {/* New PIN */}
            <div className="space-y-1.5">
              <label htmlFor="new-pin" className="block text-sm font-medium text-gray-700">
                New PIN
              </label>
              <Input
                id="new-pin"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="Enter 6 digits"
                value={newPin}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setNewPin(v);
                  if (status === 'error') setStatus('idle');
                }}
                autoComplete="off"
              />
              {newPin.length > 0 && !pinFormatValid && (
                <p className="text-xs text-amber-600">PIN must be exactly 6 digits</p>
              )}
              {pinIsWeak && (
                <p className="text-xs text-red-600">
                  This PIN is too easy to guess — please choose a stronger one
                </p>
              )}
            </div>

            {/* Confirm PIN */}
            <div className="space-y-1.5">
              <label htmlFor="confirm-pin" className="block text-sm font-medium text-gray-700">
                Confirm PIN
              </label>
              <Input
                id="confirm-pin"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="Re-enter 6 digits"
                value={confirmPin}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setConfirmPin(v);
                  if (status === 'error') setStatus('idle');
                }}
                autoComplete="off"
              />
              {confirmPin.length > 0 && !pinsMatch && (
                <p className="text-xs text-red-600">PINs do not match</p>
              )}
            </div>

            {/* Error banner */}
            {status === 'error' && errorMessage && (
              <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-3">
                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                <p className="text-sm text-red-700">{errorMessage}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  handleOpenChange(false);
                }}
                disabled={status === 'submitting'}
              >
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleSubmit} disabled={!canSubmit}>
                {status === 'submitting' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Updating…
                  </>
                ) : (
                  'Update PIN'
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
