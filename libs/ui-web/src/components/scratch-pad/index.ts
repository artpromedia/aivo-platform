/**
 * Scratch Pad Components
 *
 * A set of React components for drawing and math work on web.
 * Includes canvas drawing, AI-powered handwriting recognition,
 * and integration with math activities.
 */

// Canvas
export { ScratchPadCanvas } from './ScratchPadCanvas';
export type { ScratchPadCanvasProps, ScratchPadCanvasRef } from './ScratchPadCanvas';

// Hooks and Service
export {
  useScratchPad,
  ScratchPadProvider,
  useScratchPadContext,
} from './useScratchPad';
export type {
  UseScratchPadOptions,
  ScratchPadState,
  ScratchPadActions,
  ScratchPadProviderProps,
} from './useScratchPad';

// Popup Components
export {
  ScratchPadModal,
  ScratchPadDrawer,
  ScratchPadFAB,
  InlineScratchPad,
  useScratchPadPopup,
} from './ScratchPadPopup';
export type {
  ScratchPadModalProps,
  ScratchPadDrawerProps,
  ScratchPadFABProps,
  InlineScratchPadProps,
  UseScratchPadPopupReturn,
} from './ScratchPadPopup';

// Math Activity Integration
export {
  MathQuestionWithScratchPad,
  MathActivityWithScratchPad,
} from './MathActivityIntegration';
export type {
  MathQuestion,
  MathQuestionWithScratchPadProps,
  MathActivityWithScratchPadProps,
} from './MathActivityIntegration';
