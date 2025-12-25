import { useEffect, useRef } from 'react';
import { insertSkipLinks, injectSkipLinksCSS } from '../skip-links';
import { SkipLink } from '../types';

interface UseSkipLinksOptions {
  links?: SkipLink[];
  injectCSS?: boolean;
}

/**
 * Hook for adding skip links to the page
 */
export function useSkipLinks(options: UseSkipLinksOptions = {}) {
  const { links, injectCSS = true } = options;
  const skipLinksRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (injectCSS) {
      injectSkipLinksCSS();
    }

    skipLinksRef.current = insertSkipLinks(links);

    return () => {
      skipLinksRef.current?.remove();
    };
  }, [links, injectCSS]);
}

/**
 * Hook for creating a skip link target
 */
export function useSkipTarget(id: string) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.id = id;
      if (!ref.current.hasAttribute('tabindex')) {
        ref.current.setAttribute('tabindex', '-1');
      }
    }
  }, [id]);

  return ref;
}
