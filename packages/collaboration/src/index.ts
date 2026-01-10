/**
 * @aivo/collaboration
 *
 * Real-time collaboration package for the AIVO platform.
 *
 * Features:
 * - WebSocket connection management
 * - Presence tracking (online, away, busy)
 * - Room-based collaboration
 * - Y.js CRDT document sync
 * - Live cursors
 * - Real-time chat
 * - Activity feeds
 * - Collaborative whiteboard
 * - Offline queue with sync
 *
 * @example
 * ```tsx
 * import {
 *   CollaborationProvider,
 *   useCollaboration,
 *   useRoom,
 *   useCollaborativeDocument,
 *   LiveCursors,
 *   CollaboratorAvatars,
 * } from '@aivo/collaboration';
 *
 * function App() {
 *   return (
 *     <CollaborationProvider
 *       serverUrl="wss://realtime.aivolearning.com"
 *       token={authToken}
 *       userId={user.id}
 *       displayName={user.name}
 *       tenantId={tenant.id}
 *     >
 *       <CollaborativeEditor />
 *     </CollaborationProvider>
 *   );
 * }
 *
 * function CollaborativeEditor() {
 *   const { socket, connected } = useCollaboration();
 *   const { users, cursors, updateCursor } = useRoom({
 *     socket,
 *     roomId: 'lesson-123',
 *     roomType: 'lesson',
 *     userId: user.id,
 *     displayName: user.name,
 *   });
 *   const { doc, getText } = useCollaborativeDocument({
 *     socket,
 *     documentId: 'lesson-123',
 *     userId: user.id,
 *     displayName: user.name,
 *     color: '#3B82F6',
 *   });
 *
 *   return (
 *     <div>
 *       <CollaboratorAvatars users={users} currentUserId={user.id} />
 *       <LiveCursors cursors={cursors} currentUserId={user.id} />
 *       <Editor doc={doc} />
 *     </div>
 *   );
 * }
 * ```
 */

// Types
export * from './types';

// Hooks
export {
  useSocket,
  usePresence,
  useRoom,
  useCollaborativeDocument,
  useChat,
  useActivity,
  useOfflineQueue,
} from './hooks';

// Components
export {
  // Core UI Components
  LiveCursors,
  CollaboratorAvatars,
  PresenceIndicator,
  ConnectionStatus,
  Whiteboard,
  TypingIndicator,
  ActivityFeed,
  SyncIndicator,
  ChatPanel,
  CollaborationProvider,
  useCollaboration,
  // Advanced Components
  CommentThread,
  CollaborativeEditor,
  ScreenShare,
  NotificationProvider,
  useNotifications,
  useRealtimeNotifications,
} from './components';

// Re-export types from components
export type {
  Comment,
  CommentReaction,
  CommentThreadProps,
  CollaborativeEditorProps,
  CollaboratorInfo,
  ScreenShareProps,
  ShareQuality,
  ShareState,
  Notification,
  NotificationType,
  NotificationAction,
} from './components';
