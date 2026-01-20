'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'

interface OnboardingStatus {
  completed: boolean
  currentStep: number
  totalSteps: number
  completedSteps: string[]
}

interface OnboardingGuardProps {
  learnerId: string
  onboardingPath?: string
  allowedPaths?: string[]
  children: React.ReactNode
  onStatusChange?: (status: OnboardingStatus) => void
}

const API_BASE = process.env.NEXT_PUBLIC_LEARNER_API_URL || 'http://localhost:3005/api/learners'

async function getOnboardingStatus(learnerId: string): Promise<OnboardingStatus> {
  try {
    const response = await fetch(`${API_BASE}/${learnerId}/onboarding`)
    if (!response.ok) {
      // If endpoint doesn't exist yet, check localStorage
      const stored = localStorage.getItem(`onboarding_status_${learnerId}`)
      if (stored) {
        return JSON.parse(stored)
      }
      return {
        completed: false,
        currentStep: 0,
        totalSteps: 5,
        completedSteps: [],
      }
    }
    return response.json()
  } catch {
    // Fallback to localStorage
    const stored = localStorage.getItem(`onboarding_status_${learnerId}`)
    if (stored) {
      return JSON.parse(stored)
    }
    return {
      completed: false,
      currentStep: 0,
      totalSteps: 5,
      completedSteps: [],
    }
  }
}

export function OnboardingGuard({
  learnerId,
  onboardingPath = '/onboarding',
  allowedPaths = ['/onboarding', '/logout', '/help'],
  children,
  onStatusChange,
}: Readonly<OnboardingGuardProps>) {
  const router = useRouter()
  const pathname = usePathname()
  const [status, setStatus] = useState<OnboardingStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isReturningUser, setIsReturningUser] = useState(false)

  const checkOnboardingStatus = useCallback(async () => {
    setIsLoading(true)
    try {
      const onboardingStatus = await getOnboardingStatus(learnerId)
      setStatus(onboardingStatus)
      onStatusChange?.(onboardingStatus)

      // Check if this is a returning user who completed onboarding before
      const previouslyCompleted = localStorage.getItem(`onboarding_completed_${learnerId}`)
      if (previouslyCompleted === 'true' && !onboardingStatus.completed) {
        // User may have been reset or data was cleared
        setIsReturningUser(true)
      }
    } catch (error) {
      console.error('Failed to check onboarding status:', error)
      // Default to not completed if we can't check
      setStatus({
        completed: false,
        currentStep: 0,
        totalSteps: 5,
        completedSteps: [],
      })
    } finally {
      setIsLoading(false)
    }
  }, [learnerId, onStatusChange])

  useEffect(() => {
    checkOnboardingStatus()
  }, [checkOnboardingStatus])

  // Handle navigation based on onboarding status
  useEffect(() => {
    if (isLoading || !status) return

    const isOnAllowedPath = allowedPaths.some(path => pathname?.startsWith(path))
    const isOnOnboardingPath = pathname?.startsWith(onboardingPath)

    if (!status.completed && !isOnAllowedPath) {
      // Redirect to onboarding
      const returnUrl = encodeURIComponent(pathname || '/')
      router.replace(`${onboardingPath}?returnUrl=${returnUrl}`)
    } else if (status.completed && isOnOnboardingPath && !isReturningUser) {
      // Redirect away from onboarding if already completed
      const returnUrl = new URLSearchParams(window.location.search).get('returnUrl')
      router.replace(returnUrl || '/')
    }
  }, [isLoading, status, pathname, allowedPaths, onboardingPath, router, isReturningUser])

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center animate-pulse">
            <span className="text-3xl">🎓</span>
          </div>
          <p className="text-lg text-gray-600">Getting ready...</p>
        </div>
      </div>
    )
  }

  // Returning user notice
  if (isReturningUser && pathname?.startsWith(onboardingPath)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white p-4">
        <div className="bg-white rounded-2xl shadow-lg p-6 max-w-md w-full text-center">
          <span className="text-5xl mb-4 inline-block">👋</span>
          <h2 className="text-2xl font-bold mb-2">Welcome back!</h2>
          <p className="text-gray-600 mb-4">
            We&apos;d like you to complete a quick setup to make sure everything is perfect for you.
          </p>
          <button
            onClick={() => setIsReturningUser(false)}
            className="w-full py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-colors"
          >
            Let&apos;s do it!
          </button>
          <button
            onClick={() => {
              // Mark as completed and skip
              localStorage.setItem(`onboarding_completed_${learnerId}`, 'true')
              localStorage.setItem(`onboarding_status_${learnerId}`, JSON.stringify({
                completed: true,
                currentStep: 5,
                totalSteps: 5,
                completedSteps: ['welcome', 'profile', 'preferences', 'accessibility', 'complete'],
              }))
              router.replace('/')
            }}
            className="w-full mt-2 py-2 text-gray-500 hover:text-gray-700 transition-colors"
          >
            Skip for now
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

// Hook to manage onboarding state
export function useOnboarding(learnerId: string) {
  const [status, setStatus] = useState<OnboardingStatus>({
    completed: false,
    currentStep: 0,
    totalSteps: 5,
    completedSteps: [],
  })

  const completeStep = useCallback((stepId: string) => {
    setStatus(prev => {
      const newCompletedSteps = [...prev.completedSteps, stepId]
      const newStatus = {
        ...prev,
        currentStep: prev.currentStep + 1,
        completedSteps: newCompletedSteps,
        completed: newCompletedSteps.length >= prev.totalSteps,
      }

      // Persist to localStorage
      localStorage.setItem(`onboarding_status_${learnerId}`, JSON.stringify(newStatus))
      if (newStatus.completed) {
        localStorage.setItem(`onboarding_completed_${learnerId}`, 'true')
      }

      return newStatus
    })
  }, [learnerId])

  const skipOnboarding = useCallback(() => {
    const completedStatus: OnboardingStatus = {
      completed: true,
      currentStep: 5,
      totalSteps: 5,
      completedSteps: ['welcome', 'profile', 'preferences', 'accessibility', 'complete'],
    }
    setStatus(completedStatus)
    localStorage.setItem(`onboarding_status_${learnerId}`, JSON.stringify(completedStatus))
    localStorage.setItem(`onboarding_completed_${learnerId}`, 'true')
  }, [learnerId])

  const resetOnboarding = useCallback(() => {
    const initialStatus: OnboardingStatus = {
      completed: false,
      currentStep: 0,
      totalSteps: 5,
      completedSteps: [],
    }
    setStatus(initialStatus)
    localStorage.removeItem(`onboarding_status_${learnerId}`)
    localStorage.removeItem(`onboarding_completed_${learnerId}`)
  }, [learnerId])

  // Load status on mount
  useEffect(() => {
    const stored = localStorage.getItem(`onboarding_status_${learnerId}`)
    if (stored) {
      setStatus(JSON.parse(stored))
    }
  }, [learnerId])

  return {
    status,
    completeStep,
    skipOnboarding,
    resetOnboarding,
    isComplete: status.completed,
    currentStep: status.currentStep,
  }
}

export default OnboardingGuard
