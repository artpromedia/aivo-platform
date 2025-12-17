/**
 * Hooks Index
 *
 * Barrel export for all React hooks.
 */

// Real-time collaboration
export { useRealtime, type UseRealtimeOptions, type UseRealtimeReturn } from './useRealtime';

// Auto-save
export { useAutoSave, type UseAutoSaveOptions, type UseAutoSaveReturn } from './useAutoSave';

// Content management
export {
  useContentList,
  useContent,
  useCreateContent,
  type UseContentListOptions,
  type UseContentDetailOptions,
  type ContentListState,
  type ContentDetailState,
} from './useContent';

// Review queue
export { useReviewQueue, useReview, type UseReviewQueueOptions } from './useReview';

// Asset management
export {
  useAssets,
  useAsset,
  useAssetUpload,
  type UseAssetsOptions,
  type UploadProgress,
} from './useAssets';
