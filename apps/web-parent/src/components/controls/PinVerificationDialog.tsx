/**
 * PIN Verification Dialog
 *
 * Modal dialog for PIN verification before sensitive parental control operations.
 * COPPA compliant - ensures parents authorize changes to child settings.
 */

'use client';

import { X, Lock, AlertCircle, Loader2 } from 'lucide-react';
import React, { useState, useRef, useEffect } from 'react';

import { useVerifyPin } from '@/hooks';

interface PinVerificationDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Action being verified (for audit) */
  action: string;
  /** Human-readable description of the action */
  actionDescription: string;
  /** Called when PIN is verified successfully */
  onVerified: (pinToken: string) => void;
  /** Called when dialog is closed/cancelled */
  onClose: () => void;
}

/**
 * PIN Verification Dialog Component
 *
 * Displays a modal for entering and verifying the parental control PIN.
 * Returns a temporary token that can be used for subsequent protected operations.
 */
export function PinVerificationDialog({
  isOpen,
  action,
  actionDescription,
  onVerified,
  onClose,
}: PinVerificationDialogProps) {
  const [pin, setPin] = useState(['', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const verifyPin = useVerifyPin();

  // Focus first input when dialog opens
  useEffect(() => {
    if (isOpen) {
      setPin(['', '', '', '']);
      setError(null);
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleInputChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);
    setError(null);

    // Auto-advance to next input
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits entered
    if (value && index === 3) {
      const fullPin = [...newPin.slice(0, 3), value].join('');
      handleVerify(fullPin);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (fullPin: string) => {
    try {
      const result = await verifyPin.mutateAsync({ pin: fullPin, action });
      if (result.valid && result.token) {
        onVerified(result.token);
      } else {
        setError(
          result.remainingAttempts
            ? `Incorrect PIN. ${result.remainingAttempts} attempts remaining.`
            : 'Incorrect PIN. Please try again.'
        );
        setPin(['', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (err) {
      setError('Failed to verify PIN. Please try again.');
      setPin(['', '', '', '']);
      inputRefs.current[0]?.focus();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        className="bg-white rounded-2xl shadow-xl max-w-sm w-full mx-4 p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pin-dialog-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center">
              <Lock className="w-5 h-5 text-violet-600" />
            </div>
            <h2 id="pin-dialog-title" className="text-lg font-semibold text-gray-900">
              Enter PIN
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Description */}
        <p className="text-gray-600 text-center mb-6">{actionDescription}</p>

        {/* PIN Input */}
        <div className="flex justify-center gap-3 mb-6">
          {pin.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleInputChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className="w-14 h-14 text-center text-2xl font-bold border-2 border-gray-200 rounded-xl focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none transition-all"
              aria-label={`PIN digit ${index + 1}`}
            />
          ))}
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg mb-4">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {verifyPin.isPending && (
          <div className="flex items-center justify-center gap-2 text-gray-600">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Verifying...</span>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500 text-center">
            This PIN protects your parental control settings.
            <br />
            Forgot your PIN?{' '}
            <a href="/settings/caregivers" className="text-violet-600 hover:underline">
              Reset via email
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook for managing PIN verification state
 */
export function usePinVerification() {
  const [isOpen, setIsOpen] = useState(false);
  const [action, setAction] = useState('');
  const [actionDescription, setActionDescription] = useState('');
  const [pendingCallback, setPendingCallback] = useState<((token: string) => void) | null>(null);

  const requestVerification = (
    actionName: string,
    description: string,
    onSuccess: (token: string) => void
  ) => {
    setAction(actionName);
    setActionDescription(description);
    setPendingCallback(() => onSuccess);
    setIsOpen(true);
  };

  const handleVerified = (token: string) => {
    setIsOpen(false);
    pendingCallback?.(token);
    setPendingCallback(null);
  };

  const handleClose = () => {
    setIsOpen(false);
    setPendingCallback(null);
  };

  return {
    isOpen,
    action,
    actionDescription,
    requestVerification,
    onVerified: handleVerified,
    onClose: handleClose,
  };
}

export default PinVerificationDialog;
