'use client'

import { useState, useEffect, useCallback } from 'react'
import { useConnectivity } from '@/lib/hooks/use-connectivity'

interface ConnectivityBannerProps {
  onSyncRequest?: () => Promise<void>
  pendingSyncCount?: number
  showSyncStatus?: boolean
  position?: 'top' | 'bottom'
  autoDismissDelay?: number
}

export function ConnectivityBanner({
  onSyncRequest,
  pendingSyncCount = 0,
  showSyncStatus = true,
  position = 'top',
  autoDismissDelay = 5000,
}: Readonly<ConnectivityBannerProps>) {
  const {
    isOnline,
    isReconnecting,
    reconnectAttempts,
    connectionQuality,
    syncStatus,
    retryConnection,
  } = useConnectivity()

  const [isDismissed, setIsDismissed] = useState(false)
  const [showBanner, setShowBanner] = useState(false)

  // Auto-dismiss when stable connection is restored
  useEffect(() => {
    if (isOnline && connectionQuality === 'good' && syncStatus === 'synced') {
      const timer = setTimeout(() => {
        setIsDismissed(true)
      }, autoDismissDelay)
      return () => clearTimeout(timer)
    }
    // Reset dismissed state when going offline
    if (!isOnline) {
      setIsDismissed(false)
    }
  }, [isOnline, connectionQuality, syncStatus, autoDismissDelay])

  // Show banner when offline or reconnecting
  useEffect(() => {
    if (!isOnline || isReconnecting || connectionQuality === 'poor') {
      setShowBanner(true)
      setIsDismissed(false)
    } else if (syncStatus !== 'synced' && showSyncStatus) {
      setShowBanner(true)
    } else if (isDismissed) {
      setShowBanner(false)
    }
  }, [isOnline, isReconnecting, connectionQuality, syncStatus, showSyncStatus, isDismissed])

  const handleDismiss = useCallback(() => {
    setIsDismissed(true)
    setTimeout(() => setShowBanner(false), 300)
  }, [])

  const handleSync = useCallback(async () => {
    if (onSyncRequest) {
      await onSyncRequest()
    }
  }, [onSyncRequest])

  if (!showBanner) return null

  const positionClasses = position === 'top'
    ? 'top-0 rounded-b-lg'
    : 'bottom-0 rounded-t-lg'

  const getBannerContent = () => {
    if (!isOnline) {
      return {
        icon: '📡',
        bgColor: 'bg-amber-100 border-amber-300',
        textColor: 'text-amber-800',
        title: "You're offline",
        message: isReconnecting
          ? `Trying to reconnect... (attempt ${reconnectAttempts})`
          : "Don't worry! You can keep working. Your progress will sync when you're back online.",
        showRetry: !isReconnecting,
      }
    }

    if (connectionQuality === 'poor') {
      return {
        icon: '⚠️',
        bgColor: 'bg-yellow-100 border-yellow-300',
        textColor: 'text-yellow-800',
        title: 'Slow connection',
        message: 'Your internet connection is slow. Some features might take longer to load.',
        showRetry: false,
      }
    }

    if (syncStatus === 'pending') {
      return {
        icon: '💾',
        bgColor: 'bg-blue-100 border-blue-300',
        textColor: 'text-blue-800',
        title: 'Changes pending',
        message: `${pendingSyncCount || 'Some'} changes are waiting to be saved.`,
        showRetry: false,
        showSync: true,
      }
    }

    if (syncStatus === 'syncing') {
      return {
        icon: '🔄',
        bgColor: 'bg-blue-100 border-blue-300',
        textColor: 'text-blue-800',
        title: 'Syncing...',
        message: 'Saving your progress...',
        showRetry: false,
      }
    }

    if (syncStatus === 'error') {
      return {
        icon: '❌',
        bgColor: 'bg-red-100 border-red-300',
        textColor: 'text-red-800',
        title: 'Sync failed',
        message: 'We had trouble saving your progress. Please try again.',
        showRetry: true,
        showSync: true,
      }
    }

    // Back online!
    return {
      icon: '✅',
      bgColor: 'bg-green-100 border-green-300',
      textColor: 'text-green-800',
      title: "You're back online!",
      message: 'All your progress has been saved.',
      showRetry: false,
    }
  }

  const content = getBannerContent()

  return (
    <div
      className={`
        fixed left-0 right-0 z-50 mx-auto max-w-2xl px-4
        ${positionClasses}
        transition-all duration-300 ease-in-out
        ${isDismissed ? 'opacity-0 transform -translate-y-full' : 'opacity-100'}
      `}
      role="status"
      aria-live="polite"
    >
      <div
        className={`
          ${content.bgColor} ${content.textColor}
          border-2 shadow-lg
          p-4 rounded-lg
          flex items-center gap-3
        `}
      >
        <span className="text-2xl flex-shrink-0" role="img" aria-hidden="true">
          {content.icon}
        </span>

        <div className="flex-grow min-w-0">
          <h3 className="font-bold text-lg">{content.title}</h3>
          <p className="text-sm opacity-90">{content.message}</p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {content.showRetry && (
            <button
              onClick={retryConnection}
              className={`
                px-3 py-1.5 rounded-lg font-semibold text-sm
                bg-white/50 hover:bg-white/80
                transition-colors duration-200
                focus:outline-none focus:ring-2 focus:ring-offset-2
              `}
            >
              Retry
            </button>
          )}

          {content.showSync && onSyncRequest && (
            <button
              onClick={handleSync}
              className={`
                px-3 py-1.5 rounded-lg font-semibold text-sm
                bg-white/50 hover:bg-white/80
                transition-colors duration-200
                focus:outline-none focus:ring-2 focus:ring-offset-2
              `}
            >
              Sync Now
            </button>
          )}

          {isOnline && (
            <button
              onClick={handleDismiss}
              className={`
                p-1.5 rounded-full
                hover:bg-white/50
                transition-colors duration-200
                focus:outline-none focus:ring-2 focus:ring-offset-2
              `}
              aria-label="Dismiss"
            >
              <span className="text-xl">×</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default ConnectivityBanner
