'use client'

import { useState, useEffect, useCallback } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface PWAInstallPromptProps {
  onInstall?: () => void
  onDismiss?: () => void
  showAfterVisits?: number
  dismissDays?: number
  title?: string
  description?: string
  className?: string
}

export function PWAInstallPrompt({
  onInstall,
  onDismiss,
  showAfterVisits = 3,
  dismissDays = 7,
  title = "Install AIVO Learning",
  description = "Get the full learning experience! Install our app for offline access and faster loading.",
  className = '',
}: Readonly<PWAInstallPromptProps>) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [showIOSInstructions, setShowIOSInstructions] = useState(false)

  useEffect(() => {
    // Check if running on iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as { MSStream?: unknown }).MSStream
    setIsIOS(isIOSDevice)

    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as { standalone?: boolean }).standalone === true

    if (isStandalone) return

    // Check visit count
    const visitCount = parseInt(localStorage.getItem('pwa_visitCount') || '0', 10) + 1
    localStorage.setItem('pwa_visitCount', String(visitCount))

    // Check if dismissed recently
    const dismissedAt = localStorage.getItem('pwa_dismissedAt')
    if (dismissedAt) {
      const dismissedDate = new Date(dismissedAt)
      const daysSinceDismiss = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24)
      if (daysSinceDismiss < dismissDays) return
    }

    // Show prompt after enough visits
    if (visitCount >= showAfterVisits) {
      if (isIOSDevice) {
        setIsVisible(true)
      }
    }

    // Listen for beforeinstallprompt event (Chrome, Edge, etc.)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      if (visitCount >= showAfterVisits) {
        setIsVisible(true)
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Listen for successful installation
    const handleAppInstalled = () => {
      setIsVisible(false)
      setDeferredPrompt(null)
      localStorage.setItem('pwa_installed', 'true')
      onInstall?.()
    }

    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [showAfterVisits, dismissDays, onInstall])

  const handleInstall = useCallback(async () => {
    if (isIOS) {
      setShowIOSInstructions(true)
      return
    }

    if (!deferredPrompt) return

    setIsInstalling(true)
    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice

      if (outcome === 'accepted') {
        onInstall?.()
      }

      setDeferredPrompt(null)
      setIsVisible(false)
    } catch (error) {
      console.error('Install prompt error:', error)
    } finally {
      setIsInstalling(false)
    }
  }, [deferredPrompt, isIOS, onInstall])

  const handleDismiss = useCallback(() => {
    localStorage.setItem('pwa_dismissedAt', new Date().toISOString())
    setIsVisible(false)
    setShowIOSInstructions(false)
    onDismiss?.()
  }, [onDismiss])

  const handleNeverShow = useCallback(() => {
    localStorage.setItem('pwa_neverShow', 'true')
    setIsVisible(false)
    setShowIOSInstructions(false)
    onDismiss?.()
  }, [onDismiss])

  if (!isVisible) return null

  // iOS-specific installation instructions
  if (showIOSInstructions) {
    return (
      <div className={`fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4 ${className}`}>
        <div className="bg-white rounded-t-3xl w-full max-w-lg p-6 animate-in slide-in-from-bottom duration-300">
          <h3 className="text-xl font-bold text-center mb-4">
            Install on iPhone/iPad
          </h3>

          <div className="space-y-4 mb-6">
            <div className="flex items-start gap-3">
              <span className="bg-blue-100 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold text-blue-600">1</span>
              <div>
                <p className="font-medium">Tap the Share button</p>
                <p className="text-sm text-gray-600">It looks like a box with an arrow pointing up ⬆️</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="bg-blue-100 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold text-blue-600">2</span>
              <div>
                <p className="font-medium">Scroll down and tap &quot;Add to Home Screen&quot;</p>
                <p className="text-sm text-gray-600">It has a ➕ icon next to it</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="bg-blue-100 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold text-blue-600">3</span>
              <div>
                <p className="font-medium">Tap &quot;Add&quot; in the top right</p>
                <p className="text-sm text-gray-600">The app will appear on your home screen!</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowIOSInstructions(false)}
            className="w-full py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-colors"
          >
            Got it!
          </button>

          <button
            onClick={handleDismiss}
            className="w-full mt-2 py-2 text-gray-500 text-sm"
          >
            Maybe later
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-50 p-4 ${className}`}>
      <div className="bg-white rounded-2xl shadow-xl max-w-lg mx-auto p-5 border border-gray-200 animate-in slide-in-from-bottom duration-300">
        <div className="flex items-start gap-4">
          {/* App icon */}
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl">📚</span>
          </div>

          <div className="flex-grow min-w-0">
            <h3 className="font-bold text-lg text-gray-900">{title}</h3>
            <p className="text-sm text-gray-600 mt-1">{description}</p>

            {/* Features list */}
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                <span>📶</span> Works offline
              </span>
              <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                <span>⚡</span> Faster loading
              </span>
              <span className="inline-flex items-center gap-1 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                <span>🔔</span> Notifications
              </span>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="p-1 rounded-full hover:bg-gray-100 transition-colors flex-shrink-0"
            aria-label="Dismiss"
          >
            <span className="text-xl text-gray-400">×</span>
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 mt-4">
          <button
            onClick={handleInstall}
            disabled={isInstalling}
            className="
              flex-1 py-3 rounded-xl
              bg-blue-500 hover:bg-blue-600
              text-white font-semibold
              transition-colors duration-200
              disabled:opacity-50
              flex items-center justify-center gap-2
            "
          >
            {isInstalling ? (
              <>
                <span className="animate-spin">⏳</span>
                Installing...
              </>
            ) : (
              <>
                <span>📥</span>
                Install Now
              </>
            )}
          </button>
        </div>

        {/* Don't show again */}
        <button
          onClick={handleNeverShow}
          className="w-full mt-2 py-2 text-gray-400 text-xs hover:text-gray-600 transition-colors"
        >
          Don&apos;t show this again
        </button>
      </div>
    </div>
  )
}

// Hook to check PWA installation status
export function usePWAStatus() {
  const [isInstalled, setIsInstalled] = useState(false)
  const [isInstallable, setIsInstallable] = useState(false)

  useEffect(() => {
    // Check if running as installed PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as { standalone?: boolean }).standalone === true

    setIsInstalled(isStandalone || localStorage.getItem('pwa_installed') === 'true')

    // Check installability
    const handleBeforeInstallPrompt = () => {
      setIsInstallable(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  return { isInstalled, isInstallable }
}

export default PWAInstallPrompt
