/**
 * Connection Status Indicator
 *
 * Displays the current WebSocket connection status with visual feedback.
 */

import React from 'react';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ConnectionStatus } from '@/hooks/use-websocket';

interface ConnectionStatusIndicatorProps {
  status: ConnectionStatus;
  className?: string;
  showLabel?: boolean;
}

const statusConfig: Record<
  ConnectionStatus,
  { icon: React.ReactNode; label: string; className: string }
> = {
  connected: {
    icon: <Wifi className="h-4 w-4" />,
    label: 'Connected',
    className: 'text-green-600 bg-green-100',
  },
  connecting: {
    icon: <Loader2 className="h-4 w-4 animate-spin" />,
    label: 'Connecting...',
    className: 'text-yellow-600 bg-yellow-100',
  },
  disconnected: {
    icon: <WifiOff className="h-4 w-4" />,
    label: 'Disconnected',
    className: 'text-gray-600 bg-gray-100',
  },
  error: {
    icon: <WifiOff className="h-4 w-4" />,
    label: 'Connection Error',
    className: 'text-red-600 bg-red-100',
  },
};

/**
 * Connection Status Indicator Component
 */
export function ConnectionStatusIndicator({
  status,
  className,
  showLabel = false,
}: ConnectionStatusIndicatorProps) {
  const config = statusConfig[status];

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
        config.className,
        className
      )}
      title={config.label}
    >
      {config.icon}
      {showLabel && <span>{config.label}</span>}
    </div>
  );
}
