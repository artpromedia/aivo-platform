/**
 * PIN Setup Dialog Component
 *
 * Allows parents to set up a new PIN or change their existing PIN.
 * COPPA (Children's Online Privacy Protection Act) compliant - ensures only parents can modify parental controls.
 */

'use client';

import { Lock, X, Eye, EyeOff, Check, AlertCircle } from 'lucide-react';
import { useState, useCallback } from 'react';

import { useSetPin, usePinStatus, useRemovePin } from '@/hooks';

// ============================================================================
// Types
// ============================================================================

interface PinSetupDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  mode?: 'setup' | 'change' | 'remove';
}

// ============================================================================
// Component
// ============================================================================

export function PinSetupDialog({
  isOpen,
  onClose,
  onSuccess,
  mode = 'setup',
}: Readonly<PinSetupDialogProps>) {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showNewPin, setShowNewPin] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pinStatusQuery = usePinStatus();
  const pinStatus = pinStatusQuery.data as { enabled: boolean } | undefined;
  const setPinMutation = useSetPin();
  const removePinMutation = useRemovePin();

  const isChanging = mode === 'change' || (mode === 'setup' && pinStatus?.enabled);
  const isRemoving = mode === 'remove';

  // Helper function to get dialog title based on mode
  const getDialogTitle = () => {
    if (isRemoving) return 'Remove PIN';
    if (isChanging) return 'Change PIN';
    return 'Set Up PIN';
  };

  // Helper function to get button text based on mode
  const getButtonText = () => {
    if (isRemoving) return 'Remove PIN';
    if (isChanging) return 'Change PIN';
    return 'Set PIN';
  };

  const resetForm = useCallback(() => {
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
    setError(null);
    setShowNewPin(false);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  const validatePin = (pin: string): string | null => {
    if (pin.length !== 4) {
      return 'PIN must be exactly 4 digits';
    }
    if (!/^\d{4}$/.test(pin)) {
      return 'PIN must contain only numbers';
    }
    return null;
  };

  const handleSubmit = async () => {
    setError(null);

    if (isRemoving) {
      // Remove PIN
      const currentPinError = validatePin(currentPin);
      if (currentPinError) {
        setError(currentPinError);
        return;
      }

      try {
        await removePinMutation.mutateAsync(currentPin);
        onSuccess?.();
        handleClose();
      } catch {
        setError('Failed to remove PIN. Please check your current PIN.');
      }
      return;
    }

    // Validate new PIN
    const newPinError = validatePin(newPin);
    if (newPinError) {
      setError(newPinError);
      return;
    }

    if (newPin !== confirmPin) {
      setError('PINs do not match');
      return;
    }

    // If changing, validate current PIN
    if (isChanging) {
      const currentPinError = validatePin(currentPin);
      if (currentPinError) {
        setError('Please enter your current PIN');
        return;
      }
    }

    try {
      await setPinMutation.mutateAsync({
        newPin,
        currentPin: isChanging ? currentPin : undefined,
      });
      onSuccess?.();
      handleClose();
    } catch {
      setError('Failed to set PIN. Please try again.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <dialog
        open
        aria-labelledby="pin-setup-title"
        className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4 overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-purple-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Lock className="w-5 h-5 text-indigo-600" />
              </div>
              <h2 id="pin-setup-title" className="text-lg font-semibold text-gray-900">
                {getDialogTitle()}
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            {isRemoving
              ? 'Enter your current PIN to remove PIN protection'
              : 'Your PIN protects sensitive parental control settings'}
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Current PIN (for change/remove mode) */}
          {(isChanging || isRemoving) && (
            <div>
              <label
                htmlFor="current-pin"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Current PIN
              </label>
              <input
                id="current-pin"
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={currentPin}
                onChange={(e) => {
                  setCurrentPin(e.target.value.replaceAll(/\D/g, '').slice(0, 4));
                }}
                placeholder="••••"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-center text-2xl tracking-widest"
                autoComplete="current-password"
              />
            </div>
          )}

          {/* New PIN (for setup/change mode) */}
          {!isRemoving && (
            <>
              <div>
                <label
                  htmlFor="new-pin"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  {isChanging ? 'New PIN' : 'PIN'}
                </label>
                <div className="relative">
                  <input
                    id="new-pin"
                    type={showNewPin ? 'text' : 'password'}
                    inputMode="numeric"
                    maxLength={4}
                    value={newPin}
                    onChange={(e) => {
                      setNewPin(e.target.value.replaceAll(/\D/g, '').slice(0, 4));
                    }}
                    placeholder="••••"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-center text-2xl tracking-widest"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewPin(!showNewPin);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label={showNewPin ? 'Hide PIN' : 'Show PIN'}
                  >
                    {showNewPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">Enter a 4-digit PIN</p>
              </div>

              <div>
                <label
                  htmlFor="confirm-pin"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Confirm PIN
                </label>
                <input
                  id="confirm-pin"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={confirmPin}
                  onChange={(e) => {
                    setConfirmPin(e.target.value.replaceAll(/\D/g, '').slice(0, 4));
                  }}
                  placeholder="••••"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-center text-2xl tracking-widest"
                  autoComplete="new-password"
                />
                {newPin && confirmPin && newPin === confirmPin && (
                  <p className="mt-1 text-xs text-green-600 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    PINs match
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={setPinMutation.isPending || removePinMutation.isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {(setPinMutation.isPending || removePinMutation.isPending) && (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {getButtonText()}
          </button>
        </div>
      </dialog>
    </div>
  );
}

// ============================================================================
// Hook for managing PIN setup dialog state
// ============================================================================

export function usePinSetup() {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'setup' | 'change' | 'remove'>('setup');

  const openSetup = useCallback(() => {
    setMode('setup');
    setIsOpen(true);
  }, []);

  const openChange = useCallback(() => {
    setMode('change');
    setIsOpen(true);
  }, []);

  const openRemove = useCallback(() => {
    setMode('remove');
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  return {
    isOpen,
    mode,
    openSetup,
    openChange,
    openRemove,
    close,
  };
}

export default PinSetupDialog;
