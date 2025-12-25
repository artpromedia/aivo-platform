import React, {
  forwardRef,
  useEffect,
  useRef,
  useCallback,
  useState,
  useId,
} from 'react';
import { createFocusTrap } from '../focus-trap';
import { saveFocus, restoreFocus } from '../focus-management';
import type { FocusTrap as FocusTrapType } from '../focus-trap';

export interface AccessibleDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  initialFocusRef?: React.RefObject<HTMLElement>;
  returnFocusOnClose?: boolean;
  closeOnEscape?: boolean;
  closeOnOutsideClick?: boolean;
  role?: 'dialog' | 'alertdialog';
  className?: string;
  overlayClassName?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
}

/**
 * Accessible modal dialog component
 *
 * Features:
 * - Focus trap within dialog
 * - Focus returns to trigger on close
 * - Escape key closes dialog
 * - Click outside closes dialog (optional)
 * - Proper ARIA attributes
 * - Prevents body scroll when open
 *
 * @example
 * const [open, setOpen] = useState(false);
 *
 * <button onClick={() => setOpen(true)}>Open Dialog</button>
 * <AccessibleDialog
 *   open={open}
 *   onClose={() => setOpen(false)}
 *   title="Confirm Action"
 *   description="Are you sure you want to proceed?"
 * >
 *   <button onClick={() => setOpen(false)}>Cancel</button>
 *   <button onClick={handleConfirm}>Confirm</button>
 * </AccessibleDialog>
 */
export const AccessibleDialog = forwardRef<HTMLDivElement, AccessibleDialogProps>(
  (
    {
      open,
      onClose,
      title,
      description,
      children,
      initialFocusRef,
      returnFocusOnClose = true,
      closeOnEscape = true,
      closeOnOutsideClick = true,
      role = 'dialog',
      className,
      overlayClassName,
      'aria-labelledby': ariaLabelledBy,
      'aria-describedby': ariaDescribedBy,
    },
    ref
  ) => {
    const dialogRef = useRef<HTMLDivElement>(null);
    const focusTrapRef = useRef<FocusTrapType | null>(null);
    const baseId = useId();
    const titleId = ariaLabelledBy || `${baseId}-title`;
    const descriptionId = ariaDescribedBy || `${baseId}-description`;

    const [mounted, setMounted] = useState(false);

    // Handle opening
    useEffect(() => {
      if (open) {
        // Save current focus
        if (returnFocusOnClose) {
          saveFocus();
        }

        // Prevent body scroll
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        setMounted(true);

        return () => {
          document.body.style.overflow = originalOverflow;
        };
      } else {
        setMounted(false);
      }
    }, [open, returnFocusOnClose]);

    // Handle focus trap
    useEffect(() => {
      if (mounted && dialogRef.current) {
        focusTrapRef.current = createFocusTrap(dialogRef.current, {
          onEscape: closeOnEscape ? onClose : undefined,
          onClickOutside: closeOnOutsideClick ? onClose : undefined,
          autoFocus: true,
          initialFocus: initialFocusRef?.current || undefined,
        });

        focusTrapRef.current.activate();

        return () => {
          focusTrapRef.current?.deactivate();
          if (returnFocusOnClose) {
            restoreFocus();
          }
        };
      }
    }, [mounted, closeOnEscape, closeOnOutsideClick, onClose, initialFocusRef, returnFocusOnClose]);

    // Handle escape key
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (closeOnEscape && e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }
      },
      [closeOnEscape, onClose]
    );

    if (!open) {
      return null;
    }

    return (
      <div
        className={overlayClassName}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}
        onClick={closeOnOutsideClick ? onClose : undefined}
        aria-hidden="true"
      >
        <div
          ref={(node) => {
            (dialogRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
            if (typeof ref === 'function') {
              ref(node);
            } else if (ref) {
              ref.current = node;
            }
          }}
          role={role}
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={description ? descriptionId : undefined}
          className={className}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={handleKeyDown}
          tabIndex={-1}
          style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '90vw',
            maxHeight: '90vh',
            overflow: 'auto',
            position: 'relative',
          }}
        >
          <h2 id={titleId} style={{ marginTop: 0 }}>
            {title}
          </h2>
          {description && (
            <p id={descriptionId} style={{ color: '#666' }}>
              {description}
            </p>
          )}
          {children}
        </div>
      </div>
    );
  }
);

AccessibleDialog.displayName = 'AccessibleDialog';
