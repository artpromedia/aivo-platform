'use client';

import * as React from 'react';
import { cn } from '../../lib/utils';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ConfirmDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Called when the dialog should close */
  onOpenChange: (open: boolean) => void;
  /** Dialog title */
  title: string;
  /** Description / explanation of the action */
  description?: string;
  /** Label for the confirm button. Default: "Confirm" */
  confirmLabel?: string;
  /** Label for the cancel button. Default: "Cancel" */
  cancelLabel?: string;
  /** Visual variant. "destructive" styles the confirm button red. */
  variant?: 'default' | 'destructive';
  /** Called when user confirms */
  onConfirm: () => void | Promise<void>;
  /** Called when user cancels (in addition to closing) */
  onCancel?: () => void;
  /** Optional children rendered between description and buttons */
  children?: React.ReactNode;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel,
  children,
}: ConfirmDialogProps) {
  const [loading, setLoading] = React.useState(false);
  const cancelRef = React.useRef<HTMLButtonElement>(null);

  // Focus the cancel button when opening (safe default for destructive actions)
  React.useEffect(() => {
    if (open) {
      // Small delay to allow the DOM to mount
      const timer = setTimeout(() => cancelRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [open]);

  // Close on Escape
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onOpenChange(false);
        onCancel?.();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onOpenChange, onCancel]);

  // Prevent body scroll when open
  React.useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
    return undefined;
  }, [open]);

  if (!open) return null;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch {
      // keep dialog open on error
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    onCancel?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={handleCancel}
        aria-hidden
      />

      {/* Dialog */}
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby={description ? 'confirm-dialog-desc' : undefined}
        className="relative z-50 mx-4 w-full max-w-md rounded-[var(--radius-modal)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-6 shadow-[var(--shadow-elevated)]"
      >
        <h2
          id="confirm-dialog-title"
          className="text-lg font-semibold text-[rgb(var(--color-text))]"
        >
          {title}
        </h2>

        {description && (
          <p
            id="confirm-dialog-desc"
            className="mt-2 text-sm text-[rgb(var(--color-text-muted))]"
          >
            {description}
          </p>
        )}

        {children && <div className="mt-4">{children}</div>}

        <div className="mt-6 flex justify-end gap-3">
          <button
            ref={cancelRef}
            onClick={handleCancel}
            disabled={loading}
            className="rounded-[var(--radius-button)] border border-[rgb(var(--color-border))] bg-[var(--glass-bg)] px-4 py-2 text-sm font-medium text-[rgb(var(--color-text-muted))] hover:bg-[var(--glass-bg-light)] hover:text-[rgb(var(--color-text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--color-focus))] focus:ring-offset-2 focus:ring-offset-[rgb(var(--color-background))] disabled:opacity-50 transition-all"
          >
            {cancelLabel}
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={cn(
              'rounded-[var(--radius-button)] px-4 py-2 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[rgb(var(--color-background))] disabled:opacity-50 transition-all',
              variant === 'destructive'
                ? 'bg-[rgb(var(--color-error))] hover:brightness-110 focus:ring-[rgb(var(--color-error))] shadow-[0_0_20px_rgba(var(--color-error),0.3)]'
                : 'bg-[rgb(var(--color-primary))] hover:brightness-110 focus:ring-[rgb(var(--color-primary))] shadow-[0_0_20px_rgba(var(--color-primary),0.3)]',
            )}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Processing…
              </span>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Hook for imperative usage                                          */
/* ------------------------------------------------------------------ */

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = React.createContext<ConfirmContextValue | undefined>(undefined);

export function useConfirm() {
  const ctx = React.useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within a <ConfirmProvider>');
  return ctx.confirm;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<{
    options: ConfirmOptions;
    resolve: (v: boolean) => void;
  } | null>(null);

  const confirm = React.useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ options, resolve });
    });
  }, []);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {state && (
        <ConfirmDialog
          open
          title={state.options.title}
          description={state.options.description}
          confirmLabel={state.options.confirmLabel}
          cancelLabel={state.options.cancelLabel}
          variant={state.options.variant}
          onConfirm={() => {
            state.resolve(true);
            setState(null);
          }}
          onCancel={() => {
            state.resolve(false);
            setState(null);
          }}
          onOpenChange={(open) => {
            if (!open) {
              state.resolve(false);
              setState(null);
            }
          }}
        />
      )}
    </ConfirmContext.Provider>
  );
}
