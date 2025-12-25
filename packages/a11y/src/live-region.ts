/**
 * Live Region Manager
 *
 * Manages ARIA live regions for dynamic content announcements.
 */

import { Politeness } from './types';

interface LiveRegionConfig {
  politeness: Politeness;
  atomic?: boolean;
  relevant?: 'additions' | 'removals' | 'text' | 'all' | 'additions text';
  role?: 'status' | 'alert' | 'log' | 'timer' | 'marquee';
}

/**
 * Live Region Manager
 *
 * Creates and manages multiple live regions for different purposes.
 */
export class LiveRegionManager {
  private regions: Map<string, HTMLElement> = new Map();
  private container: HTMLElement | null = null;

  constructor() {
    if (typeof document !== 'undefined') {
      this.initialize();
    }
  }

  private initialize(): void {
    // Create container for all live regions
    this.container = document.createElement('div');
    this.container.id = 'a11y-live-regions';
    this.container.setAttribute('aria-hidden', 'false');

    // Visually hidden
    Object.assign(this.container.style, {
      position: 'absolute',
      width: '1px',
      height: '1px',
      padding: '0',
      margin: '-1px',
      overflow: 'hidden',
      clip: 'rect(0, 0, 0, 0)',
      whiteSpace: 'nowrap',
      border: '0',
    });

    // Append when DOM is ready
    if (document.body) {
      document.body.appendChild(this.container);
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        if (this.container) {
          document.body.appendChild(this.container);
        }
      });
    }
  }

  /**
   * Create a new live region
   */
  createRegion(name: string, config: LiveRegionConfig): HTMLElement {
    if (this.regions.has(name)) {
      return this.regions.get(name)!;
    }

    const region = document.createElement('div');
    region.id = `live-region-${name}`;
    region.setAttribute('aria-live', config.politeness);
    region.setAttribute('aria-atomic', String(config.atomic ?? true));

    if (config.relevant) {
      region.setAttribute('aria-relevant', config.relevant);
    }

    if (config.role) {
      region.setAttribute('role', config.role);
    }

    this.regions.set(name, region);

    if (this.container) {
      this.container.appendChild(region);
    }

    return region;
  }

  /**
   * Announce to a specific region
   */
  announce(regionName: string, message: string): void {
    let region = this.regions.get(regionName);

    if (!region) {
      // Create a default polite region
      region = this.createRegion(regionName, { politeness: 'polite' });
    }

    // Clear and set message (forces re-announcement)
    region.textContent = '';

    // Use setTimeout to ensure screen reader picks up the change
    setTimeout(() => {
      region!.textContent = message;
    }, 50);
  }

  /**
   * Announce a status message
   */
  status(message: string): void {
    if (!this.regions.has('status')) {
      this.createRegion('status', {
        politeness: 'polite',
        role: 'status',
      });
    }
    this.announce('status', message);
  }

  /**
   * Announce an alert
   */
  alert(message: string): void {
    if (!this.regions.has('alert')) {
      this.createRegion('alert', {
        politeness: 'assertive',
        role: 'alert',
      });
    }
    this.announce('alert', message);
  }

  /**
   * Announce to log region
   */
  log(message: string): void {
    if (!this.regions.has('log')) {
      this.createRegion('log', {
        politeness: 'polite',
        role: 'log',
        atomic: false,
        relevant: 'additions',
      });
    }

    const region = this.regions.get('log')!;

    // For log regions, append rather than replace
    const entry = document.createElement('div');
    entry.textContent = message;
    region.appendChild(entry);

    // Keep only last 10 entries
    while (region.children.length > 10) {
      region.removeChild(region.firstChild!);
    }
  }

  /**
   * Clear a region
   */
  clear(regionName: string): void {
    const region = this.regions.get(regionName);
    if (region) {
      region.textContent = '';
    }
  }

  /**
   * Clear all regions
   */
  clearAll(): void {
    this.regions.forEach((region) => {
      region.textContent = '';
    });
  }

  /**
   * Remove a region
   */
  removeRegion(name: string): void {
    const region = this.regions.get(name);
    if (region) {
      region.remove();
      this.regions.delete(name);
    }
  }

  /**
   * Destroy the manager
   */
  destroy(): void {
    this.container?.remove();
    this.regions.clear();
    this.container = null;
  }
}

// Singleton instance
let liveRegionManager: LiveRegionManager | null = null;

/**
 * Get the global live region manager
 */
export function getLiveRegionManager(): LiveRegionManager {
  if (!liveRegionManager) {
    liveRegionManager = new LiveRegionManager();
  }
  return liveRegionManager;
}

/**
 * Destroy the global live region manager
 */
export function destroyLiveRegionManager(): void {
  liveRegionManager?.destroy();
  liveRegionManager = null;
}

// Convenience functions
export const announceStatus = (message: string) =>
  getLiveRegionManager().status(message);

export const announceAlert = (message: string) =>
  getLiveRegionManager().alert(message);

export const announceLog = (message: string) =>
  getLiveRegionManager().log(message);
