'use client';

/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unnecessary-condition */

import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ImgHTMLAttributes,
  type ReactNode,
} from 'react';

import { cn } from '../../utils/cn';

// ============================================================================
// TYPES
// ============================================================================

export interface OptimizedImageProps
  extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'srcSet' | 'placeholder'> {
  /** Image source URL */
  src: string;
  /** Alt text (required for accessibility) */
  alt: string;
  /** Image width in pixels */
  width: number;
  /** Image height in pixels */
  height: number;
  /** Loading strategy */
  loading?: 'lazy' | 'eager';
  /** Priority - eagerly load and disable lazy loading */
  priority?: boolean;
  /** Image quality (1-100) */
  quality?: number;
  /** Enable blur placeholder */
  placeholder?: 'blur' | 'empty' | 'color';
  /** Base64 blur data URL for placeholder */
  blurDataURL?: string;
  /** Background color for color placeholder */
  placeholderColor?: string;
  /** Object fit style */
  objectFit?: CSSProperties['objectFit'];
  /** Object position style */
  objectPosition?: CSSProperties['objectPosition'];
  /** Whether to generate responsive srcset */
  responsive?: boolean;
  /** Custom breakpoints for srcset */
  breakpoints?: number[];
  /** Image format preference */
  format?: 'auto' | 'webp' | 'avif' | 'jpeg' | 'png';
  /** Enable fade-in animation on load */
  fadeIn?: boolean;
  /** Fade duration in ms */
  fadeDuration?: number;
  /** Callback when image loads */
  onLoad?: () => void;
  /** Callback when image fails to load */
  onError?: () => void;
  /** Fill the parent container */
  fill?: boolean;
  /** Sizes attribute for responsive images */
  sizes?: string;
  /** Custom image loader function */
  loader?: (props: { src: string; width: number; quality: number }) => string;
}

// ============================================================================
// DEFAULT IMAGE LOADER
// ============================================================================

const defaultLoader = ({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality: number;
}): string => {
  // Check if it's already a processed URL (e.g., from image CDN)
  if (src.includes('?') && (src.includes('w=') || src.includes('width='))) {
    return src;
  }

  // For absolute URLs to external services, return as-is
  if (src.startsWith('http') && !src.includes(window?.location?.host)) {
    return src;
  }

  // Build optimized URL with query params
  const params = new URLSearchParams();
  params.set('w', width.toString());
  params.set('q', quality.toString());

  const separator = src.includes('?') ? '&' : '?';
  return `${src}${separator}${params.toString()}`;
};

// ============================================================================
// GENERATE SRCSET
// ============================================================================

const DEFAULT_BREAKPOINTS = [640, 750, 828, 1080, 1200, 1920, 2048, 3840];

function generateSrcSet(
  src: string,
  breakpoints: number[],
  quality: number,
  loader: typeof defaultLoader
): string {
  return breakpoints
    .map((w) => `${loader({ src, width: w, quality })} ${w}w`)
    .join(', ');
}

// ============================================================================
// COMPONENT
// ============================================================================

const OptimizedImageInner = forwardRef<HTMLImageElement, OptimizedImageProps>(
  (
    {
      src,
      alt,
      width,
      height,
      loading = 'lazy',
      priority = false,
      quality = 75,
      placeholder = 'empty',
      blurDataURL,
      placeholderColor = '#e5e7eb',
      objectFit = 'cover',
      objectPosition = 'center',
      responsive = true,
      breakpoints = DEFAULT_BREAKPOINTS,
      format = 'auto',
      fadeIn = true,
      fadeDuration = 300,
      onLoad,
      onError,
      fill = false,
      sizes,
      loader = defaultLoader,
      className,
      style,
      ...props
    },
    ref
  ) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [isInView, setIsInView] = useState(priority);
    const imgRef = useRef<HTMLImageElement>(null);
    const observerRef = useRef<IntersectionObserver | null>(null);

    // Merge refs
    const setRefs = useCallback(
      (node: HTMLImageElement | null) => {
        imgRef.current = node;
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      },
      [ref]
    );

    // Setup intersection observer for lazy loading
    useEffect(() => {
      if (priority || isInView) return;

      const element = imgRef.current;
      if (!element) return;

      observerRef.current = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observerRef.current?.disconnect();
          }
        },
        {
          rootMargin: '200px', // Start loading 200px before visible
          threshold: 0,
        }
      );

      observerRef.current.observe(element);

      return () => {
        observerRef.current?.disconnect();
      };
    }, [priority, isInView]);

    // Handle image load
    const handleLoad = useCallback(() => {
      setIsLoaded(true);
      onLoad?.();
    }, [onLoad]);

    // Handle image error
    const handleError = useCallback(() => {
      setHasError(true);
      onError?.();
    }, [onError]);

    // Generate srcset for responsive images
    const srcSet = responsive
      ? generateSrcSet(src, breakpoints, quality, loader)
      : undefined;

    // Calculate optimized src
    const optimizedSrc = loader({
      src,
      width: Math.min(width, breakpoints[breakpoints.length - 1]),
      quality,
    });

    // Generate sizes attribute if not provided
    const computedSizes =
      sizes || (fill ? '100vw' : `(max-width: ${width}px) 100vw, ${width}px`);

    // Container styles for fill mode
    const containerStyle: CSSProperties = fill
      ? {
          position: 'relative',
          width: '100%',
          height: '100%',
        }
      : {};

    // Image styles
    const imageStyle: CSSProperties = {
      objectFit,
      objectPosition,
      ...(fill
        ? {
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
          }
        : {}),
      ...(fadeIn && !isLoaded
        ? {
            opacity: 0,
            transition: `opacity ${fadeDuration}ms ease-in-out`,
          }
        : {
            opacity: 1,
            transition: `opacity ${fadeDuration}ms ease-in-out`,
          }),
      ...style,
    };

    // Placeholder styles
    const placeholderStyle: CSSProperties = {
      position: 'absolute',
      inset: 0,
      width: '100%',
      height: '100%',
      transition: `opacity ${fadeDuration}ms ease-in-out`,
      opacity: isLoaded ? 0 : 1,
      pointerEvents: 'none',
    };

    // Render placeholder
    const renderPlaceholder = (): ReactNode => {
      if (placeholder === 'empty' || hasError) return null;

      if (placeholder === 'blur' && blurDataURL) {
        return (
          <img
            src={blurDataURL}
            alt=""
            aria-hidden="true"
            style={{
              ...placeholderStyle,
              objectFit,
              objectPosition,
              filter: 'blur(20px)',
              transform: 'scale(1.1)', // Prevent blur edge artifacts
            }}
          />
        );
      }

      if (placeholder === 'color') {
        return (
          <div
            aria-hidden="true"
            style={{
              ...placeholderStyle,
              backgroundColor: placeholderColor,
            }}
          />
        );
      }

      // Default shimmer placeholder
      return (
        <div
          aria-hidden="true"
          className="animate-pulse"
          style={{
            ...placeholderStyle,
            backgroundColor: placeholderColor,
          }}
        />
      );
    };

    // Error fallback
    if (hasError) {
      return (
        <div
          className={cn(
            'flex items-center justify-center bg-muted/20 text-muted',
            className
          )}
          style={{
            width: fill ? '100%' : width,
            height: fill ? '100%' : height,
            ...containerStyle,
          }}
          role="img"
          aria-label={`Failed to load: ${alt}`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
          </svg>
        </div>
      );
    }

    return (
      <div
        style={{
          position: 'relative',
          width: fill ? '100%' : width,
          height: fill ? '100%' : height,
          overflow: 'hidden',
          ...containerStyle,
        }}
        className={className}
      >
        {renderPlaceholder()}
        {isInView && (
          <img
            ref={setRefs}
            src={optimizedSrc}
            srcSet={srcSet}
            sizes={computedSizes}
            alt={alt}
            width={fill ? undefined : width}
            height={fill ? undefined : height}
            loading={priority ? 'eager' : loading}
            decoding={priority ? 'sync' : 'async'}
            fetchPriority={priority ? 'high' : undefined}
            onLoad={handleLoad}
            onError={handleError}
            style={imageStyle}
            {...props}
          />
        )}
        {/* Placeholder for lazy-loaded images not yet in view */}
        {!isInView && (
          <div
            ref={setRefs as any}
            style={{
              width: fill ? '100%' : width,
              height: fill ? '100%' : height,
              backgroundColor: placeholderColor,
            }}
            aria-hidden="true"
          />
        )}
      </div>
    );
  }
);

OptimizedImageInner.displayName = 'OptimizedImage';

export const OptimizedImage = memo(OptimizedImageInner);

// ============================================================================
// BLUR DATA URL GENERATOR (for build-time generation)
// ============================================================================

/**
 * Generate a tiny placeholder color from an image
 * This should be run at build time, not runtime
 */
export function generatePlaceholderColor(
  dominantColor: [number, number, number]
): string {
  const [r, g, b] = dominantColor;
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Generate a base64 blur placeholder
 * This should be run at build time using sharp or similar
 */
export function generateBlurPlaceholder(base64Data: string): string {
  return `data:image/jpeg;base64,${base64Data}`;
}

// ============================================================================
// PICTURE VARIANT (for art direction)
// ============================================================================

export interface PictureSource {
  srcSet: string;
  media?: string;
  type?: string;
  sizes?: string;
}

export interface OptimizedPictureProps extends Omit<OptimizedImageProps, 'responsive'> {
  sources: PictureSource[];
}

const OptimizedPictureInner = forwardRef<HTMLImageElement, OptimizedPictureProps>(
  ({ sources, src, alt, className, ...props }, ref) => {
    return (
      <picture className={className}>
        {sources.map((source, index) => (
          <source
            key={index}
            srcSet={source.srcSet}
            media={source.media}
            type={source.type}
            sizes={source.sizes}
          />
        ))}
        <OptimizedImage ref={ref} src={src} alt={alt} responsive={false} {...props} />
      </picture>
    );
  }
);

OptimizedPictureInner.displayName = 'OptimizedPicture';

export const OptimizedPicture = memo(OptimizedPictureInner);

// ============================================================================
// BACKGROUND IMAGE VARIANT
// ============================================================================

export interface BackgroundImageProps {
  src: string;
  quality?: number;
  className?: string;
  children?: ReactNode;
  overlay?: boolean;
  overlayOpacity?: number;
  parallax?: boolean;
}

export const BackgroundImage = memo(function BackgroundImage({
  src,
  quality = 75,
  className,
  children,
  overlay = false,
  overlayOpacity = 0.5,
  parallax = false,
}: BackgroundImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.src = defaultLoader({ src, width: 1920, quality });
    img.onload = () => setIsLoaded(true);
  }, [src, quality]);

  return (
    <div
      className={cn('relative overflow-hidden', className)}
      style={{
        backgroundImage: isLoaded
          ? `url(${defaultLoader({ src, width: 1920, quality })})`
          : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: parallax ? 'fixed' : 'scroll',
      }}
    >
      {!isLoaded && (
        <div className="absolute inset-0 animate-pulse bg-muted/20" />
      )}
      {overlay && (
        <div
          className="absolute inset-0 bg-black"
          style={{ opacity: overlayOpacity }}
        />
      )}
      <div className="relative">{children}</div>
    </div>
  );
});
