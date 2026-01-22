'use client';

import * as React from 'react';

export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  className?: string;
}

export const Avatar = React.forwardRef<HTMLSpanElement, AvatarProps>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      className={`relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full ${className ?? ''}`}
      {...props}
    />
  )
);
Avatar.displayName = 'Avatar';

export interface AvatarImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  className?: string;
}

export const AvatarImage = React.forwardRef<HTMLImageElement, AvatarImageProps>(
  ({ className, alt, ...props }, ref) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      className={`aspect-square h-full w-full ${className ?? ''}`}
      alt={alt ?? ''}
      {...props}
    />
  )
);
AvatarImage.displayName = 'AvatarImage';

export interface AvatarFallbackProps extends React.HTMLAttributes<HTMLSpanElement> {
  className?: string;
}

export const AvatarFallback = React.forwardRef<HTMLSpanElement, AvatarFallbackProps>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      className={`flex h-full w-full items-center justify-center rounded-full bg-muted ${className ?? ''}`}
      {...props}
    />
  )
);
AvatarFallback.displayName = 'AvatarFallback';
