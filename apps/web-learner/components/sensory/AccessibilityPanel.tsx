'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { SensoryPreferences, useSensoryPreferences } from './SensoryProfile'

interface AccessibilityPanelProps {
  learnerId: string
  position?: 'left' | 'right'
  defaultExpanded?: boolean
  showFloatingButton?: boolean
  onPreferenceChange?: (preferences: Partial<SensoryPreferences>) => void
  className?: string
}

interface QuickSetting {
  id: string
  label: string
  icon: string
  description: string
  category: keyof SensoryPreferences
  key: string
  type: 'toggle' | 'cycle'
  options?: { value: string; label: string }[]
}

const QUICK_SETTINGS: QuickSetting[] = [
  {
    id: 'fontSize',
    label: 'Text Size',
    icon: '🔤',
    description: 'Make text bigger or smaller',
    category: 'visual',
    key: 'fontSize',
    type: 'cycle',
    options: [
      { value: 'small', label: 'Small' },
      { value: 'medium', label: 'Medium' },
      { value: 'large', label: 'Large' },
      { value: 'extra-large', label: 'Extra Large' },
    ],
  },
  {
    id: 'contrast',
    label: 'Contrast',
    icon: '🎨',
    description: 'Adjust color contrast',
    category: 'visual',
    key: 'contrast',
    type: 'cycle',
    options: [
      { value: 'normal', label: 'Normal' },
      { value: 'high', label: 'High' },
      { value: 'low', label: 'Low' },
    ],
  },
  {
    id: 'reduceMotion',
    label: 'Reduce Motion',
    icon: '✨',
    description: 'Less animations',
    category: 'visual',
    key: 'reduceMotion',
    type: 'toggle',
  },
  {
    id: 'textToSpeech',
    label: 'Read Aloud',
    icon: '🔊',
    description: 'Text to speech',
    category: 'audio',
    key: 'textToSpeech',
    type: 'toggle',
  },
  {
    id: 'soundEffects',
    label: 'Sound Effects',
    icon: '🎵',
    description: 'Fun sounds',
    category: 'audio',
    key: 'soundEffects',
    type: 'toggle',
  },
  {
    id: 'hideDistractions',
    label: 'Focus Mode',
    icon: '🎯',
    description: 'Hide extra stuff',
    category: 'cognitive',
    key: 'hideDistractions',
    type: 'toggle',
  },
]

export function AccessibilityPanel({
  learnerId,
  position = 'right',
  defaultExpanded = false,
  showFloatingButton = true,
  onPreferenceChange,
  className = '',
}: Readonly<AccessibilityPanelProps>) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const [localPreferences, setLocalPreferences] = useState<SensoryPreferences | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const savedPreferences = useSensoryPreferences(learnerId)

  // Initialize local state from saved preferences
  useEffect(() => {
    setLocalPreferences(savedPreferences)
  }, [savedPreferences])

  // Close panel on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsExpanded(false)
      }
    }

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isExpanded])

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsExpanded(false)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  const updatePreference = useCallback(<T extends keyof SensoryPreferences>(
    category: T,
    key: string,
    value: unknown
  ) => {
    setLocalPreferences(prev => {
      if (!prev) return prev

      const updated = {
        ...prev,
        [category]: {
          ...prev[category],
          [key]: value,
        },
      }

      // Save to localStorage
      localStorage.setItem(`sensory_preferences_${learnerId}`, JSON.stringify(updated))

      // Notify parent
      onPreferenceChange?.({ [category]: { [key]: value } } as Partial<SensoryPreferences>)

      // Apply to document
      applyPreference(category, key, value)

      return updated
    })
  }, [learnerId, onPreferenceChange])

  const applyPreference = (category: string, key: string, value: unknown) => {
    const root = document.documentElement

    if (category === 'visual') {
      if (key === 'fontSize') {
        root.style.setProperty('--font-size-scale', {
          'small': '0.875',
          'medium': '1',
          'large': '1.125',
          'extra-large': '1.25',
        }[value as string] || '1')
      }
      if (key === 'contrast') {
        root.dataset.contrast = value as string
      }
      if (key === 'reduceMotion') {
        if (value) {
          root.classList.add('reduce-motion')
        } else {
          root.classList.remove('reduce-motion')
        }
      }
    }

    if (category === 'cognitive' && key === 'hideDistractions') {
      if (value) {
        root.classList.add('focus-mode')
      } else {
        root.classList.remove('focus-mode')
      }
    }
  }

  const getSettingValue = (setting: QuickSetting) => {
    if (!localPreferences) return null
    const categoryPrefs = localPreferences[setting.category]
    return (categoryPrefs as Record<string, unknown>)[setting.key]
  }

  const handleSettingClick = (setting: QuickSetting) => {
    const currentValue = getSettingValue(setting)

    if (setting.type === 'toggle') {
      updatePreference(setting.category, setting.key, !currentValue)
    } else if (setting.type === 'cycle' && setting.options) {
      const currentIndex = setting.options.findIndex(opt => opt.value === currentValue)
      const nextIndex = (currentIndex + 1) % setting.options.length
      updatePreference(setting.category, setting.key, setting.options[nextIndex].value)
    }
  }

  const getSettingDisplay = (setting: QuickSetting) => {
    const value = getSettingValue(setting)

    if (setting.type === 'toggle') {
      return value ? 'On' : 'Off'
    }

    if (setting.options) {
      const option = setting.options.find(opt => opt.value === value)
      return option?.label || value
    }

    return String(value)
  }

  const positionClasses = position === 'right'
    ? 'right-4'
    : 'left-4'

  if (!localPreferences) return null

  return (
    <div
      ref={panelRef}
      className={`fixed bottom-20 ${positionClasses} z-40 ${className}`}
    >
      {/* Panel content */}
      {isExpanded && (
        <div className="mb-3 bg-white rounded-2xl shadow-xl w-72 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-500 to-blue-500 p-4 text-white">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <span>♿</span>
              Quick Settings
            </h3>
            <p className="text-sm opacity-90">Adjust how things look and sound</p>
          </div>

          {/* Settings list */}
          <div className="p-3 space-y-2 max-h-80 overflow-y-auto">
            {QUICK_SETTINGS.map(setting => {
              const isActive = setting.type === 'toggle' && getSettingValue(setting)

              return (
                <button
                  key={setting.id}
                  onClick={() => handleSettingClick(setting)}
                  className={`
                    w-full p-3 rounded-xl text-left
                    flex items-center gap-3
                    transition-all duration-200
                    ${isActive
                      ? 'bg-blue-100 border-2 border-blue-400'
                      : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                    }
                  `}
                >
                  <span className="text-2xl">{setting.icon}</span>
                  <div className="flex-grow min-w-0">
                    <p className="font-medium text-sm">{setting.label}</p>
                    <p className="text-xs text-gray-500 truncate">{setting.description}</p>
                  </div>
                  <div
                    className={`
                      px-2 py-1 rounded-lg text-xs font-medium
                      ${isActive
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-700'
                      }
                    `}
                  >
                    {getSettingDisplay(setting)}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Footer with link to full settings */}
          <div className="p-3 border-t border-gray-200">
            <a
              href="/settings/accessibility"
              className="block text-center text-sm text-blue-500 hover:text-blue-700 font-medium"
            >
              Open Full Settings →
            </a>
          </div>
        </div>
      )}

      {/* Floating button */}
      {showFloatingButton && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`
            w-14 h-14 rounded-full
            bg-gradient-to-r from-purple-500 to-blue-500
            text-white text-2xl
            shadow-lg hover:shadow-xl
            transition-all duration-200
            hover:scale-110
            flex items-center justify-center
            ${isExpanded ? 'rotate-45' : ''}
          `}
          aria-label="Accessibility settings"
          aria-expanded={isExpanded}
        >
          {isExpanded ? '✕' : '♿'}
        </button>
      )}
    </div>
  )
}

// Hook to check if accessibility features are enabled
export function useAccessibilityStatus(learnerId: string) {
  const preferences = useSensoryPreferences(learnerId)

  return {
    hasLargeText: preferences.visual.fontSize === 'large' || preferences.visual.fontSize === 'extra-large',
    hasHighContrast: preferences.visual.contrast === 'high',
    hasReducedMotion: preferences.visual.reduceMotion,
    hasTextToSpeech: preferences.audio.textToSpeech,
    hasFocusMode: preferences.cognitive.hideDistractions,
  }
}

// Inline accessibility toolbar (can be embedded in header)
export function AccessibilityToolbar({
  learnerId,
  compact = false,
  className = '',
}: Readonly<{
  learnerId: string
  compact?: boolean
  className?: string
}>) {
  const [preferences, setPreferences] = useState<SensoryPreferences | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem(`sensory_preferences_${learnerId}`)
    if (saved) {
      setPreferences(JSON.parse(saved))
    }
  }, [learnerId])

  const toggle = useCallback((category: keyof SensoryPreferences, key: string) => {
    setPreferences(prev => {
      if (!prev) return prev

      const currentValue = (prev[category] as Record<string, unknown>)[key]
      const updated = {
        ...prev,
        [category]: {
          ...prev[category],
          [key]: !currentValue,
        },
      }

      localStorage.setItem(`sensory_preferences_${learnerId}`, JSON.stringify(updated))
      return updated
    })
  }, [learnerId])

  if (!preferences) return null

  const quickToggles = [
    { icon: '🔤', active: preferences.visual.fontSize !== 'medium', label: 'Large text', category: 'visual' as const, key: 'fontSize' },
    { icon: '🎨', active: preferences.visual.contrast === 'high', label: 'High contrast', category: 'visual' as const, key: 'contrast' },
    { icon: '✨', active: preferences.visual.reduceMotion, label: 'Less motion', category: 'visual' as const, key: 'reduceMotion' },
    { icon: '🔊', active: preferences.audio.textToSpeech, label: 'Read aloud', category: 'audio' as const, key: 'textToSpeech' },
  ]

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {quickToggles.map(item => (
        <button
          key={item.key}
          onClick={() => toggle(item.category, item.key)}
          className={`
            ${compact ? 'w-8 h-8 text-sm' : 'w-10 h-10 text-lg'}
            rounded-full
            transition-all duration-200
            ${item.active
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 hover:bg-gray-200'
            }
          `}
          title={item.label}
          aria-label={item.label}
          aria-pressed={item.active}
        >
          {item.icon}
        </button>
      ))}
    </div>
  )
}

export default AccessibilityPanel
