'use client'

interface OnboardingProgressProps {
  currentStep: number
  totalSteps: number
  steps?: { id: string; label: string; icon?: string }[]
  variant?: 'dots' | 'bar' | 'steps'
  showLabels?: boolean
  className?: string
}

const DEFAULT_STEPS = [
  { id: 'welcome', label: 'Welcome', icon: '👋' },
  { id: 'profile', label: 'About You', icon: '🎨' },
  { id: 'preferences', label: 'Preferences', icon: '⚙️' },
  { id: 'accessibility', label: 'Accessibility', icon: '♿' },
  { id: 'complete', label: 'Ready!', icon: '🎉' },
]

export function OnboardingProgress({
  currentStep,
  totalSteps,
  steps = DEFAULT_STEPS,
  variant = 'dots',
  showLabels = false,
  className = '',
}: Readonly<OnboardingProgressProps>) {
  const progress = Math.min(100, (currentStep / totalSteps) * 100)

  if (variant === 'bar') {
    return (
      <div className={`w-full ${className}`}>
        {/* Progress bar */}
        <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Step counter */}
        <div className="flex justify-between mt-2 text-sm text-gray-600">
          <span>Step {currentStep + 1} of {totalSteps}</span>
          <span>{Math.round(progress)}% complete</span>
        </div>
      </div>
    )
  }

  if (variant === 'steps') {
    return (
      <div className={`w-full ${className}`}>
        <div className="flex items-center justify-between">
          {steps.slice(0, totalSteps).map((step, index) => {
            const isCompleted = index < currentStep
            const isCurrent = index === currentStep
            const isUpcoming = index > currentStep

            return (
              <div key={step.id} className="flex items-center flex-1">
                {/* Step circle */}
                <div className="flex flex-col items-center">
                  <div
                    className={`
                      w-10 h-10 rounded-full
                      flex items-center justify-center
                      transition-all duration-300
                      ${isCompleted
                        ? 'bg-green-500 text-white'
                        : isCurrent
                          ? 'bg-blue-500 text-white ring-4 ring-blue-200'
                          : 'bg-gray-200 text-gray-500'
                      }
                    `}
                  >
                    {isCompleted ? (
                      <span className="text-lg">✓</span>
                    ) : (
                      <span className="text-lg">{step.icon}</span>
                    )}
                  </div>

                  {showLabels && (
                    <span
                      className={`
                        mt-2 text-xs font-medium text-center
                        ${isCurrent ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'}
                      `}
                    >
                      {step.label}
                    </span>
                  )}
                </div>

                {/* Connector line */}
                {index < totalSteps - 1 && (
                  <div
                    className={`
                      flex-1 h-1 mx-2 rounded-full
                      transition-all duration-300
                      ${isCompleted ? 'bg-green-500' : 'bg-gray-200'}
                    `}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Default: dots variant
  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      {Array.from({ length: totalSteps }).map((_, index) => {
        const isCompleted = index < currentStep
        const isCurrent = index === currentStep

        return (
          <div
            key={index}
            className={`
              rounded-full transition-all duration-300
              ${isCurrent
                ? 'w-8 h-3 bg-blue-500'
                : isCompleted
                  ? 'w-3 h-3 bg-green-500'
                  : 'w-3 h-3 bg-gray-300'
              }
            `}
            aria-label={`Step ${index + 1}${isCurrent ? ' (current)' : isCompleted ? ' (completed)' : ''}`}
          />
        )
      })}
    </div>
  )
}

export default OnboardingProgress
