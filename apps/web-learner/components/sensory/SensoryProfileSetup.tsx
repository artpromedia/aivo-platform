'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { SensoryPreferences } from './SensoryProfile'

interface SensoryProfileSetupProps {
  learnerId: string
  learnerName?: string
  onComplete?: (preferences: SensoryPreferences) => void
  returnUrl?: string
  className?: string
}

type WizardStep = 'intro' | 'visual' | 'audio' | 'interaction' | 'complete'

const DEFAULT_PREFERENCES: SensoryPreferences = {
  visual: {
    contrast: 'normal',
    colorScheme: 'default',
    reduceMotion: false,
    fontSize: 'medium',
    lineSpacing: 'normal',
    fontFamily: 'default',
  },
  audio: {
    volume: 70,
    soundEffects: true,
    backgroundMusic: false,
    textToSpeech: false,
    speechRate: 'normal',
  },
  touch: {
    animationSpeed: 'normal',
    hapticFeedback: true,
    clickSounds: true,
    autoScroll: false,
  },
  cognitive: {
    complexity: 'moderate',
    pace: 'normal',
    breakReminders: true,
    breakIntervalMinutes: 25,
    showTimers: true,
    hideDistractions: false,
  },
}

const WIZARD_STEPS: { id: WizardStep; label: string; icon: string }[] = [
  { id: 'intro', label: 'Welcome', icon: '👋' },
  { id: 'visual', label: 'Seeing', icon: '👁️' },
  { id: 'audio', label: 'Hearing', icon: '👂' },
  { id: 'interaction', label: 'Doing', icon: '🖐️' },
  { id: 'complete', label: 'Done', icon: '🎉' },
]

export function SensoryProfileSetup({
  learnerId,
  learnerName,
  onComplete,
  returnUrl,
  className = '',
}: Readonly<SensoryProfileSetupProps>) {
  const router = useRouter()
  const [step, setStep] = useState<WizardStep>('intro')
  const [preferences, setPreferences] = useState<SensoryPreferences>(DEFAULT_PREFERENCES)

  const currentStepIndex = WIZARD_STEPS.findIndex(s => s.id === step)

  const nextStep = useCallback(() => {
    const nextIndex = currentStepIndex + 1
    if (nextIndex < WIZARD_STEPS.length) {
      setStep(WIZARD_STEPS[nextIndex].id)
    }
  }, [currentStepIndex])

  const prevStep = useCallback(() => {
    const prevIndex = currentStepIndex - 1
    if (prevIndex >= 0) {
      setStep(WIZARD_STEPS[prevIndex].id)
    }
  }, [currentStepIndex])

  const handleComplete = useCallback(() => {
    // Save preferences
    localStorage.setItem(`sensory_preferences_${learnerId}`, JSON.stringify(preferences))
    localStorage.setItem(`sensory_setup_completed_${learnerId}`, 'true')
    onComplete?.(preferences)
    router.push(returnUrl || '/')
  }, [learnerId, preferences, onComplete, router, returnUrl])

  const handleSkip = useCallback(() => {
    localStorage.setItem(`sensory_setup_completed_${learnerId}`, 'true')
    router.push(returnUrl || '/')
  }, [learnerId, router, returnUrl])

  const updateVisual = (key: keyof SensoryPreferences['visual'], value: SensoryPreferences['visual'][typeof key]) => {
    setPreferences(prev => ({
      ...prev,
      visual: { ...prev.visual, [key]: value },
    }))
  }

  const updateAudio = (key: keyof SensoryPreferences['audio'], value: SensoryPreferences['audio'][typeof key]) => {
    setPreferences(prev => ({
      ...prev,
      audio: { ...prev.audio, [key]: value },
    }))
  }

  const updateTouch = (key: keyof SensoryPreferences['touch'], value: SensoryPreferences['touch'][typeof key]) => {
    setPreferences(prev => ({
      ...prev,
      touch: { ...prev.touch, [key]: value },
    }))
  }

  const renderStep = () => {
    switch (step) {
      case 'intro':
        return (
          <div className="text-center py-8">
            <span className="text-7xl mb-6 inline-block">🎨</span>
            <h2 className="text-2xl font-bold mb-4">
              {learnerName ? `Hi ${learnerName}!` : 'Hi there!'}
            </h2>
            <p className="text-lg text-gray-600 mb-6 max-w-md mx-auto">
              Let&apos;s set things up so everything looks and sounds just right for you!
            </p>
            <p className="text-sm text-gray-500 mb-8">
              This will only take a minute, and you can change these anytime.
            </p>
            <div className="flex flex-col gap-3 max-w-xs mx-auto">
              <button
                onClick={nextStep}
                className="py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-colors"
              >
                Let&apos;s Go! 🚀
              </button>
              <button
                onClick={handleSkip}
                className="py-2 text-gray-500 hover:text-gray-700 transition-colors"
              >
                Skip for now
              </button>
            </div>
          </div>
        )

      case 'visual':
        return (
          <div className="py-6">
            <div className="text-center mb-6">
              <span className="text-5xl mb-3 inline-block">👁️</span>
              <h2 className="text-2xl font-bold">How do you like to see things?</h2>
            </div>

            {/* Text Size with Live Preview */}
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-700 mb-3">
                Pick the text size that&apos;s easiest to read:
              </p>
              <div className="grid grid-cols-2 gap-3">
                {([
                  { id: 'small' as const, label: 'Small', preview: 'Aa', size: '14px' },
                  { id: 'medium' as const, label: 'Medium', preview: 'Aa', size: '16px' },
                  { id: 'large' as const, label: 'Large', preview: 'Aa', size: '18px' },
                  { id: 'extra-large' as const, label: 'Extra Large', preview: 'Aa', size: '20px' },
                ]).map(option => (
                  <button
                    key={option.id}
                    onClick={() => updateVisual('fontSize', option.id)}
                    className={`
                      p-4 rounded-xl text-center
                      transition-all duration-200
                      ${preferences.visual.fontSize === option.id
                        ? 'bg-blue-100 border-2 border-blue-500'
                        : 'bg-gray-50 border-2 border-gray-200 hover:bg-gray-100'
                      }
                    `}
                  >
                    <span style={{ fontSize: option.size }} className="font-bold block mb-1">
                      {option.preview}
                    </span>
                    <span className="text-sm">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Color Theme */}
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-700 mb-3">
                Pick colors that feel good:
              </p>
              <div className="grid grid-cols-2 gap-3">
                {([
                  { id: 'default' as const, label: 'Colorful', gradient: 'from-blue-400 to-purple-500' },
                  { id: 'warm' as const, label: 'Warm', gradient: 'from-orange-400 to-red-400' },
                  { id: 'cool' as const, label: 'Cool', gradient: 'from-cyan-400 to-blue-500' },
                  { id: 'monochrome' as const, label: 'Simple', gradient: 'from-gray-400 to-gray-600' },
                ]).map(option => (
                  <button
                    key={option.id}
                    onClick={() => updateVisual('colorScheme', option.id)}
                    className={`
                      p-4 rounded-xl
                      transition-all duration-200
                      ${preferences.visual.colorScheme === option.id
                        ? 'ring-2 ring-blue-500 ring-offset-2'
                        : ''
                      }
                    `}
                  >
                    <div className={`h-12 rounded-lg bg-gradient-to-r ${option.gradient} mb-2`} />
                    <span className="text-sm font-medium">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick toggles */}
            <div className="space-y-3 mb-6">
              <QuickToggle
                label="🎬 Less moving things"
                description="Make things calmer"
                checked={preferences.visual.reduceMotion}
                onChange={(checked) => updateVisual('reduceMotion', checked)}
              />
            </div>

            <StepNavigation
              onPrev={prevStep}
              onNext={nextStep}
              showPrev={true}
            />
          </div>
        )

      case 'audio':
        return (
          <div className="py-6">
            <div className="text-center mb-6">
              <span className="text-5xl mb-3 inline-block">👂</span>
              <h2 className="text-2xl font-bold">How do you like sounds?</h2>
            </div>

            {/* Volume */}
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-700 mb-3">
                How loud should sounds be?
              </p>
              <div className="flex items-center gap-4">
                <span className="text-2xl">🔈</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={preferences.audio.volume}
                  onChange={(e) => updateAudio('volume', parseInt(e.target.value))}
                  className="flex-1 h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <span className="text-2xl">🔊</span>
              </div>
              <p className="text-center text-sm text-gray-500 mt-2">
                {preferences.audio.volume}%
              </p>
            </div>

            {/* Sound toggles */}
            <div className="space-y-3 mb-6">
              <QuickToggle
                label="🎵 Fun sounds"
                description="Sounds when you do things"
                checked={preferences.audio.soundEffects}
                onChange={(checked) => updateAudio('soundEffects', checked)}
              />
              <QuickToggle
                label="🎶 Background music"
                description="Quiet music while learning"
                checked={preferences.audio.backgroundMusic}
                onChange={(checked) => updateAudio('backgroundMusic', checked)}
              />
              <QuickToggle
                label="🗣️ Read to me"
                description="Have words read aloud"
                checked={preferences.audio.textToSpeech}
                onChange={(checked) => updateAudio('textToSpeech', checked)}
              />
            </div>

            <StepNavigation
              onPrev={prevStep}
              onNext={nextStep}
              showPrev={true}
            />
          </div>
        )

      case 'interaction':
        return (
          <div className="py-6">
            <div className="text-center mb-6">
              <span className="text-5xl mb-3 inline-block">🖐️</span>
              <h2 className="text-2xl font-bold">How do you like things to move?</h2>
            </div>

            {/* Animation Speed */}
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-700 mb-3">
                How fast should animations be?
              </p>
              <div className="grid grid-cols-2 gap-3">
                {([
                  { id: 'none' as const, label: 'No animations', icon: '🛑' },
                  { id: 'slow' as const, label: 'Slow', icon: '🐢' },
                  { id: 'normal' as const, label: 'Normal', icon: '🚶' },
                  { id: 'fast' as const, label: 'Fast', icon: '🏃' },
                ]).map(option => (
                  <button
                    key={option.id}
                    onClick={() => updateTouch('animationSpeed', option.id)}
                    className={`
                      p-4 rounded-xl flex flex-col items-center
                      transition-all duration-200
                      ${preferences.touch.animationSpeed === option.id
                        ? 'bg-blue-100 border-2 border-blue-500'
                        : 'bg-gray-50 border-2 border-gray-200 hover:bg-gray-100'
                      }
                    `}
                  >
                    <span className="text-3xl mb-1">{option.icon}</span>
                    <span className="text-sm font-medium">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Touch toggles */}
            <div className="space-y-3 mb-6">
              <QuickToggle
                label="📳 Vibration"
                description="Feel it when you tap"
                checked={preferences.touch.hapticFeedback}
                onChange={(checked) => updateTouch('hapticFeedback', checked)}
              />
              <QuickToggle
                label="🔘 Click sounds"
                description="Sounds when tapping buttons"
                checked={preferences.touch.clickSounds}
                onChange={(checked) => updateTouch('clickSounds', checked)}
              />
            </div>

            <StepNavigation
              onPrev={prevStep}
              onNext={nextStep}
              showPrev={true}
            />
          </div>
        )

      case 'complete':
        return (
          <div className="text-center py-8">
            <span className="text-7xl mb-6 inline-block animate-bounce">🎉</span>
            <h2 className="text-2xl font-bold mb-4">All set!</h2>
            <p className="text-lg text-gray-600 mb-8 max-w-md mx-auto">
              Your experience is now customized just for you! You can always change these settings later.
            </p>
            <button
              onClick={handleComplete}
              className="px-8 py-3 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-colors"
            >
              Start Learning! 🚀
            </button>
          </div>
        )
    }
  }

  return (
    <div className={`min-h-screen bg-gradient-to-b from-purple-50 to-white ${className}`}>
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {WIZARD_STEPS.map((s, i) => (
            <div
              key={s.id}
              className={`
                w-3 h-3 rounded-full transition-all duration-300
                ${i === currentStepIndex
                  ? 'w-8 bg-blue-500'
                  : i < currentStepIndex
                    ? 'bg-green-500'
                    : 'bg-gray-300'
                }
              `}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          {renderStep()}
        </div>
      </div>
    </div>
  )
}

// Quick toggle component
function QuickToggle({
  label,
  description,
  checked,
  onChange,
}: Readonly<{
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
}>) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`
        w-full p-4 rounded-xl text-left
        flex items-center gap-3
        transition-all duration-200
        ${checked
          ? 'bg-blue-50 border-2 border-blue-500'
          : 'bg-gray-50 border-2 border-gray-200 hover:bg-gray-100'
        }
      `}
    >
      <div className="flex-grow">
        <p className="font-medium">{label}</p>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
      <div
        className={`
          w-12 h-7 rounded-full transition-colors duration-200
          ${checked ? 'bg-blue-500' : 'bg-gray-300'}
          relative flex-shrink-0
        `}
      >
        <div
          className={`
            absolute top-1 w-5 h-5 bg-white rounded-full shadow
            transition-transform duration-200
            ${checked ? 'translate-x-6' : 'translate-x-1'}
          `}
        />
      </div>
    </button>
  )
}

// Navigation buttons
function StepNavigation({
  onPrev,
  onNext,
  showPrev,
  nextLabel = 'Next',
}: Readonly<{
  onPrev: () => void
  onNext: () => void
  showPrev: boolean
  nextLabel?: string
}>) {
  return (
    <div className="flex gap-3 mt-6">
      {showPrev && (
        <button
          onClick={onPrev}
          className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
        >
          Back
        </button>
      )}
      <button
        onClick={onNext}
        className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-colors"
      >
        {nextLabel}
      </button>
    </div>
  )
}

export default SensoryProfileSetup
