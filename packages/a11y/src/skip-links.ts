/**
 * Skip Links Utilities
 *
 * Provides utilities for creating and managing skip links
 * for keyboard navigation.
 */

import { SkipLink } from './types';

/**
 * Default skip links
 */
export const DEFAULT_SKIP_LINKS: SkipLink[] = [
  { id: 'main-content', label: 'Skip to main content' },
  { id: 'main-navigation', label: 'Skip to navigation' },
];

/**
 * Create skip link elements
 */
export function createSkipLinks(
  links: SkipLink[] = DEFAULT_SKIP_LINKS,
  options: {
    containerClassName?: string;
    linkClassName?: string;
    focusedClassName?: string;
  } = {}
): HTMLElement {
  const container = document.createElement('nav');
  container.setAttribute('aria-label', 'Skip navigation');
  container.className = options.containerClassName || 'skip-links';

  // Visually hidden until focused
  Object.assign(container.style, {
    position: 'absolute',
    top: '-9999px',
    left: '0',
    zIndex: '9999',
  });

  const ul = document.createElement('ul');
  ul.style.listStyle = 'none';
  ul.style.margin = '0';
  ul.style.padding = '0';
  ul.style.display = 'flex';
  ul.style.gap = '8px';

  links.forEach((link) => {
    const li = document.createElement('li');
    const a = document.createElement('a');

    a.href = `#${link.id}`;
    a.textContent = link.label;
    a.className = options.linkClassName || 'skip-link';

    // Style the link
    Object.assign(a.style, {
      display: 'block',
      padding: '8px 16px',
      backgroundColor: '#000',
      color: '#fff',
      textDecoration: 'none',
      fontWeight: '600',
      borderRadius: '4px',
    });

    // Handle focus to show the link
    a.addEventListener('focus', () => {
      container.style.position = 'fixed';
      container.style.top = '8px';
      container.style.left = '8px';
      if (options.focusedClassName) {
        a.classList.add(options.focusedClassName);
      }
    });

    a.addEventListener('blur', () => {
      container.style.position = 'absolute';
      container.style.top = '-9999px';
      if (options.focusedClassName) {
        a.classList.remove(options.focusedClassName);
      }
    });

    // Handle click
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.getElementById(link.id);

      if (target) {
        // Ensure target is focusable
        if (!target.hasAttribute('tabindex')) {
          target.setAttribute('tabindex', '-1');
        }

        target.focus();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });

    li.appendChild(a);
    ul.appendChild(li);
  });

  container.appendChild(ul);

  return container;
}

/**
 * Insert skip links into the document
 */
export function insertSkipLinks(
  links: SkipLink[] = DEFAULT_SKIP_LINKS,
  options?: Parameters<typeof createSkipLinks>[1]
): HTMLElement {
  const skipLinks = createSkipLinks(links, options);

  // Insert as first child of body
  if (document.body.firstChild) {
    document.body.insertBefore(skipLinks, document.body.firstChild);
  } else {
    document.body.appendChild(skipLinks);
  }

  return skipLinks;
}

/**
 * CSS for skip links
 */
export const skipLinksCSS = `
.skip-links {
  position: absolute;
  top: -9999px;
  left: 0;
  z-index: 9999;
}

.skip-links:focus-within {
  position: fixed;
  top: 8px;
  left: 8px;
}

.skip-links ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  gap: 8px;
}

.skip-link {
  display: block;
  padding: 8px 16px;
  background-color: var(--skip-link-bg, #000);
  color: var(--skip-link-color, #fff);
  text-decoration: none;
  font-weight: 600;
  border-radius: 4px;
  outline: 2px solid transparent;
  outline-offset: 2px;
}

.skip-link:focus {
  outline-color: var(--skip-link-focus-color, #0066cc);
}

.skip-link:hover {
  background-color: var(--skip-link-hover-bg, #333);
}
`;

/**
 * Inject skip links CSS
 */
export function injectSkipLinksCSS(): void {
  if (typeof document === 'undefined') return;

  const styleId = 'a11y-skip-links-styles';
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = skipLinksCSS;
  document.head.appendChild(style);
}

/**
 * Create a skip target element
 */
export function createSkipTarget(
  id: string,
  options: {
    element?: keyof HTMLElementTagNameMap;
    label?: string;
  } = {}
): HTMLElement {
  const element = document.createElement(options.element || 'div');
  element.id = id;
  element.setAttribute('tabindex', '-1');

  if (options.label) {
    element.setAttribute('aria-label', options.label);
  }

  // Add focus styles
  Object.assign(element.style, {
    outline: 'none',
  });

  return element;
}

/**
 * Ensure an element is a valid skip target
 */
export function ensureSkipTarget(element: HTMLElement): void {
  if (!element.hasAttribute('tabindex')) {
    element.setAttribute('tabindex', '-1');
  }
}

/**
 * Add skip target to existing elements
 */
export function addSkipTargets(
  targets: Array<{ selector: string; id?: string }>
): void {
  targets.forEach(({ selector, id }) => {
    const element = document.querySelector<HTMLElement>(selector);
    if (element) {
      if (id && !element.id) {
        element.id = id;
      }
      ensureSkipTarget(element);
    }
  });
}
