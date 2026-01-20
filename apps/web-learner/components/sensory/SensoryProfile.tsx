'use client'

import { useState, useEffect, useCallback } from 'react'

export interface SensoryPreferences {
  // Visual preferences
  visual: {
    contrast: 'normal' | 'high' | 'low'
    colorScheme: 'default' | 'warm' | 'cool' | 'monochrome'
    reduceMotion: boolean
    fontSize: 'small' | 'medium' | 'large' | 'extra-large'
    lineSpacing: 'normal' | 'relaxed' | 'loose'
    fontFamily: 'default' | 'dyslexic' | 'sans-serif' | 'serif'
  }
  // Audio preferences
  audio: {
    volume: number
    soundEffects: boolean
    backgroundMusic: boolean
    textToSpeech: boolean
    speechRate: 'slow' | 'normal' | 'fast'
  }
  // Touch/interaction preferences
  touch: {
    animationSpeed: 'none' | 'slow' | 'normal' | 'fast'
    hapticFeedback: boolean
    clickSounds: boolean
    autoScroll: boolean
  }
  // Cognitive preferences
  cognitive: {
    complexity: 'simple' | 'moderate' | 'detailed'
    pace: 'slow' | 'normal' | 'fast'
    breakReminders: boolean
    breakIntervalMinutes: number
    showTimers: boolean
    hideDistractions: boolean
  }
}

interface SensoryProfileProps {
  learnerId: string
  initialPreferences?: Partial<SensoryPreferences>
  onSave?: (preferences: SensoryPreferences) => void
  onChange?: (preferences: SensoryPreferences) => void
  applyImmediately?: boolean
  className?: string
}

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

type TabType = 'visual' | 'audio' | 'touch' | 'cognitive'

export function SensoryProfile({
  learnerId,
  initialPreferences,
  onSave,
  onChange,
  applyImmediately = true,
  className = '',
}: Readonly<SensoryProfileProps>) {
  const [preferences, setPreferences] = useState<SensoryPreferences>(() => ({
    visual: { ...DEFAULT_PREFERENCES.visual, ...initialPreferences?.visual },
    audio: { ...DEFAULT_PREFERENCES.audio, ...initialPreferences?.audio },
    touch: { ...DEFAULT_PREFERENCES.touch, ...initialPreferences?.touch },
    cognitive: { ...DEFAULT_PREFERENCES.cognitive, ...initialPreferences?.cognitive },
  }))

  const [activeTab, setActiveTab] = useState<TabType>('visual')
  const [hasChanges, setHasChanges] = useState(false)

  // Load saved preferences
  useEffect(() => {
    const saved = localStorage.getItem(`sensory_preferences_${learnerId}`)
    if (saved) {
      const parsed = JSON.parse(saved)
      setPreferences({
        visual: { ...DEFAULT_PREFERENCES.visual, ...parsed.visual },
        audio: { ...DEFAULT_PREFERENCES.audio, ...parsed.audio },
        touch: { ...DEFAULT_PREFERENCES.touch, ...parsed.touch },
        cognitive: { ...DEFAULT_PREFERENCES.cognitive, ...parsed.cognitive },
      })
    }
  }, [learnerId])

  // Apply preferences to document
  useEffect(() => {
    if (!applyImmediately) return

    const root = document.documentElement

    // Apply visual preferences
    root.style.setProperty('--font-size-scale', {
      'small': '0.875',
      'medium': '1',
      'large': '1.125',
      'extra-large': '1.25',
    }[preferences.visual.fontSize])

    root.style.setProperty('--line-spacing', {
      'normal': '1.5',
      'relaxed': '1.75',
      'loose': '2',
    }[preferences.visual.lineSpacing])

    // Apply contrast
    root.dataset.contrast = preferences.visual.contrast

    // Apply color scheme
    root.dataset.colorScheme = preferences.visual.colorScheme

    // Apply font family
    if (preferences.visual.fontFamily === 'dyslexic') {
      root.style.setProperty('--font-family', 'OpenDyslexic, sans-serif')
    } else {
      root.style.removeProperty('--font-family')
    }

    // Apply reduce motion
    if (preferences.visual.reduceMotion) {
      root.classList.add('reduce-motion')
    } else {
      root.classList.remove('reduce-motion')
    }

    // Apply animation speed
    root.dataset.animationSpeed = preferences.touch.animationSpeed

  }, [preferences, applyImmediately])

  const updatePreference = useCallback(<T extends keyof SensoryPreferences>(
    category: T,
    key: keyof SensoryPreferences[T],
    value: SensoryPreferences[T][keyof SensoryPreferences[T]]
  ) => {
    setPreferences(prev => {
      const newPrefs = {
        ...prev,
        [category]: {
          ...prev[category],
          [key]: value,
        },
      }
      onChange?.(newPrefs)
      return newPrefs
    })
    setHasChanges(true)
  }, [onChange])

  const handleSave = useCallback(() => {
    localStorage.setItem(`sensory_preferences_${learnerId}`, JSON.stringify(preferences))
    onSave?.(preferences)
    setHasChanges(false)
  }, [learnerId, preferences, onSave])

  const handleReset = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES)
    localStorage.removeItem(`sensory_preferences_${learnerId}`)
    setHasChanges(false)
  }, [learnerId])

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'visual', label: 'Visual', icon: '👁️' },
    { id: 'audio', label: 'Audio', icon: '🔊' },
    { id: 'touch', label: 'Touch', icon: '🖐️' },
    { id: 'cognitive', label: 'Cognitive', icon: '🧠' },
  ]

  return (
    <div className={`bg-white rounded-2xl shadow-lg ${className}`}>
      {/* Tab navigation */}
      <div className="flex border-b border-gray-200">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex-1 py-4 px-3 text-center
              font-medium transition-colors duration-200
              ${activeTab === tab.id
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }
            `}
          >
            <span className="text-lg mr-1">{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-6">
        {activeTab === 'visual' && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold">Visual Preferences</h3>

            {/* Font Size */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Text Size
              </label>
              <div className="flex gap-2">
                {(['small', 'medium', 'large', 'extra-large'] as const).map(size => (
                  <button
                    key={size}
                    onClick={() => updatePreference('visual', 'fontSize', size)}
                    className={`
                      flex-1 py-2 px-3 rounded-lg font-medium
                      transition-colors duration-200
                      ${preferences.visual.fontSize === size
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }
                    `}
                    style={{
                      fontSize: { small: '0.75rem', medium: '0.875rem', large: '1rem', 'extra-large': '1.125rem' }[size]
                    }}
                  >
                    Aa
                  </button>
                ))}
              </div>
            </div>

            {/* Contrast */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contrast
              </label>
              <div className="flex gap-2">
                {(['low', 'normal', 'high'] as const).map(level => (
                  <button
                    key={level}
                    onClick={() => updatePreference('visual', 'contrast', level)}
                    className={`
                      flex-1 py-2 px-3 rounded-lg font-medium capitalize
                      transition-colors duration-200
                      ${preferences.visual.contrast === level
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }
                    `}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Scheme */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Color Theme
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'default' as const, label: 'Default', colors: ['bg-blue-500', 'bg-green-500'] },
                  { id: 'warm' as const, label: 'Warm', colors: ['bg-orange-500', 'bg-red-400'] },
                  { id: 'cool' as const, label: 'Cool', colors: ['bg-cyan-500', 'bg-indigo-500'] },
                  { id: 'monochrome' as const, label: 'Simple', colors: ['bg-gray-500', 'bg-gray-700'] },
                ].map(scheme => (
                  <button
                    key={scheme.id}
                    onClick={() => updatePreference('visual', 'colorScheme', scheme.id)}
                    className={`
                      p-3 rounded-lg flex items-center gap-2
                      transition-colors duration-200
                      ${preferences.visual.colorScheme === scheme.id
                        ? 'ring-2 ring-blue-500 bg-blue-50'
                        : 'bg-gray-50 hover:bg-gray-100'
                      }
                    `}
                  >
                    <div className="flex gap-1">
                      {scheme.colors.map((color, i) => (
                        <div key={i} className={`w-4 h-4 rounded-full ${color}`} />
                      ))}
                    </div>
                    <span className="font-medium">{scheme.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Font Family */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Font Style
              </label>
              <select
                value={preferences.visual.fontFamily}
                onChange={(e) => updatePreference('visual', 'fontFamily', e.target.value as SensoryPreferences['visual']['fontFamily'])}
                className="w-full p-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:outline-none"
              >
                <option value="default">Default</option>
                <option value="dyslexic">Dyslexia-friendly</option>
                <option value="sans-serif">Sans Serif</option>
                <option value="serif">Serif</option>
              </select>
            </div>

            {/* Reduce Motion Toggle */}
            <ToggleOption
              label="Reduce Motion"
              description="Minimize animations and moving elements"
              checked={preferences.visual.reduceMotion}
              onChange={(checked) => updatePreference('visual', 'reduceMotion', checked)}
            />
          </div>
        )}

        {activeTab === 'audio' && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold">Audio Preferences</h3>

            {/* Volume Slider */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Volume: {preferences.audio.volume}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={preferences.audio.volume}
                onChange={(e) => updatePreference('audio', 'volume', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            {/* Speech Rate */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Speech Speed
              </label>
              <div className="flex gap-2">
                {(['slow', 'normal', 'fast'] as const).map(rate => (
                  <button
                    key={rate}
                    onClick={() => updatePreference('audio', 'speechRate', rate)}
                    className={`
                      flex-1 py-2 px-3 rounded-lg font-medium capitalize
                      transition-colors duration-200
                      ${preferences.audio.speechRate === rate
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }
                    `}
                  >
                    {rate}
                  </button>
                ))}
              </div>
            </div>

            <ToggleOption
              label="Sound Effects"
              description="Play sounds for actions and achievements"
              checked={preferences.audio.soundEffects}
              onChange={(checked) => updatePreference('audio', 'soundEffects', checked)}
            />

            <ToggleOption
              label="Background Music"
              description="Play calming music while learning"
              checked={preferences.audio.backgroundMusic}
              onChange={(checked) => updatePreference('audio', 'backgroundMusic', checked)}
            />

            <ToggleOption
              label="Text to Speech"
              description="Have text read aloud automatically"
              checked={preferences.audio.textToSpeech}
              onChange={(checked) => updatePreference('audio', 'textToSpeech', checked)}
            />
          </div>
        )}

        {activeTab === 'touch' && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold">Touch & Interaction</h3>

            {/* Animation Speed */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Animation Speed
              </label>
              <div className="flex gap-2">
                {(['none', 'slow', 'normal', 'fast'] as const).map(speed => (
                  <button
                    key={speed}
                    onClick={() => updatePreference('touch', 'animationSpeed', speed)}
                    className={`
                      flex-1 py-2 px-3 rounded-lg font-medium capitalize
                      transition-colors duration-200
                      ${preferences.touch.animationSpeed === speed
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }
                    `}
                  >
                    {speed === 'none' ? 'Off' : speed}
                  </button>
                ))}
              </div>
            </div>

            <ToggleOption
              label="Haptic Feedback"
              description="Vibration on touch (mobile devices)"
              checked={preferences.touch.hapticFeedback}
              onChange={(checked) => updatePreference('touch', 'hapticFeedback', checked)}
            />

            <ToggleOption
              label="Click Sounds"
              description="Play sounds when tapping buttons"
              checked={preferences.touch.clickSounds}
              onChange={(checked) => updatePreference('touch', 'clickSounds', checked)}
            />

            <ToggleOption
              label="Auto-scroll"
              description="Automatically scroll to active content"
              checked={preferences.touch.autoScroll}
              onChange={(checked) => updatePreference('touch', 'autoScroll', checked)}
            />
          </div>
        )}

        {activeTab === 'cognitive' && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold">Cognitive Preferences</h3>

            {/* Complexity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content Complexity
              </label>
              <div className="flex gap-2">
                {([
                  { id: 'simple' as const, label: 'Simple', icon: '🟢' },
                  { id: 'moderate' as const, label: 'Moderate', icon: '🟡' },
                  { id: 'detailed' as const, label: 'Detailed', icon: '🔵' },
                ]).map(level => (
                  <button
                    key={level.id}
                    onClick={() => updatePreference('cognitive', 'complexity', level.id)}
                    className={`
                      flex-1 py-2 px-3 rounded-lg font-medium
                      transition-colors duration-200
                      ${preferences.cognitive.complexity === level.id
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }
                    `}
                  >
                    {level.icon} {level.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Pace */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Learning Pace
              </label>
              <div className="flex gap-2">
                {(['slow', 'normal', 'fast'] as const).map(pace => (
                  <button
                    key={pace}
                    onClick={() => updatePreference('cognitive', 'pace', pace)}
                    className={`
                      flex-1 py-2 px-3 rounded-lg font-medium capitalize
                      transition-colors duration-200
                      ${preferences.cognitive.pace === pace
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }
                    `}
                  >
                    {pace}
                  </button>
                ))}
              </div>
            </div>

            {/* Break Interval */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Break Reminder: Every {preferences.cognitive.breakIntervalMinutes} minutes
              </label>
              <input
                type="range"
                min="10"
                max="60"
                step="5"
                value={preferences.cognitive.breakIntervalMinutes}
                onChange={(e) => updatePreference('cognitive', 'breakIntervalMinutes', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            <ToggleOption
              label="Break Reminders"
              description="Get reminded to take breaks"
              checked={preferences.cognitive.breakReminders}
              onChange={(checked) => updatePreference('cognitive', 'breakReminders', checked)}
            />

            <ToggleOption
              label="Show Timers"
              description="Display countdown timers for activities"
              checked={preferences.cognitive.showTimers}
              onChange={(checked) => updatePreference('cognitive', 'showTimers', checked)}
            />

            <ToggleOption
              label="Hide Distractions"
              description="Remove non-essential elements while learning"
              checked={preferences.cognitive.hideDistractions}
              onChange={(checked) => updatePreference('cognitive', 'hideDistractions', checked)}
            />
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="border-t border-gray-200 p-4 flex gap-3">
        <button
          onClick={handleReset}
          className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          Reset to Default
        </button>
        <div className="flex-grow" />
        <button
          onClick={handleSave}
          disabled={!hasChanges}
          className={`
            px-6 py-2 rounded-lg font-semibold
            transition-colors duration-200
            ${hasChanges
              ? 'bg-blue-500 text-white hover:bg-blue-600'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }
          `}
        >
          Save Changes
        </button>
      </div>
    </div>
  )
}

// Toggle component
function ToggleOption({
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
      className="w-full p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors flex items-center gap-3 text-left"
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
            absolute top-1 w-5 h-5 bg-white rounded-full
            transition-transform duration-200
            ${checked ? 'translate-x-6' : 'translate-x-1'}
          `}
        />
      </div>
    </button>
  )
}

// Hook to use sensory preferences
export function useSensoryPreferences(learnerId: string) {
  const [preferences, setPreferences] = useState<SensoryPreferences>(DEFAULT_PREFERENCES)

  useEffect(() => {
    const saved = localStorage.getItem(`sensory_preferences_${learnerId}`)
    if (saved) {
      setPreferences(JSON.parse(saved))
    }
  }, [learnerId])

  return preferences
}

export default SensoryProfile
