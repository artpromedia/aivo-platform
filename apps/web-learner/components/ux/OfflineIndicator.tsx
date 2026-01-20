'use client'

import { useState, useEffect } from 'react'
import { useConnectivity } from '@/lib/hooks/use-connectivity'

interface OfflineIndicatorProps {
  variant?: 'badge' | 'icon' | 'minimal'
  showWhenOnline?: boolean
  className?: string
}

export function OfflineIndicator({
  variant = 'badge',
  showWhenOnline = false,
  className = '',
}: Readonly<OfflineIndicatorProps>) {
  const { isOnline, connectionQuality, syncStatus } = useConnectivity()
  const [mounted, setMounted] = useState(false)

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  // Don't show when online unless explicitly requested
  if (isOnline && !showWhenOnline) return null

  const getStatusInfo = () => {
    if (!isOnline) {
      return {
        icon: '📡',
        label: 'Offline',
        color: 'bg-amber-500',
        textColor: 'text-amber-500',
        pulse: true,
      }
    }

    if (connectionQuality === 'poor') {
      return {
        icon: '⚠️',
        label: 'Slow',
        color: 'bg-yellow-500',
        textColor: 'text-yellow-500',
        pulse: false,
      }
    }

    if (syncStatus === 'syncing') {
      return {
        icon: '🔄',
        label: 'Syncing',
        color: 'bg-blue-500',
        textColor: 'text-blue-500',
        pulse: true,
      }
    }

    if (syncStatus === 'pending') {
      return {
        icon: '💾',
        label: 'Pending',
        color: 'bg-blue-400',
        textColor: 'text-blue-400',
        pulse: false,
      }
    }

    return {
      icon: '✅',
      label: 'Online',
      color: 'bg-green-500',
      textColor: 'text-green-500',
      pulse: false,
    }
  }

  const status = getStatusInfo()

  if (variant === 'minimal') {
    return (
      <span
        className={`
          inline-block w-2 h-2 rounded-full
          ${status.color}
          ${status.pulse ? 'animate-pulse' : ''}
          ${className}
        `}
        role="status"
        aria-label={status.label}
      />
    )
  }

  if (variant === 'icon') {
    return (
      <span
        className={`
          inline-flex items-center justify-center
          w-8 h-8 rounded-full
          ${status.color} bg-opacity-20
          ${className}
        `}
        role="status"
        aria-label={status.label}
      >
        <span className={`text-sm ${status.pulse ? 'animate-pulse' : ''}`}>
          {status.icon}
        </span>
      </span>
    )
  }

  // Default: badge variant
  return (
    <span
      className={`
        inline-flex items-center gap-1.5
        px-2.5 py-1 rounded-full
        ${status.color} bg-opacity-20
        ${status.textColor}
        text-xs font-medium
        ${className}
      `}
      role="status"
    >
      <span className={`text-sm ${status.pulse ? 'animate-pulse' : ''}`}>
        {status.icon}
      </span>
      <span>{status.label}</span>
    </span>
  )
}

export default OfflineIndicator
