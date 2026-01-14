'use client';

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

import { cn } from '../../utils/cn';
import { Button } from '../button';
import { ScratchPadCanvas, type ScratchPadCanvasRef, type ScratchPadCanvasProps } from './ScratchPadCanvas';
import type { MathRecognitionResult } from '@aivo/ts-types';

// ════════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════════

export interface ScratchPadModalProps extends Omit<ScratchPadCanvasProps, 'width' | 'height'> {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Called when the modal should close */
  onClose: () => void;
  /** Called when user submits their answer */
  onSubmit?: (answer: string, imageData: string) => void;
  /** Title for the modal */
  title?: string;
  /** Show submit button */
  showSubmit?: boolean;
  /** Submit button text */
  submitText?: string;
  /** Additional class for the modal content */
  contentClassName?: string;
  /** Size preset */
  size?: 'sm' | 'md' | 'lg' | 'full';
}

export interface ScratchPadDrawerProps extends Omit<ScratchPadCanvasProps, 'width' | 'height'> {
  /** Whether the drawer is open */
  isOpen: boolean;
  /** Called when the drawer should close */
  onClose: () => void;
  /** Called when user submits their answer */
  onSubmit?: (answer: string, imageData: string) => void;
  /** Title for the drawer */
  title?: string;
  /** Show submit button */
  showSubmit?: boolean;
  /** Submit button text */
  submitText?: string;
  /** Position of the drawer */
  position?: 'bottom' | 'right';
}

export interface ScratchPadFABProps {
  /** Called when FAB is clicked */
  onClick?: () => void;
  /** Position of the FAB */
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
  /** FAB label (screen reader) */
  label?: string;
  /** Additional class names */
  className?: string;
  /** Whether FAB is visible */
  visible?: boolean;
}

export interface InlineScratchPadProps extends Omit<ScratchPadCanvasProps, 'width' | 'height'> {
  /** Whether the scratch pad is expanded */
  isExpanded?: boolean;
  /** Called when expansion state changes */
  onExpandChange?: (expanded: boolean) => void;
  /** Collapsed state label */
  collapsedLabel?: string;
  /** Max width when expanded */
  maxWidth?: number;
  /** Max height when expanded */
  maxHeight?: number;
}

// ════════════════════════════════════════════════════════════════════════════════
// SIZE PRESETS
// ════════════════════════════════════════════════════════════════════════════════

const SIZE_PRESETS = {
  sm: { width: 400, height: 300 },
  md: { width: 600, height: 450 },
  lg: { width: 800, height: 600 },
  full: { width: 0, height: 0 }, // Calculated dynamically
};

// ════════════════════════════════════════════════════════════════════════════════
// SCRATCH PAD MODAL
// ════════════════════════════════════════════════════════════════════════════════

export function ScratchPadModal({
  isOpen,
  onClose,
  onSubmit,
  title = 'Scratch Pad',
  showSubmit = true,
  submitText = 'Submit Answer',
  contentClassName,
  size = 'md',
  onRecognitionResult,
  ...canvasProps
}: ScratchPadModalProps) {
  const canvasRef = useRef<ScratchPadCanvasRef>(null);
  const [currentResult, setCurrentResult] = useState<MathRecognitionResult | null>(null);
  const [dimensions, setDimensions] = useState(SIZE_PRESETS[size]);

  // Calculate dimensions for full size
  useEffect(() => {
    if (size === 'full') {
      const updateDimensions = () => {
        setDimensions({
          width: Math.min(window.innerWidth - 80, 1200),
          height: Math.min(window.innerHeight - 200, 800),
        });
      };
      updateDimensions();
      window.addEventListener('resize', updateDimensions);
      return () => window.removeEventListener('resize', updateDimensions);
    }
    setDimensions(SIZE_PRESETS[size]);
    return undefined;
  }, [size]);

  // Handle recognition result
  const handleRecognition = useCallback(
    (result: MathRecognitionResult) => {
      setCurrentResult(result);
      onRecognitionResult?.(result);
    },
    [onRecognitionResult]
  );

  // Handle submit
  const handleSubmit = useCallback(() => {
    if (!currentResult || !canvasRef.current) return;
    const imageData = canvasRef.current.getImageData();
    onSubmit?.(currentResult.recognizedText, imageData);
    onClose();
  }, [currentResult, onSubmit, onClose]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className={cn(
          'relative z-10 flex max-h-[90vh] flex-col rounded-xl bg-surface shadow-2xl',
          contentClassName
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="scratch-pad-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 id="scratch-pad-title" className="text-lg font-semibold">
            {title}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose} title="Close">
            <CloseIcon className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          <ScratchPadCanvas
            ref={canvasRef}
            width={dimensions.width}
            height={dimensions.height}
            onRecognitionResult={handleRecognition}
            {...canvasProps}
          />
        </div>

        {/* Footer */}
        {showSubmit && (
          <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={!currentResult || currentResult.confidence < 0.5}
            >
              {submitText}
            </Button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// SCRATCH PAD DRAWER
// ════════════════════════════════════════════════════════════════════════════════

export function ScratchPadDrawer({
  isOpen,
  onClose,
  onSubmit,
  title = 'Scratch Pad',
  showSubmit = true,
  submitText = 'Submit Answer',
  position = 'bottom',
  onRecognitionResult,
  ...canvasProps
}: ScratchPadDrawerProps) {
  const canvasRef = useRef<ScratchPadCanvasRef>(null);
  const [currentResult, setCurrentResult] = useState<MathRecognitionResult | null>(null);
  const [dimensions, setDimensions] = useState({ width: 400, height: 300 });

  // Calculate dimensions based on position
  useEffect(() => {
    const updateDimensions = () => {
      if (position === 'bottom') {
        setDimensions({
          width: Math.min(window.innerWidth - 48, 800),
          height: Math.min(window.innerHeight * 0.5, 400),
        });
      } else {
        setDimensions({
          width: Math.min(window.innerWidth * 0.4, 500),
          height: Math.min(window.innerHeight - 200, 600),
        });
      }
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [position]);

  // Handle recognition result
  const handleRecognition = useCallback(
    (result: MathRecognitionResult) => {
      setCurrentResult(result);
      onRecognitionResult?.(result);
    },
    [onRecognitionResult]
  );

  // Handle submit
  const handleSubmit = useCallback(() => {
    if (!currentResult || !canvasRef.current) return;
    const imageData = canvasRef.current.getImageData();
    onSubmit?.(currentResult.recognizedText, imageData);
    onClose();
  }, [currentResult, onSubmit, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const isBottom = position === 'bottom';

  return createPortal(
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={cn(
          'absolute bg-surface shadow-2xl transition-transform duration-300',
          isBottom
            ? 'inset-x-0 bottom-0 rounded-t-xl'
            : 'right-0 top-0 h-full rounded-l-xl'
        )}
        role="dialog"
        aria-modal="true"
      >
        {/* Handle (for bottom drawer) */}
        {isBottom && (
          <div className="flex justify-center py-2">
            <div className="h-1 w-10 rounded-full bg-border" />
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <Button variant="ghost" size="icon" onClick={onClose} title="Close">
            <CloseIcon className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="overflow-auto p-4">
          <ScratchPadCanvas
            ref={canvasRef}
            width={dimensions.width}
            height={dimensions.height}
            onRecognitionResult={handleRecognition}
            {...canvasProps}
          />
        </div>

        {/* Footer */}
        {showSubmit && (
          <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={!currentResult || currentResult.confidence < 0.5}
            >
              {submitText}
            </Button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// SCRATCH PAD FAB
// ════════════════════════════════════════════════════════════════════════════════

export function ScratchPadFAB({
  onClick,
  position = 'bottom-right',
  label = 'Open Scratch Pad',
  className,
  visible = true,
}: ScratchPadFABProps) {
  if (!visible) return null;

  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'fixed z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-on-accent shadow-lg transition-transform hover:scale-110 active:scale-95',
        positionClasses[position],
        className
      )}
      aria-label={label}
    >
      <PencilIcon className="h-6 w-6" />
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// INLINE SCRATCH PAD (Expandable)
// ════════════════════════════════════════════════════════════════════════════════

export function InlineScratchPad({
  isExpanded: controlledExpanded,
  onExpandChange,
  collapsedLabel = 'Open scratch pad to work out your answer',
  maxWidth = 600,
  maxHeight = 400,
  ...canvasProps
}: InlineScratchPadProps) {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const isExpanded = controlledExpanded ?? internalExpanded;

  const handleToggle = useCallback(() => {
    const newValue = !isExpanded;
    setInternalExpanded(newValue);
    onExpandChange?.(newValue);
  }, [isExpanded, onExpandChange]);

  if (!isExpanded) {
    return (
      <button
        onClick={handleToggle}
        className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border py-4 text-muted transition-colors hover:border-primary hover:text-primary"
      >
        <PencilIcon className="h-5 w-5" />
        <span>{collapsedLabel}</span>
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-border">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-sm font-medium">Scratch Pad</span>
        <Button variant="ghost" size="sm" onClick={handleToggle}>
          Minimize
        </Button>
      </div>
      <div className="p-2">
        <ScratchPadCanvas
          width={Math.min(maxWidth, window.innerWidth - 48)}
          height={maxHeight}
          {...canvasProps}
        />
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// HOOK FOR POPUP STATE
// ════════════════════════════════════════════════════════════════════════════════

export interface UseScratchPadPopupReturn {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export function useScratchPadPopup(initialOpen = false): UseScratchPadPopupReturn {
  const [isOpen, setIsOpen] = useState(initialOpen);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  return { isOpen, open, close, toggle };
}

// ════════════════════════════════════════════════════════════════════════════════
// ICONS
// ════════════════════════════════════════════════════════════════════════════════

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
      />
    </svg>
  );
}
