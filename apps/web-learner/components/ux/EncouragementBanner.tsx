'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'

type MessageContext = 'achievement' | 'struggle' | 'milestone' | 'return' | 'streak' | 'general'

interface EncouragementMessage {
  text: string
  emoji: string
  context: MessageContext
}

interface EncouragementBannerProps {
  learnerName?: string
  context?: MessageContext
  customMessage?: string
  streakDays?: number
  achievementName?: string
  milestoneName?: string
  autoShow?: boolean
  showDuration?: number
  onDismiss?: () => void
  className?: string
}

const MESSAGES: Record<MessageContext, EncouragementMessage[]> = {
  achievement: [
    { text: "Amazing work! You did it!", emoji: "🏆", context: "achievement" },
    { text: "Wow! You're incredible!", emoji: "⭐", context: "achievement" },
    { text: "You should be so proud!", emoji: "🎉", context: "achievement" },
    { text: "That was awesome!", emoji: "🌟", context: "achievement" },
  ],
  struggle: [
    { text: "Learning takes time, and that's okay!", emoji: "💪", context: "struggle" },
    { text: "Keep going! You're doing great!", emoji: "🌈", context: "struggle" },
    { text: "Every try makes you stronger!", emoji: "🚀", context: "struggle" },
    { text: "Mistakes help us learn!", emoji: "🌱", context: "struggle" },
    { text: "You've got this! Take your time.", emoji: "🤗", context: "struggle" },
  ],
  milestone: [
    { text: "What a big step forward!", emoji: "🎯", context: "milestone" },
    { text: "Look how far you've come!", emoji: "📈", context: "milestone" },
    { text: "You're making amazing progress!", emoji: "🌟", context: "milestone" },
  ],
  return: [
    { text: "Welcome back! Ready to learn?", emoji: "👋", context: "return" },
    { text: "Great to see you again!", emoji: "😊", context: "return" },
    { text: "Let's pick up where we left off!", emoji: "📚", context: "return" },
  ],
  streak: [
    { text: "You're on fire! Keep it up!", emoji: "🔥", context: "streak" },
    { text: "Wow, what a streak!", emoji: "⚡", context: "streak" },
    { text: "Consistency is your superpower!", emoji: "💫", context: "streak" },
  ],
  general: [
    { text: "You're doing great!", emoji: "✨", context: "general" },
    { text: "Every step counts!", emoji: "👣", context: "general" },
    { text: "Believe in yourself!", emoji: "💖", context: "general" },
    { text: "You make learning fun!", emoji: "🎨", context: "general" },
  ],
}

export function EncouragementBanner({
  learnerName,
  context = 'general',
  customMessage,
  streakDays,
  achievementName,
  milestoneName,
  autoShow = true,
  showDuration = 5000,
  onDismiss,
  className = '',
}: Readonly<EncouragementBannerProps>) {
  const [isVisible, setIsVisible] = useState(autoShow)
  const [isExiting, setIsExiting] = useState(false)

  // Select a random message from the appropriate context
  const selectedMessage = useMemo(() => {
    const messages = MESSAGES[context]
    return messages[Math.floor(Math.random() * messages.length)]
  }, [context])

  // Build the full message
  const fullMessage = useMemo(() => {
    if (customMessage) return customMessage

    let message = selectedMessage.text

    if (learnerName) {
      message = message.replace('You', learnerName)
    }

    if (context === 'streak' && streakDays) {
      message = `${streakDays} days! ${message}`
    }

    if (context === 'achievement' && achievementName) {
      message = `${message} You earned: ${achievementName}`
    }

    if (context === 'milestone' && milestoneName) {
      message = `${milestoneName}: ${message}`
    }

    return message
  }, [customMessage, selectedMessage.text, learnerName, context, streakDays, achievementName, milestoneName])

  const handleDismiss = useCallback(() => {
    setIsExiting(true)
    setTimeout(() => {
      setIsVisible(false)
      setIsExiting(false)
      onDismiss?.()
    }, 300)
  }, [onDismiss])

  // Auto-dismiss after duration
  useEffect(() => {
    if (!isVisible || showDuration <= 0) return

    const timer = setTimeout(handleDismiss, showDuration)
    return () => clearTimeout(timer)
  }, [isVisible, showDuration, handleDismiss])

  // Allow programmatic showing
  useEffect(() => {
    if (autoShow) {
      setIsVisible(true)
    }
  }, [autoShow, context])

  if (!isVisible) return null

  const getBgColor = () => {
    switch (context) {
      case 'achievement':
        return 'bg-gradient-to-r from-yellow-400 to-amber-500'
      case 'struggle':
        return 'bg-gradient-to-r from-purple-400 to-pink-500'
      case 'milestone':
        return 'bg-gradient-to-r from-green-400 to-emerald-500'
      case 'return':
        return 'bg-gradient-to-r from-blue-400 to-cyan-500'
      case 'streak':
        return 'bg-gradient-to-r from-orange-400 to-red-500'
      default:
        return 'bg-gradient-to-r from-indigo-400 to-purple-500'
    }
  }

  return (
    <div
      className={`
        fixed top-4 left-1/2 -translate-x-1/2 z-50
        max-w-md w-full mx-4
        transition-all duration-300 ease-out
        ${isExiting ? 'opacity-0 -translate-y-4' : 'opacity-100 translate-y-0'}
        ${className}
      `}
      role="status"
      aria-live="polite"
    >
      <div
        className={`
          ${getBgColor()}
          text-white
          rounded-2xl shadow-lg
          p-4 px-5
          flex items-center gap-3
          transform transition-transform
          hover:scale-[1.02]
        `}
      >
        <span
          className="text-3xl animate-bounce"
          role="img"
          aria-hidden="true"
        >
          {selectedMessage.emoji}
        </span>

        <div className="flex-grow min-w-0">
          <p className="font-bold text-lg leading-tight">
            {fullMessage}
          </p>
          {learnerName && (
            <p className="text-sm opacity-90 mt-0.5">
              Keep being awesome, {learnerName}!
            </p>
          )}
        </div>

        <button
          onClick={handleDismiss}
          className="
            p-2 rounded-full
            hover:bg-white/20
            transition-colors duration-200
            focus:outline-none focus:ring-2 focus:ring-white/50
            flex-shrink-0
          "
          aria-label="Dismiss message"
        >
          <span className="text-xl leading-none">×</span>
        </button>
      </div>
    </div>
  )
}

// Hook to programmatically show encouragement
export function useEncouragement() {
  const [config, setConfig] = useState<Omit<EncouragementBannerProps, 'autoShow'> | null>(null)

  const showEncouragement = useCallback((props: Omit<EncouragementBannerProps, 'autoShow'>) => {
    setConfig(props)
  }, [])

  const hideEncouragement = useCallback(() => {
    setConfig(null)
  }, [])

  const EncouragementComponent = config ? (
    <EncouragementBanner
      {...config}
      autoShow={true}
      onDismiss={() => {
        config.onDismiss?.()
        hideEncouragement()
      }}
    />
  ) : null

  return {
    showEncouragement,
    hideEncouragement,
    EncouragementComponent,
  }
}

export default EncouragementBanner
