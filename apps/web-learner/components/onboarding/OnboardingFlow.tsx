'use client'

import { useState, useCallback, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { OnboardingProgress } from './OnboardingProgress'
import { useOnboarding } from './OnboardingGuard'

interface OnboardingStepConfig {
  id: string
  label: string
  icon: string
  title: string
  description: string
  component: ReactNode
  optional?: boolean
  skipLabel?: string
}

interface OnboardingFlowProps {
  learnerId: string
  learnerName?: string
  steps?: OnboardingStepConfig[]
  onComplete?: () => void
  returnUrl?: string
  className?: string
}

interface StepProps {
  onNext: () => void
  onSkip?: () => void
  data: Record<string, unknown>
  setData: (data: Record<string, unknown>) => void
}

// Default step components
function WelcomeStep({ onNext }: Readonly<StepProps>) {
  return (
    <div className="text-center py-8">
      <span className="text-7xl mb-6 inline-block animate-bounce">🎉</span>
      <h2 className="text-3xl font-bold mb-4">Welcome to AIVO!</h2>
      <p className="text-lg text-gray-600 mb-8 max-w-md mx-auto">
        We&apos;re excited to help you learn! Let&apos;s set things up so you have the best experience possible.
      </p>
      <button
        onClick={onNext}
        className="px-8 py-4 bg-blue-500 text-white text-lg font-semibold rounded-2xl hover:bg-blue-600 transition-colors shadow-lg hover:shadow-xl"
      >
        Let&apos;s Get Started! 🚀
      </button>
    </div>
  )
}

function ProfileStep({ onNext, onSkip, data, setData }: StepProps) {
  const [name, setName] = useState(data.displayName as string || '')
  const [avatar, setAvatar] = useState(data.avatar as string || '🧑‍🎓')
  const [age, setAge] = useState(data.age as string || '')

  const avatars = ['🧑‍🎓', '👧', '👦', '🧒', '👩‍🎓', '👨‍🎓', '🦊', '🐰', '🐻', '🐼', '🦄', '🐲']

  const handleNext = () => {
    setData({ ...data, displayName: name, avatar, age })
    onNext()
  }

  return (
    <div className="py-6">
      <h2 className="text-2xl font-bold mb-6 text-center">Tell us about yourself!</h2>

      {/* Avatar selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Choose your avatar
        </label>
        <div className="flex flex-wrap gap-2 justify-center">
          {avatars.map(a => (
            <button
              key={a}
              onClick={() => setAvatar(a)}
              className={`
                w-14 h-14 text-3xl rounded-xl
                transition-all duration-200
                ${avatar === a
                  ? 'bg-blue-100 ring-2 ring-blue-500 scale-110'
                  : 'bg-gray-100 hover:bg-gray-200'
                }
              `}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      {/* Name input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          What should we call you?
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name or nickname"
          className="
            w-full px-4 py-3 rounded-xl
            border-2 border-gray-200
            focus:border-blue-500 focus:outline-none
            text-lg
          "
        />
      </div>

      {/* Age selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          How old are you?
        </label>
        <select
          value={age}
          onChange={(e) => setAge(e.target.value)}
          className="
            w-full px-4 py-3 rounded-xl
            border-2 border-gray-200
            focus:border-blue-500 focus:outline-none
            text-lg
          "
        >
          <option value="">Select your age</option>
          {Array.from({ length: 14 }, (_, i) => i + 5).map(a => (
            <option key={a} value={a}>{a} years old</option>
          ))}
        </select>
      </div>

      <div className="flex gap-3">
        {onSkip && (
          <button
            onClick={onSkip}
            className="flex-1 py-3 text-gray-500 hover:text-gray-700 transition-colors"
          >
            Skip for now
          </button>
        )}
        <button
          onClick={handleNext}
          className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  )
}

function PreferencesStep({ onNext, onSkip, data, setData }: StepProps) {
  const [subjects, setSubjects] = useState<string[]>(data.favoriteSubjects as string[] || [])
  const [learningStyle, setLearningStyle] = useState(data.learningStyle as string || '')

  const subjectOptions = [
    { id: 'reading', label: 'Reading', icon: '📚' },
    { id: 'math', label: 'Math', icon: '🔢' },
    { id: 'writing', label: 'Writing', icon: '✍️' },
    { id: 'science', label: 'Science', icon: '🔬' },
    { id: 'art', label: 'Art', icon: '🎨' },
    { id: 'music', label: 'Music', icon: '🎵' },
  ]

  const learningStyles = [
    { id: 'visual', label: 'Pictures & Videos', icon: '👁️' },
    { id: 'auditory', label: 'Listening', icon: '👂' },
    { id: 'kinesthetic', label: 'Hands-on', icon: '🖐️' },
    { id: 'reading', label: 'Reading', icon: '📖' },
  ]

  const toggleSubject = (id: string) => {
    setSubjects(prev =>
      prev.includes(id)
        ? prev.filter(s => s !== id)
        : [...prev, id]
    )
  }

  const handleNext = () => {
    setData({ ...data, favoriteSubjects: subjects, learningStyle })
    onNext()
  }

  return (
    <div className="py-6">
      <h2 className="text-2xl font-bold mb-6 text-center">What do you like?</h2>

      {/* Subject selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Pick your favorite subjects (choose as many as you want!)
        </label>
        <div className="grid grid-cols-2 gap-2">
          {subjectOptions.map(subject => (
            <button
              key={subject.id}
              onClick={() => toggleSubject(subject.id)}
              className={`
                p-3 rounded-xl text-left
                flex items-center gap-2
                transition-all duration-200
                ${subjects.includes(subject.id)
                  ? 'bg-blue-100 border-2 border-blue-500'
                  : 'bg-gray-50 border-2 border-gray-200 hover:bg-gray-100'
                }
              `}
            >
              <span className="text-2xl">{subject.icon}</span>
              <span className="font-medium">{subject.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Learning style */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          How do you learn best?
        </label>
        <div className="grid grid-cols-2 gap-2">
          {learningStyles.map(style => (
            <button
              key={style.id}
              onClick={() => setLearningStyle(style.id)}
              className={`
                p-3 rounded-xl text-left
                flex items-center gap-2
                transition-all duration-200
                ${learningStyle === style.id
                  ? 'bg-purple-100 border-2 border-purple-500'
                  : 'bg-gray-50 border-2 border-gray-200 hover:bg-gray-100'
                }
              `}
            >
              <span className="text-2xl">{style.icon}</span>
              <span className="font-medium">{style.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        {onSkip && (
          <button
            onClick={onSkip}
            className="flex-1 py-3 text-gray-500 hover:text-gray-700 transition-colors"
          >
            Skip for now
          </button>
        )}
        <button
          onClick={handleNext}
          className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  )
}

function AccessibilityStep({ onNext, onSkip, data, setData }: StepProps) {
  const [options, setOptions] = useState({
    largeText: data.largeText as boolean || false,
    highContrast: data.highContrast as boolean || false,
    reduceMotion: data.reduceMotion as boolean || false,
    screenReader: data.screenReader as boolean || false,
    textToSpeech: data.textToSpeech as boolean || false,
  })

  const toggleOption = (key: keyof typeof options) => {
    setOptions(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleNext = () => {
    setData({ ...data, ...options })
    onNext()
  }

  const accessibilityOptions = [
    { key: 'largeText' as const, label: 'Larger Text', icon: '🔤', description: 'Make text bigger and easier to read' },
    { key: 'highContrast' as const, label: 'High Contrast', icon: '🎨', description: 'More visible colors' },
    { key: 'reduceMotion' as const, label: 'Less Motion', icon: '✨', description: 'Fewer animations' },
    { key: 'textToSpeech' as const, label: 'Read Aloud', icon: '🔊', description: 'Have text read to you' },
  ]

  return (
    <div className="py-6">
      <h2 className="text-2xl font-bold mb-2 text-center">Let&apos;s make things comfortable</h2>
      <p className="text-gray-600 text-center mb-6">
        You can always change these later in settings
      </p>

      <div className="space-y-3 mb-6">
        {accessibilityOptions.map(option => (
          <button
            key={option.key}
            onClick={() => toggleOption(option.key)}
            className={`
              w-full p-4 rounded-xl text-left
              flex items-center gap-4
              transition-all duration-200
              ${options[option.key]
                ? 'bg-green-100 border-2 border-green-500'
                : 'bg-gray-50 border-2 border-gray-200 hover:bg-gray-100'
              }
            `}
          >
            <span className="text-3xl">{option.icon}</span>
            <div className="flex-grow">
              <p className="font-semibold">{option.label}</p>
              <p className="text-sm text-gray-600">{option.description}</p>
            </div>
            <div
              className={`
                w-12 h-7 rounded-full transition-colors duration-200
                ${options[option.key] ? 'bg-green-500' : 'bg-gray-300'}
                relative
              `}
            >
              <div
                className={`
                  absolute top-1 w-5 h-5 bg-white rounded-full
                  transition-transform duration-200
                  ${options[option.key] ? 'translate-x-6' : 'translate-x-1'}
                `}
              />
            </div>
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        {onSkip && (
          <button
            onClick={onSkip}
            className="flex-1 py-3 text-gray-500 hover:text-gray-700 transition-colors"
          >
            Skip for now
          </button>
        )}
        <button
          onClick={handleNext}
          className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  )
}

function CompleteStep({ onNext }: Readonly<StepProps>) {
  return (
    <div className="text-center py-8">
      <span className="text-7xl mb-6 inline-block">🎊</span>
      <h2 className="text-3xl font-bold mb-4">You&apos;re all set!</h2>
      <p className="text-lg text-gray-600 mb-8 max-w-md mx-auto">
        Everything is ready for you. Let&apos;s start learning and having fun!
      </p>
      <button
        onClick={onNext}
        className="px-8 py-4 bg-green-500 text-white text-lg font-semibold rounded-2xl hover:bg-green-600 transition-colors shadow-lg hover:shadow-xl"
      >
        Start Learning! 🚀
      </button>
    </div>
  )
}

const DEFAULT_STEPS: OnboardingStepConfig[] = [
  {
    id: 'welcome',
    label: 'Welcome',
    icon: '👋',
    title: 'Welcome',
    description: 'Get started with AIVO',
    component: <WelcomeStep onNext={() => {}} data={{}} setData={() => {}} />,
  },
  {
    id: 'profile',
    label: 'About You',
    icon: '🎨',
    title: 'About You',
    description: 'Tell us a bit about yourself',
    component: <ProfileStep onNext={() => {}} data={{}} setData={() => {}} />,
    optional: true,
    skipLabel: 'Skip for now',
  },
  {
    id: 'preferences',
    label: 'Preferences',
    icon: '⭐',
    title: 'Your Preferences',
    description: 'Customize your experience',
    component: <PreferencesStep onNext={() => {}} data={{}} setData={() => {}} />,
    optional: true,
    skipLabel: 'Skip for now',
  },
  {
    id: 'accessibility',
    label: 'Accessibility',
    icon: '♿',
    title: 'Accessibility',
    description: 'Make AIVO work for you',
    component: <AccessibilityStep onNext={() => {}} data={{}} setData={() => {}} />,
    optional: true,
    skipLabel: 'Skip for now',
  },
  {
    id: 'complete',
    label: 'Ready!',
    icon: '🎉',
    title: 'All Done!',
    description: 'You\'re ready to go',
    component: <CompleteStep onNext={() => {}} data={{}} setData={() => {}} />,
  },
]

export function OnboardingFlow({
  learnerId,
  learnerName,
  steps = DEFAULT_STEPS,
  onComplete,
  returnUrl,
  className = '',
}: Readonly<OnboardingFlowProps>) {
  const router = useRouter()
  const { completeStep, skipOnboarding, currentStep } = useOnboarding(learnerId)
  const [stepIndex, setStepIndex] = useState(currentStep)
  const [data, setData] = useState<Record<string, unknown>>({
    displayName: learnerName,
  })

  const totalSteps = steps.length
  const currentStepConfig = steps[stepIndex]

  const handleNext = useCallback(() => {
    // Mark current step as complete
    completeStep(currentStepConfig.id)

    if (stepIndex < totalSteps - 1) {
      setStepIndex(stepIndex + 1)
    } else {
      // Save all collected data
      localStorage.setItem(`learner_preferences_${learnerId}`, JSON.stringify(data))
      onComplete?.()
      router.replace(returnUrl || '/')
    }
  }, [stepIndex, totalSteps, completeStep, currentStepConfig.id, data, learnerId, onComplete, router, returnUrl])

  const handleSkip = useCallback(() => {
    completeStep(currentStepConfig.id)
    if (stepIndex < totalSteps - 1) {
      setStepIndex(stepIndex + 1)
    } else {
      onComplete?.()
      router.replace(returnUrl || '/')
    }
  }, [stepIndex, totalSteps, completeStep, currentStepConfig.id, onComplete, router, returnUrl])

  const handleSkipAll = useCallback(() => {
    skipOnboarding()
    onComplete?.()
    router.replace(returnUrl || '/')
  }, [skipOnboarding, onComplete, router, returnUrl])

  // Render the current step component with proper props
  const renderStep = () => {
    const stepProps: StepProps = {
      onNext: handleNext,
      onSkip: currentStepConfig.optional ? handleSkip : undefined,
      data,
      setData,
    }

    switch (currentStepConfig.id) {
      case 'welcome':
        return <WelcomeStep {...stepProps} />
      case 'profile':
        return <ProfileStep {...stepProps} />
      case 'preferences':
        return <PreferencesStep {...stepProps} />
      case 'accessibility':
        return <AccessibilityStep {...stepProps} />
      case 'complete':
        return <CompleteStep {...stepProps} />
      default:
        return currentStepConfig.component
    }
  }

  return (
    <div className={`min-h-screen bg-gradient-to-b from-blue-50 to-white ${className}`}>
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Progress indicator */}
        <OnboardingProgress
          currentStep={stepIndex}
          totalSteps={totalSteps}
          steps={steps.map(s => ({ id: s.id, label: s.label, icon: s.icon }))}
          variant="dots"
          className="mb-8"
        />

        {/* Step content */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          {renderStep()}
        </div>

        {/* Skip all button (except on last step) */}
        {stepIndex < totalSteps - 1 && (
          <button
            onClick={handleSkipAll}
            className="w-full mt-4 py-2 text-gray-400 text-sm hover:text-gray-600 transition-colors"
          >
            Skip setup and start learning
          </button>
        )}
      </div>
    </div>
  )
}

export default OnboardingFlow
