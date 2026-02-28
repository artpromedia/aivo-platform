'use client';

import { useState, useEffect, useCallback } from 'react';
import { Wifi, WifiOff, X } from 'lucide-react';

/**
 * Connectivity Banner
 *
 * Shows a warning when the browser goes offline and a brief
 * "Back online!" toast when connectivity is restored.
 */
export function ConnectivityBanner() {
  const [isOnline, setIsOnline] = useState(true);
  const [showReconnected, setShowReconnected] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Initialise from navigator
    setIsOnline(navigator.onLine);

    const goOffline = () => {
      setIsOnline(false);
      setDismissed(false);
    };

    const goOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
    };

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // Auto-dismiss "Back online!" after 3 seconds
  useEffect(() => {
    if (!showReconnected) return;
    const t = setTimeout(() => setShowReconnected(false), 3000);
    return () => clearTimeout(t);
  }, [showReconnected]);

  const handleDismiss = useCallback(() => setDismissed(true), []);

  // ── Nothing to show ────────────────────────────────
  if (isOnline && !showReconnected) return null;

  // ── "Back online!" toast ───────────────────────────
  if (isOnline && showReconnected) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex items-center gap-2 bg-green-50 border-b border-green-200 px-4 py-2 text-sm text-green-700 animate-in slide-in-from-top"
      >
        <Wifi className="w-4 h-4 shrink-0" />
        <span className="font-medium">Back online!</span>
      </div>
    );
  }

  // ── Offline warning ────────────────────────────────
  if (!isOnline && !dismissed) {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className="flex items-center gap-2 bg-amber-50 border-b border-amber-200 px-4 py-2 text-sm text-amber-800"
      >
        <WifiOff className="w-4 h-4 shrink-0" />
        <span className="flex-1 font-medium">
          You&apos;re offline. Some features may be unavailable.
        </span>
        <button
          onClick={handleDismiss}
          className="shrink-0 p-0.5 rounded hover:bg-amber-100 transition-colors"
          aria-label="Dismiss offline warning"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return null;
}
