'use client';

import * as React from 'react';
import { cn } from '../../lib/utils';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type ToastVariant = 'default' | 'success' | 'destructive' | 'warning' | 'info';

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  /** Auto-dismiss duration in ms. Pass `Infinity` to keep open. Default 5 000. */
  duration?: number;
  /** Optional action button */
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface ToastContextValue {
  toasts: Toast[];
  toast: (t: Omit<Toast, 'id'>) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */

const ToastContext = React.createContext<ToastContextValue | undefined>(undefined);

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a <ToastProvider>');
  return ctx;
}

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

let toastCount = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const dismissAll = React.useCallback(() => setToasts([]), []);

  const toast = React.useCallback(
    (t: Omit<Toast, 'id'>) => {
      const id = `toast-${++toastCount}`;
      const duration = t.duration ?? 5000;

      setToasts((prev) => [...prev, { ...t, id }]);

      if (duration !== Infinity) {
        setTimeout(() => dismiss(id), duration);
      }

      return id;
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss, dismissAll }}>
      {children}
      <Toaster />
    </ToastContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/*  Toaster (renders all active toasts)                                */
/* ------------------------------------------------------------------ */

const variantStyles: Record<ToastVariant, string> = {
  default:
    'border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-elevated))] text-[rgb(var(--color-text))]',
  success:
    'border-[rgb(var(--color-success))]/30 bg-[rgb(var(--color-success))]/10 text-[rgb(var(--color-success))]',
  destructive:
    'border-[rgb(var(--color-error))]/30 bg-[rgb(var(--color-error))]/10 text-[rgb(var(--color-error))]',
  warning:
    'border-[rgb(var(--color-warning))]/30 bg-[rgb(var(--color-warning))]/10 text-[rgb(var(--color-warning))]',
  info:
    'border-[rgb(var(--color-info))]/30 bg-[rgb(var(--color-info))]/10 text-[rgb(var(--color-info))]',
};

const variantIcons: Record<ToastVariant, string> = {
  default: '',
  success: '✓',
  destructive: '✕',
  warning: '⚠',
  info: 'ℹ',
};

function Toaster() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-label="Notifications"
      role="region"
      className="fixed bottom-4 right-4 z-[100] flex max-h-screen w-full max-w-sm flex-col-reverse gap-2"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={cn(
            'pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-lg border p-4 shadow-lg transition-all',
            'animate-in slide-in-from-bottom-4 fade-in duration-300',
            variantStyles[t.variant ?? 'default'],
          )}
        >
          {/* Icon */}
          {variantIcons[t.variant ?? 'default'] && (
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-sm font-bold">
              {variantIcons[t.variant ?? 'default']}
            </span>
          )}

          {/* Content */}
          <div className="flex-1 space-y-1">
            {t.title && <p className="text-sm font-semibold leading-none">{t.title}</p>}
            {t.description && <p className="text-sm opacity-80">{t.description}</p>}
          </div>

          {/* Action */}
          {t.action && (
            <button
              onClick={() => {
                t.action!.onClick();
                dismiss(t.id);
              }}
              className="shrink-0 rounded-[var(--radius-button)] border border-[rgb(var(--color-border))] bg-[var(--glass-bg)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--glass-bg-light)] text-[rgb(var(--color-text))] transition-colors"
            >
              {t.action.label}
            </button>
          )}

          {/* Dismiss */}
          <button
            onClick={() => dismiss(t.id)}
            className="absolute right-2 top-2 rounded-sm p-0.5 opacity-50 hover:opacity-100"
            aria-label="Dismiss notification"
          >
            <span aria-hidden>✕</span>
          </button>
        </div>
      ))}
    </div>
  );
}

export { Toaster };
