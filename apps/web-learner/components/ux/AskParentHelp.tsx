'use client'

import { useState, useCallback, useEffect } from 'react'

interface HelpRequest {
  learnerId: string
  learnerName?: string
  context: string
  currentActivity?: string
  timestamp: Date
  message?: string
}

interface AskParentHelpProps {
  learnerId: string
  learnerName?: string
  currentActivity?: string
  currentSubject?: string
  onSendRequest?: (request: HelpRequest) => Promise<void>
  cooldownMinutes?: number
  position?: 'bottom-right' | 'bottom-left'
  className?: string
}

const API_BASE = process.env.NEXT_PUBLIC_NOTIFICATION_API_URL || 'http://localhost:3006/api/notifications'

async function sendParentNotification(request: HelpRequest): Promise<void> {
  const response = await fetch(`${API_BASE}/parent-help`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    throw new Error('Failed to send notification')
  }
}

export function AskParentHelp({
  learnerId,
  learnerName,
  currentActivity,
  currentSubject,
  onSendRequest,
  cooldownMinutes = 5,
  position = 'bottom-right',
  className = '',
}: Readonly<AskParentHelpProps>) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [cooldownRemaining, setCooldownRemaining] = useState(0)
  const [customMessage, setCustomMessage] = useState('')
  const [selectedReason, setSelectedReason] = useState<string | null>(null)

  const helpReasons = [
    { id: 'stuck', label: "I'm stuck", emoji: '🤔' },
    { id: 'confused', label: "I don't understand", emoji: '😕' },
    { id: 'break', label: 'I need a break', emoji: '😓' },
    { id: 'other', label: 'Something else', emoji: '💬' },
  ]

  // Check for existing cooldown on mount
  useEffect(() => {
    const lastRequest = localStorage.getItem(`parentHelp_lastRequest_${learnerId}`)
    if (lastRequest) {
      const lastTime = new Date(lastRequest).getTime()
      const now = Date.now()
      const cooldownMs = cooldownMinutes * 60 * 1000
      const remaining = Math.max(0, cooldownMs - (now - lastTime))
      if (remaining > 0) {
        setCooldownRemaining(Math.ceil(remaining / 1000))
      }
    }
  }, [learnerId, cooldownMinutes])

  // Countdown timer
  useEffect(() => {
    if (cooldownRemaining <= 0) return

    const timer = setInterval(() => {
      setCooldownRemaining(prev => Math.max(0, prev - 1))
    }, 1000)

    return () => clearInterval(timer)
  }, [cooldownRemaining])

  const handleSendRequest = useCallback(async () => {
    if (cooldownRemaining > 0 || !selectedReason) return

    const context = helpReasons.find(r => r.id === selectedReason)?.label || 'Help needed'
    const request: HelpRequest = {
      learnerId,
      learnerName,
      context: `${context}${currentSubject ? ` - ${currentSubject}` : ''}`,
      currentActivity,
      timestamp: new Date(),
      message: customMessage || undefined,
    }

    setIsSending(true)
    try {
      if (onSendRequest) {
        await onSendRequest(request)
      } else {
        await sendParentNotification(request)
      }

      // Save last request time
      localStorage.setItem(`parentHelp_lastRequest_${learnerId}`, new Date().toISOString())
      setCooldownRemaining(cooldownMinutes * 60)

      // Show confirmation
      setShowConfirmation(true)
      setIsExpanded(false)
      setSelectedReason(null)
      setCustomMessage('')

      // Hide confirmation after delay
      setTimeout(() => {
        setShowConfirmation(false)
      }, 4000)
    } catch (error) {
      console.error('Failed to send help request:', error)
      alert('Could not send the message. Please try again.')
    } finally {
      setIsSending(false)
    }
  }, [
    cooldownRemaining,
    selectedReason,
    learnerId,
    learnerName,
    currentActivity,
    currentSubject,
    customMessage,
    onSendRequest,
    cooldownMinutes,
  ])

  const positionClasses = position === 'bottom-right'
    ? 'bottom-4 right-4'
    : 'bottom-4 left-4'

  const formatCooldown = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
  }

  // Confirmation popup
  if (showConfirmation) {
    return (
      <div
        className={`
          fixed ${positionClasses} z-40
          ${className}
        `}
      >
        <div className="bg-green-500 text-white rounded-2xl shadow-lg p-4 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4">
          <span className="text-2xl">✅</span>
          <div>
            <p className="font-bold">Message sent!</p>
            <p className="text-sm opacity-90">Your parent will be notified soon.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`
        fixed ${positionClasses} z-40
        ${className}
      `}
    >
      {/* Expanded panel */}
      {isExpanded && (
        <div className="mb-3 bg-white rounded-2xl shadow-xl p-4 w-72 animate-in fade-in slide-in-from-bottom-4">
          <h3 className="font-bold text-lg text-gray-900 mb-3 flex items-center gap-2">
            <span>🆘</span>
            Ask for Help
          </h3>

          {/* Current context */}
          {(currentActivity || currentSubject) && (
            <div className="bg-gray-100 rounded-lg p-2 mb-3 text-sm text-gray-600">
              <p className="font-medium">Working on:</p>
              <p>{currentSubject && `${currentSubject} - `}{currentActivity || 'General'}</p>
            </div>
          )}

          {/* Reason selection */}
          <p className="text-sm text-gray-600 mb-2">What do you need help with?</p>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {helpReasons.map(reason => (
              <button
                key={reason.id}
                onClick={() => setSelectedReason(reason.id)}
                className={`
                  p-2 rounded-lg text-sm font-medium
                  transition-all duration-200
                  flex flex-col items-center gap-1
                  ${selectedReason === reason.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }
                `}
              >
                <span className="text-lg">{reason.emoji}</span>
                <span>{reason.label}</span>
              </button>
            ))}
          </div>

          {/* Custom message */}
          {selectedReason === 'other' && (
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Tell them what you need..."
              className="
                w-full p-2 rounded-lg border border-gray-300
                text-sm resize-none
                focus:outline-none focus:ring-2 focus:ring-blue-500
                mb-3
              "
              rows={2}
              maxLength={200}
            />
          )}

          {/* Send button */}
          <button
            onClick={handleSendRequest}
            disabled={isSending || !selectedReason || cooldownRemaining > 0}
            className="
              w-full py-2.5 rounded-xl
              bg-blue-500 hover:bg-blue-600
              text-white font-semibold
              transition-colors duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
              flex items-center justify-center gap-2
            "
          >
            {isSending ? (
              <>
                <span className="animate-spin">⏳</span>
                Sending...
              </>
            ) : cooldownRemaining > 0 ? (
              <>
                <span>⏰</span>
                Wait {formatCooldown(cooldownRemaining)}
              </>
            ) : (
              <>
                <span>📨</span>
                Send to Parent
              </>
            )}
          </button>

          {/* Close button */}
          <button
            onClick={() => {
              setIsExpanded(false)
              setSelectedReason(null)
              setCustomMessage('')
            }}
            className="
              w-full mt-2 py-2 rounded-xl
              text-gray-500 font-medium
              hover:bg-gray-100
              transition-colors duration-200
            "
          >
            Cancel
          </button>
        </div>
      )}

      {/* Floating help button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        disabled={cooldownRemaining > 0}
        className={`
          w-14 h-14 rounded-full
          shadow-lg hover:shadow-xl
          transition-all duration-200
          flex items-center justify-center
          ${cooldownRemaining > 0
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-500 hover:bg-blue-600 hover:scale-110'
          }
          ${isExpanded ? 'scale-90' : ''}
        `}
        aria-label="Ask parent for help"
      >
        <span className="text-2xl">
          {cooldownRemaining > 0 ? '⏰' : isExpanded ? '✕' : '🆘'}
        </span>
      </button>

      {/* Cooldown indicator */}
      {cooldownRemaining > 0 && !isExpanded && (
        <div className="absolute -top-1 -right-1 bg-gray-600 text-white text-xs rounded-full px-1.5 py-0.5">
          {formatCooldown(cooldownRemaining)}
        </div>
      )}
    </div>
  )
}

export default AskParentHelp
