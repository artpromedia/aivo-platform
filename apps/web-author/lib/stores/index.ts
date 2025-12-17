/**
 * Stores Index
 *
 * Barrel export for all Zustand stores.
 */

// Auth store
export {
  useAuthStore,
  selectUser,
  selectIsAuthenticated,
  selectIsLoading,
  selectIsAuthor,
  selectIsReviewer,
  selectIsAdmin,
  selectTenantId,
  useUser,
  useIsAuthor,
  useIsReviewer,
  useIsAdmin,
  useTenantId,
  type AuthState,
} from './auth.store';

// Content store
export {
  useContentStore,
  selectFilter,
  selectSelectedContentIds,
  selectCurrentContent,
  selectCurrentVersion,
  selectVersionBlocks,
  selectHasUnsavedChanges,
  selectIsPreviewOpen,
  selectBlockById,
  selectBlockIndex,
  type ContentFilter,
  type ContentState,
} from './content.store';

// Editor store
export {
  useEditorStore,
  selectMode,
  selectSelectedBlockId,
  selectFocusedBlockId,
  selectCollaborators,
  selectIsConnected,
  selectCanUndo,
  selectCanRedo,
  selectBlockLock,
  selectIsBlockLockedByOther,
  selectRemoteCursor,
  type EditorMode,
  type BlockDragState,
  type HistoryEntry,
  type EditorState,
} from './editor.store';
