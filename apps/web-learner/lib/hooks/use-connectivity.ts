'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

export interface ConnectivityState {
  isOnline: boolean
  isReconnecting: boolean
  reconnectAttempts: number
  lastOnline: Date | null
  connectionQuality: 'good' | 'poor' | 'offline'
  syncStatus: 'synced' | 'pending' | 'syncing' | 'error'
}

interface UseConnectivityOptions {
  pingUrl?: string
  pingInterval?: number
  reconnectDelay?: number
  maxReconnectAttempts?: number
  onOnline?: () => void
  onOffline?: () => void
  onReconnect?: () => void
}

const DEFAULT_OPTIONS: Required<UseConnectivityOptions> = {
  pingUrl: '/api/health',
  pingInterval: 30000, // 30 seconds
  reconnectDelay: 5000, // 5 seconds
  maxReconnectAttempts: 3,
  onOnline: () => {},
  onOffline: () => {},
  onReconnect: () => {},
}

export function useConnectivity(options: UseConnectivityOptions = {}): ConnectivityState & {
  checkConnection: () => Promise<boolean>
  retryConnection: () => void
} {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  const [state, setState] = useState<ConnectivityState>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isReconnecting: false,
    reconnectAttempts: 0,
    lastOnline: typeof navigator !== 'undefined' && navigator.onLine ? new Date() : null,
    connectionQuality: typeof navigator !== 'undefined' && navigator.onLine ? 'good' : 'offline',
    syncStatus: 'synced',
  })

  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const checkConnection = useCallback(async (): Promise<boolean> => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      const response = await fetch(opts.pingUrl, {
        method: 'HEAD',
        cache: 'no-store',
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        setState(prev => ({
          ...prev,
          isOnline: true,
          isReconnecting: false,
          reconnectAttempts: 0,
          lastOnline: new Date(),
          connectionQuality: 'good',
        }))
        return true
      }
      return false
    } catch {
      setState(prev => ({
        ...prev,
        connectionQuality: prev.isOnline ? 'poor' : 'offline',
      }))
      return false
    }
  }, [opts.pingUrl])

  const attemptReconnect = useCallback(async () => {
    setState(prev => ({
      ...prev,
      isReconnecting: true,
      reconnectAttempts: prev.reconnectAttempts + 1,
    }))

    const isConnected = await checkConnection()

    if (isConnected) {
      opts.onReconnect()
      setState(prev => ({
        ...prev,
        isReconnecting: false,
        reconnectAttempts: 0,
        syncStatus: 'syncing',
      }))
      // Simulate sync completion
      setTimeout(() => {
        setState(prev => ({ ...prev, syncStatus: 'synced' }))
      }, 2000)
    } else {
      setState(prev => {
        if (prev.reconnectAttempts < opts.maxReconnectAttempts) {
          // Schedule another attempt with exponential backoff
          const delay = opts.reconnectDelay * Math.pow(2, prev.reconnectAttempts - 1)
          reconnectTimeoutRef.current = setTimeout(attemptReconnect, delay)
        }
        return {
          ...prev,
          isReconnecting: prev.reconnectAttempts < opts.maxReconnectAttempts,
        }
      })
    }
  }, [checkConnection, opts])

  const retryConnection = useCallback(() => {
    setState(prev => ({ ...prev, reconnectAttempts: 0 }))
    attemptReconnect()
  }, [attemptReconnect])

  useEffect(() => {
    const handleOnline = () => {
      setState(prev => ({
        ...prev,
        isOnline: true,
        lastOnline: new Date(),
        connectionQuality: 'good',
        isReconnecting: false,
        reconnectAttempts: 0,
      }))
      opts.onOnline()
      // Verify connection with a ping
      checkConnection()
    }

    const handleOffline = () => {
      setState(prev => ({
        ...prev,
        isOnline: false,
        connectionQuality: 'offline',
        syncStatus: 'pending',
      }))
      opts.onOffline()
      // Start reconnection attempts
      attemptReconnect()
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Periodic connection check
    pingIntervalRef.current = setInterval(() => {
      if (state.isOnline) {
        checkConnection()
      }
    }, opts.pingInterval)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current)
      }
    }
  }, [attemptReconnect, checkConnection, opts, state.isOnline])

  return {
    ...state,
    checkConnection,
    retryConnection,
  }
}
