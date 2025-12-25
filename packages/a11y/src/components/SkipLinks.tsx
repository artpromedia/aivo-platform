import React, { useEffect, useRef, forwardRef } from 'react';
import { DEFAULT_SKIP_LINKS, skipLinksCSS } from '../skip-links';
import type { SkipLink } from '../types';

interface SkipLinksProps {
  links?: SkipLink[];
  className?: string;
  linkClassName?: string;
  injectCSS?: boolean;
}

/**
 * Skip links component for keyboard navigation
 *
 * @example
 * <SkipLinks />
 *
 * // Custom links
 * <SkipLinks links={[
 *   { href: '#main', label: 'Skip to content' },
 *   { href: '#search', label: 'Skip to search' }
 * ]} />
 */
export const SkipLinks = forwardRef<HTMLDivElement, SkipLinksProps>(
  ({ links = DEFAULT_SKIP_LINKS, className, linkClassName, injectCSS = true }, ref) => {
    const styleRef = useRef<HTMLStyleElement | null>(null);

    useEffect(() => {
      if (injectCSS && typeof document !== 'undefined') {
        const existingStyle = document.getElementById('a11y-skip-links-styles');
        if (!existingStyle) {
          styleRef.current = document.createElement('style');
          styleRef.current.id = 'a11y-skip-links-styles';
          styleRef.current.textContent = skipLinksCSS;
          document.head.appendChild(styleRef.current);
        }
      }

      return () => {
        styleRef.current?.remove();
      };
    }, [injectCSS]);

    return (
      <nav
        ref={ref}
        aria-label="Skip links"
        className={className || 'a11y-skip-links'}
      >
        {links.map((link, index) => (
          <a
            key={index}
            href={link.href}
            className={linkClassName || 'a11y-skip-link'}
          >
            {link.label}
          </a>
        ))}
      </nav>
    );
  }
);

SkipLinks.displayName = 'SkipLinks';
