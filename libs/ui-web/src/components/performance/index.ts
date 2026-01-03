/**
 * Performance-optimized components
 *
 * Provides:
 * - VirtualizedList: Efficient rendering of large lists
 * - VirtualizedGrid: Efficient rendering of grid layouts
 * - OptimizedImage: Lazy-loaded, responsive images with placeholders
 * - OptimizedPicture: Art-directed responsive images
 */

export {
  VirtualizedList,
  VirtualizedGrid,
  HorizontalVirtualizedList,
  type VirtualizedListProps,
  type VirtualizedGridProps,
  type HorizontalVirtualizedListProps,
} from './VirtualizedList';

export {
  OptimizedImage,
  OptimizedPicture,
  BackgroundImage,
  generatePlaceholderColor,
  generateBlurPlaceholder,
  type OptimizedImageProps,
  type OptimizedPictureProps,
  type BackgroundImageProps,
  type PictureSource,
} from './OptimizedImage';
