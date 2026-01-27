'use client';

import { useState, useEffect } from 'react';
import { usePWA } from '../lib/hooks/usePWA';

/**
 * PWA Install Banner
 *
 * Shows a prompt to install the app on supported devices.
 * Automatically hides after installation or dismissal.
 */
export function PWAInstallBanner() {
  const { isInstallable, isInstalled, install } = usePWA();
  const [isDismissed, setIsDismissed] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Check if banner was previously dismissed
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      if (dismissed) {
        const dismissedTime = parseInt(dismissed, 10);
        const oneWeek = 7 * 24 * 60 * 60 * 1000;
        // Show again after a week
        if (Date.now() - dismissedTime < oneWeek) {
          setIsDismissed(true);
        }
      }
    }
  }, []);

  // Show banner with delay after installable
  useEffect(() => {
    if (isInstallable && !isInstalled && !isDismissed) {
      const timer = setTimeout(() => setIsVisible(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [isInstallable, isInstalled, isDismissed]);

  const handleInstall = async () => {
    const success = await install();
    if (success) {
      setIsVisible(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-slide-up">
      <div className="max-w-lg mx-auto bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-xl p-4">
        <div className="flex items-center space-x-4">
          {/* App Icon */}
          <div className="flex-shrink-0 w-14 h-14 bg-white rounded-xl flex items-center justify-center">
            <span className="text-2xl">📚</span>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold text-lg">Install AIVO</h3>
            <p className="text-blue-100 text-sm">
              Install the app for faster access and offline learning
            </p>
          </div>

          {/* Actions */}
          <div className="flex-shrink-0 flex items-center space-x-2">
            <button
              onClick={handleDismiss}
              className="px-3 py-2 text-blue-100 hover:text-white text-sm font-medium"
            >
              Later
            </button>
            <button
              onClick={handleInstall}
              className="px-4 py-2 bg-white text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors"
            >
              Install
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

/**
 * Offline Status Indicator
 *
 * Shows a banner when the user is offline.
 * Indicates when syncing occurs after coming back online.
 */
export function OfflineStatusIndicator() {
  const { isOnline } = usePWA();
  const [wasOffline, setWasOffline] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
    } else if (wasOffline) {
      setShowReconnected(true);
      const timer = setTimeout(() => {
        setShowReconnected(false);
        setWasOffline(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  if (isOnline && !showReconnected) {
    return null;
  }

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 py-2 text-center text-sm font-medium transition-colors ${
        isOnline
          ? 'bg-green-500 text-white'
          : 'bg-yellow-500 text-yellow-900'
      }`}
    >
      {isOnline ? (
        <span className="flex items-center justify-center">
          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          Back online! Syncing your progress...
        </span>
      ) : (
        <span className="flex items-center justify-center">
          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          You're offline. Changes will sync when you reconnect.
        </span>
      )}
    </div>
  );
}

/**
 * Update Available Banner
 *
 * Shows when a new version of the app is available.
 */
export function UpdateAvailableBanner() {
  const { isUpdateAvailable, update } = usePWA();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isUpdateAvailable) {
      setIsVisible(true);
    }
  }, [isUpdateAvailable]);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-slate-900">Update Available</h3>
            <p className="text-sm text-slate-600 mt-1">
              A new version is ready. Refresh to get the latest features.
            </p>
            <div className="mt-3 flex space-x-2">
              <button
                onClick={() => setIsVisible(false)}
                className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900"
              >
                Later
              </button>
              <button
                onClick={update}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
              >
                Refresh Now
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

/**
 * Combined PWA Components
 *
 * Wraps all PWA-related UI components together.
 */
export function PWAComponents() {
  return (
    <>
      <OfflineStatusIndicator />
      <PWAInstallBanner />
      <UpdateAvailableBanner />
    </>
  );
}

export default PWAComponents;
