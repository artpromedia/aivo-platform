'use client'

import { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react'

interface ExitConfirmationProps {
  hasUnsavedChanges: boolean
  onSave?: () => Promise<void>
  onExit?: () => void
  title?: string
  message?: string
  saveButtonText?: string
  exitButtonText?: string
  cancelButtonText?: string
  children?: React.ReactNode
}

interface UnsavedChangesContextValue {
  setHasUnsavedChanges: (value: boolean) => void
  hasUnsavedChanges: boolean
}

const UnsavedChangesContext = createContext<UnsavedChangesContextValue | null>(null)

export function useUnsavedChanges() {
  const context = useContext(UnsavedChangesContext)
  if (!context) {
    throw new Error('useUnsavedChanges must be used within UnsavedChangesProvider')
  }
  return context
}

export function UnsavedChangesProvider({ children }: { children: React.ReactNode }) {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  return (
    <UnsavedChangesContext.Provider value={{ hasUnsavedChanges, setHasUnsavedChanges }}>
      {children}
    </UnsavedChangesContext.Provider>
  )
}

export function ExitConfirmation({
  hasUnsavedChanges,
  onSave,
  onExit,
  title = "Wait! You have unsaved work",
  message = "Would you like to save your progress before leaving?",
  saveButtonText = "Save & Exit",
  exitButtonText = "Exit Without Saving",
  cancelButtonText = "Keep Working",
  children,
}: Readonly<ExitConfirmationProps>) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [dontShowAgain, setDontShowAgain] = useState(false)
  const pendingNavigationRef = useRef<(() => void) | null>(null)

  // Check localStorage preference
  useEffect(() => {
    const preference = localStorage.getItem('exitConfirmation_dontShow')
    if (preference === 'true') {
      setDontShowAgain(true)
    }
  }, [])

  // Handle browser back button and beforeunload
  useEffect(() => {
    if (!hasUnsavedChanges) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dontShowAgain) return
      e.preventDefault()
      e.returnValue = message
      return message
    }

    const handlePopState = () => {
      if (hasUnsavedChanges && !dontShowAgain) {
        // Push current state back to prevent navigation
        window.history.pushState(null, '', window.location.href)
        setIsOpen(true)
        pendingNavigationRef.current = () => window.history.back()
      }
    }

    // Push initial state for history management
    window.history.pushState(null, '', window.location.href)

    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('popstate', handlePopState)
    }
  }, [hasUnsavedChanges, dontShowAgain, message])

  const handleSaveAndExit = useCallback(async () => {
    if (!onSave) {
      setIsOpen(false)
      onExit?.()
      return
    }

    setIsSaving(true)
    try {
      await onSave()
      setIsOpen(false)
      if (pendingNavigationRef.current) {
        pendingNavigationRef.current()
        pendingNavigationRef.current = null
      } else {
        onExit?.()
      }
    } catch (error) {
      console.error('Failed to save:', error)
    } finally {
      setIsSaving(false)
    }
  }, [onSave, onExit])

  const handleExitWithoutSaving = useCallback(() => {
    setIsOpen(false)
    if (pendingNavigationRef.current) {
      pendingNavigationRef.current()
      pendingNavigationRef.current = null
    } else {
      onExit?.()
    }
  }, [onExit])

  const handleCancel = useCallback(() => {
    setIsOpen(false)
    pendingNavigationRef.current = null
  }, [])

  const handleDontShowAgainChange = useCallback((checked: boolean) => {
    setDontShowAgain(checked)
    localStorage.setItem('exitConfirmation_dontShow', String(checked))
  }, [])

  // Expose method to trigger dialog programmatically
  const triggerConfirmation = useCallback((onConfirm?: () => void) => {
    if (!hasUnsavedChanges || dontShowAgain) {
      onConfirm?.()
      return
    }
    pendingNavigationRef.current = onConfirm || null
    setIsOpen(true)
  }, [hasUnsavedChanges, dontShowAgain])

  if (!isOpen) {
    return (
      <>
        {children}
        {/* Provide trigger function through context or callback */}
      </>
    )
  }

  return (
    <>
      {children}

      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="exit-confirmation-title"
      >
        {/* Dialog */}
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 transform transition-all animate-in fade-in zoom-in-95 duration-200">
          {/* Icon */}
          <div className="text-center mb-4">
            <span className="text-5xl" role="img" aria-hidden="true">
              ⚠️
            </span>
          </div>

          {/* Title */}
          <h2
            id="exit-confirmation-title"
            className="text-xl font-bold text-center text-gray-900 mb-2"
          >
            {title}
          </h2>

          {/* Message */}
          <p className="text-center text-gray-600 mb-6">
            {message}
          </p>

          {/* Buttons */}
          <div className="flex flex-col gap-3">
            {onSave && (
              <button
                onClick={handleSaveAndExit}
                disabled={isSaving}
                className="
                  w-full py-3 px-4 rounded-xl
                  bg-green-500 hover:bg-green-600
                  text-white font-semibold
                  transition-colors duration-200
                  disabled:opacity-50 disabled:cursor-not-allowed
                  flex items-center justify-center gap-2
                "
              >
                {isSaving ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Saving...
                  </>
                ) : (
                  <>
                    <span>💾</span>
                    {saveButtonText}
                  </>
                )}
              </button>
            )}

            <button
              onClick={handleExitWithoutSaving}
              disabled={isSaving}
              className="
                w-full py-3 px-4 rounded-xl
                bg-red-100 hover:bg-red-200
                text-red-700 font-semibold
                transition-colors duration-200
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            >
              {exitButtonText}
            </button>

            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="
                w-full py-3 px-4 rounded-xl
                bg-gray-100 hover:bg-gray-200
                text-gray-700 font-semibold
                transition-colors duration-200
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            >
              {cancelButtonText}
            </button>
          </div>

          {/* Don't show again checkbox */}
          <div className="mt-4 flex items-center justify-center">
            <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => handleDontShowAgainChange(e.target.checked)}
                className="rounded border-gray-300 text-blue-500 focus:ring-blue-500"
              />
              Don&apos;t ask me again
            </label>
          </div>
        </div>
      </div>
    </>
  )
}

// Hook for programmatic usage
export function useExitConfirmation(hasUnsavedChanges: boolean) {
  const [isOpen, setIsOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null)

  const confirmExit = useCallback((onConfirm: () => void) => {
    if (!hasUnsavedChanges) {
      onConfirm()
      return
    }
    setPendingAction(() => onConfirm)
    setIsOpen(true)
  }, [hasUnsavedChanges])

  const handleConfirm = useCallback(() => {
    setIsOpen(false)
    pendingAction?.()
    setPendingAction(null)
  }, [pendingAction])

  const handleCancel = useCallback(() => {
    setIsOpen(false)
    setPendingAction(null)
  }, [])

  return {
    isOpen,
    confirmExit,
    handleConfirm,
    handleCancel,
  }
}

export default ExitConfirmation
