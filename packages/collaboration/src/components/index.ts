/**
 * Collaboration Components
 *
 * Re-export all components from the collaboration package
 */

// Core UI Components
export { LiveCursors } from './LiveCursors';
export { CollaboratorAvatars } from './CollaboratorAvatars';
export { PresenceIndicator } from './PresenceIndicator';
export { ConnectionStatus } from './ConnectionStatus';
export { Whiteboard } from './Whiteboard';
export { TypingIndicator } from './TypingIndicator';
export { ActivityFeed } from './ActivityFeed';
export { SyncIndicator } from './SyncIndicator';
export { ChatPanel } from './ChatPanel';
export { CollaborationProvider, useCollaboration } from './CollaborationProvider';

// Advanced Collaboration Components
export { CommentThread } from './CommentThread';
export type { Comment, CommentReaction, CommentThreadProps } from './CommentThread';

export { CollaborativeEditor } from './CollaborativeEditor';
export type { CollaborativeEditorProps, CollaboratorInfo } from './CollaborativeEditor';

export { ScreenShare } from './ScreenShare';
export type { ScreenShareProps, ShareQuality, ShareState } from './ScreenShare';

export {
  NotificationProvider,
  useNotifications,
  useRealtimeNotifications,
} from './NotificationToast';
export type { Notification, NotificationType, NotificationAction } from './NotificationToast';
