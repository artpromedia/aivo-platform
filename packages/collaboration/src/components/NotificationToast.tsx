/**
 * NotificationToast Component & Hook
 *
 * Real-time notification toast system with:
 * - Multiple notification types
 * - Auto-dismiss with progress
 * - Stack management
 * - Action buttons
 * - Persistence options
 */

'use client';

import type { CSSProperties } from 'react';
import React, {
  createContext,
  useContext,
  useCallback,
  useState,
  useEffect,
  useRef,
  useMemo,
} from 'react';
import { createPortal } from 'react-dom';

// Types
export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'message' | 'activity';

export interface NotificationAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number; // ms, 0 for persistent
  actions?: NotificationAction[];
  dismissible?: boolean;
  icon?: React.ReactNode;
  avatar?: {
    src?: string;
    name: string;
  };
  timestamp?: Date;
  progress?: boolean; // Show progress bar
  sound?: boolean; // Play notification sound
}

// Type aliases for cleaner options
type NotifyOptions = Partial<Omit<Notification, 'id' | 'title'>>;
type TypedNotifyOptions = Partial<Omit<Notification, 'id' | 'title' | 'type'>>;
type MessageOptions = Partial<Omit<Notification, 'id' | 'title' | 'type' | 'message' | 'avatar'>>;

interface NotificationContextValue {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => string;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

// Icons
const icons = {
  info: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-1-11v6h2v-6h-2zm0-4v2h2V7h-2z" />
    </svg>
  ),
  success: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-.997-6l7.07-7.071-1.414-1.414-5.656 5.657-2.829-2.829-1.414 1.414L11.003 16z" />
    </svg>
  ),
  warning: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-1-7v2h2v-2h-2zm0-8v6h2V7h-2z" />
    </svg>
  ),
  error: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-1-7v2h2v-2h-2zm0-8v6h2V7h-2z" />
    </svg>
  ),
  message: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M6.455 19L2 22.5V4a1 1 0 0 1 1-1h18a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H6.455zM7 10v2h2v-2H7zm4 0v2h2v-2h-2zm4 0v2h2v-2h-2z" />
    </svg>
  ),
  activity: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2zm0 5a1 1 0 0 0-1 1v4.586l-2.707 2.707a1 1 0 0 0 1.414 1.414l3-3A1 1 0 0 0 13 13V8a1 1 0 0 0-1-1z" />
    </svg>
  ),
  close: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
      <path d="M12 10.586l4.95-4.95 1.414 1.414-4.95 4.95 4.95 4.95-1.414 1.414-4.95-4.95-4.95 4.95-1.414-1.414 4.95-4.95-4.95-4.95L7.05 5.636l4.95 4.95z" />
    </svg>
  ),
};

// Context
const NotificationContext = createContext<NotificationContextValue | null>(null);

// Helper
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function getInitials(name: string): string {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts.at(0);
  if (parts.length === 1) return first?.charAt(0).toUpperCase() ?? '?';
  const last = parts.at(-1);
  return ((first?.charAt(0) ?? '') + (last?.charAt(0) ?? '')).toUpperCase();
}

// Individual Toast Component
interface ToastProps {
  notification: Notification;
  onDismiss: () => void;
}

const Toast: React.FC<ToastProps> = ({ notification, onDismiss }) => {
  const [progress, setProgress] = useState(100);
  const [isHovered, setIsHovered] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const remainingRef = useRef<number>(notification.duration || 5000);

  const duration = notification.duration ?? 5000;
  const showProgress = notification.progress !== false && duration > 0;

  // Color schemes
  const colors: Record<
    NotificationType,
    { bg: string; border: string; icon: string; text: string }
  > = {
    info: { bg: '#EFF6FF', border: '#3B82F6', icon: '#3B82F6', text: '#1E40AF' },
    success: { bg: '#F0FDF4', border: '#22C55E', icon: '#22C55E', text: '#166534' },
    warning: { bg: '#FFFBEB', border: '#F59E0B', icon: '#F59E0B', text: '#B45309' },
    error: { bg: '#FEF2F2', border: '#EF4444', icon: '#EF4444', text: '#B91C1C' },
    message: { bg: '#F5F3FF', border: '#8B5CF6', icon: '#8B5CF6', text: '#5B21B6' },
    activity: { bg: '#F0F9FF', border: '#0EA5E9', icon: '#0EA5E9', text: '#0369A1' },
  };

  const scheme = colors[notification.type];

  // Auto-dismiss timer
  useEffect(() => {
    if (duration === 0) return;

    const tick = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, remainingRef.current - elapsed);
      const percent = (remaining / duration) * 100;
      setProgress(percent);

      if (remaining <= 0) {
        onDismiss();
      }
    };

    if (!isHovered) {
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(tick, 50);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        remainingRef.current = Math.max(
          0,
          remainingRef.current - (Date.now() - startTimeRef.current)
        );
      }
    };
  }, [duration, isHovered, onDismiss]);

  // Play sound
  useEffect(() => {
    if (notification.sound) {
      // Use Web Audio API for notification sound
      try {
        // Safari compatibility
        const win = globalThis as unknown as { webkitAudioContext?: typeof AudioContext };
        const AudioContextClass = win.webkitAudioContext ?? globalThis.AudioContext;
        const audioContext = new AudioContextClass();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = notification.type === 'error' ? 300 : 800;
        oscillator.type = 'sine';
        gainNode.gain.value = 0.1;

        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.1);
      } catch {
        // Audio not supported
      }
    }
  }, [notification.sound, notification.type]);

  const containerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    width: 360,
    backgroundColor: scheme.bg,
    borderLeft: `4px solid ${scheme.border}`,
    borderRadius: 8,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    overflow: 'hidden',
    animation: 'slideIn 0.3s ease-out',
  };

  const contentStyle: CSSProperties = {
    display: 'flex',
    padding: 16,
    gap: 12,
  };

  const iconContainerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    color: scheme.icon,
    flexShrink: 0,
  };

  const bodyStyle: CSSProperties = {
    flex: 1,
    minWidth: 0,
  };

  const titleStyle: CSSProperties = {
    margin: 0,
    fontSize: 14,
    fontWeight: 600,
    color: scheme.text,
    lineHeight: 1.4,
  };

  const messageStyle: CSSProperties = {
    margin: '4px 0 0',
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 1.5,
  };

  const actionsStyle: CSSProperties = {
    display: 'flex',
    gap: 8,
    marginTop: 12,
  };

  const closeButtonStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
    border: 'none',
    backgroundColor: 'transparent',
    color: '#9CA3AF',
    cursor: 'pointer',
    borderRadius: 4,
    flexShrink: 0,
  };

  const progressStyle: CSSProperties = {
    height: 3,
    backgroundColor: scheme.border,
    width: `${progress}%`,
    transition: 'width 50ms linear',
  };

  const avatarStyle: CSSProperties = {
    width: 36,
    height: 36,
    borderRadius: '50%',
    backgroundColor: scheme.border,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: 12,
    fontWeight: 600,
    flexShrink: 0,
    overflow: 'hidden',
  };

  return (
    <div
      style={containerStyle}
      onMouseEnter={() => {
        setIsHovered(true);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
      }}
      role="alert"
    >
      <div style={contentStyle}>
        {/* Icon or Avatar */}
        {notification.avatar ? (
          <div style={avatarStyle}>
            {notification.avatar.src ? (
              <img
                src={notification.avatar.src}
                alt={notification.avatar.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              getInitials(notification.avatar.name)
            )}
          </div>
        ) : (
          <div style={iconContainerStyle}>{notification.icon || icons[notification.type]}</div>
        )}

        {/* Body */}
        <div style={bodyStyle}>
          <h4 style={titleStyle}>{notification.title}</h4>
          {notification.message && <p style={messageStyle}>{notification.message}</p>}

          {/* Actions */}
          {notification.actions && notification.actions.length > 0 && (
            <div style={actionsStyle}>
              {notification.actions.map((action) => (
                <button
                  key={action.label}
                  onClick={() => {
                    action.onClick();
                    onDismiss();
                  }}
                  style={{
                    padding: '6px 12px',
                    fontSize: 12,
                    fontWeight: 500,
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer',
                    backgroundColor: action.variant === 'primary' ? scheme.border : '#E5E7EB',
                    color: action.variant === 'primary' ? 'white' : '#374151',
                  }}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Close button */}
        {notification.dismissible !== false && (
          <button onClick={onDismiss} style={closeButtonStyle} aria-label="Dismiss notification">
            {icons.close}
          </button>
        )}
      </div>

      {/* Progress bar */}
      {showProgress && (
        <div style={{ height: 3, backgroundColor: 'rgba(0,0,0,0.1)' }}>
          <div style={progressStyle} />
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

// Toast Container
interface ToastContainerProps {
  notifications: Notification[];
  onDismiss: (id: string) => void;
  position?:
    | 'top-right'
    | 'top-left'
    | 'bottom-right'
    | 'bottom-left'
    | 'top-center'
    | 'bottom-center';
  maxVisible?: number;
}

const ToastContainer: React.FC<ToastContainerProps> = ({
  notifications,
  onDismiss,
  position = 'top-right',
  maxVisible = 5,
}) => {
  const visibleNotifications = notifications.slice(-maxVisible);

  const getPositionStyles = (): CSSProperties => {
    const base: CSSProperties = {
      position: 'fixed',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      padding: 16,
      pointerEvents: 'none',
    };

    switch (position) {
      case 'top-right':
        return { ...base, top: 0, right: 0 };
      case 'top-left':
        return { ...base, top: 0, left: 0 };
      case 'bottom-right':
        return { ...base, bottom: 0, right: 0, flexDirection: 'column-reverse' };
      case 'bottom-left':
        return { ...base, bottom: 0, left: 0, flexDirection: 'column-reverse' };
      case 'top-center':
        return { ...base, top: 0, left: '50%', transform: 'translateX(-50%)' };
      case 'bottom-center':
        return {
          ...base,
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          flexDirection: 'column-reverse',
        };
      default:
        return base;
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div style={getPositionStyles()}>
      {visibleNotifications.map((notification) => (
        <div key={notification.id} style={{ pointerEvents: 'auto' }}>
          <Toast
            notification={notification}
            onDismiss={() => {
              onDismiss(notification.id);
            }}
          />
        </div>
      ))}
    </div>,
    document.body
  );
};

// Provider
interface NotificationProviderProps {
  children: React.ReactNode;
  position?: ToastContainerProps['position'];
  maxVisible?: number;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
  position = 'top-right',
  maxVisible = 5,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((notification: Omit<Notification, 'id'>): string => {
    const id = generateId();
    const newNotification: Notification = {
      ...notification,
      id,
      timestamp: new Date(),
    };

    setNotifications((prev) => [...prev, newNotification]);
    return id;
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const contextValue = useMemo(
    () => ({ notifications, addNotification, removeNotification, clearAll }),
    [notifications, addNotification, removeNotification, clearAll]
  );

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      <ToastContainer
        notifications={notifications}
        onDismiss={removeNotification}
        position={position}
        maxVisible={maxVisible}
      />
    </NotificationContext.Provider>
  );
};

// Hook
export function useNotifications() {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }

  const { addNotification, removeNotification, clearAll, notifications } = context;

  // Convenience methods
  const notify = useCallback(
    (title: string, options?: NotifyOptions) => {
      return addNotification({ title, type: 'info', ...options });
    },
    [addNotification]
  );

  const success = useCallback(
    (title: string, options?: TypedNotifyOptions) => {
      return addNotification({ title, type: 'success', ...options });
    },
    [addNotification]
  );

  const error = useCallback(
    (title: string, options?: TypedNotifyOptions) => {
      return addNotification({ title, type: 'error', duration: 0, ...options });
    },
    [addNotification]
  );

  const warning = useCallback(
    (title: string, options?: TypedNotifyOptions) => {
      return addNotification({ title, type: 'warning', ...options });
    },
    [addNotification]
  );

  const message = useCallback(
    (sender: { name: string; avatar?: string }, content: string, options?: MessageOptions) => {
      return addNotification({
        title: sender.name,
        message: content,
        type: 'message',
        avatar: { name: sender.name, src: sender.avatar },
        sound: true,
        ...options,
      });
    },
    [addNotification]
  );

  const activity = useCallback(
    (title: string, options?: TypedNotifyOptions) => {
      return addNotification({ title, type: 'activity', ...options });
    },
    [addNotification]
  );

  return {
    notifications,
    notify,
    success,
    error,
    warning,
    message,
    activity,
    addNotification,
    removeNotification,
    clearAll,
  };
}

// Hook for listening to real-time notifications
export function useRealtimeNotifications(socket: unknown) {
  const { message, activity, notify } = useNotifications();

  useEffect(() => {
    if (!socket || typeof (socket as { on?: unknown }).on !== 'function') return;

    const sock = socket as {
      on: (event: string, handler: (data: unknown) => void) => void;
      off: (event: string, handler: (data: unknown) => void) => void;
    };

    const handleChatMessage = (data: {
      sender: { name: string; avatar?: string };
      content: string;
    }) => {
      message(data.sender, data.content);
    };

    const handleActivity = (data: { title: string; message?: string }) => {
      activity(data.title, { message: data.message });
    };

    const handleNotification = (data: {
      title: string;
      message?: string;
      type?: NotificationType;
    }) => {
      notify(data.title, { message: data.message, type: data.type || 'info' });
    };

    sock.on('chat:message', handleChatMessage);
    sock.on('activity:new', handleActivity);
    sock.on('notification', handleNotification);

    return () => {
      sock.off('chat:message', handleChatMessage);
      sock.off('activity:new', handleActivity);
      sock.off('notification', handleNotification);
    };
  }, [socket, message, activity, notify]);
}

export default NotificationProvider;
