/**
 * Lesson Builder Components
 *
 * Export all lesson builder components for easy importing
 */

// Core Components
export { LessonCanvas } from './LessonCanvas';
export { BlockEditor } from './BlockEditor';
export { BlockPalette } from './BlockPalette';
export { LessonPreview } from './LessonPreview';
export { DragDropContext } from './DragDropContext';

// New Lesson Builder Components
export { ActivityLibrary, ACTIVITY_TYPES, MOCK_ACTIVITIES } from './ActivityLibrary';
export { LessonEditor } from './LessonEditor';
export { StandardsSelector } from './StandardsSelector';
export { ResourceUploader } from './ResourceUploader';
export { PreviewPane } from './PreviewPane';
export { SavePublishControls } from './SavePublishControls';

// Types - Core
export type { Block } from './LessonCanvas';
export type { PreviewMode, LessonPreviewData } from './LessonPreview';

// Types - Activity Library
export type { ActivityTemplate, ActivityType } from './ActivityLibrary';

// Types - Lesson Editor
export type { LessonData, LessonActivity, Resource } from './LessonEditor';

// Types - Standards Selector
export type { Standard } from './StandardsSelector';
