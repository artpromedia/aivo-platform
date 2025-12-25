/**
 * Screen Reader Announcer
 *
 * Provides a way to make announcements to screen readers
 * using ARIA live regions. Supports different politeness levels
 * and announcement queuing.
 */

import { Politeness, AnnouncementOptions } from './types';

interface QueuedAnnouncement {
  message: string;
  politeness: Politeness;
  timestamp: number;
}

/**
 * Screen Reader Announcer class
 *
 * Creates invisible ARIA live regions to announce messages to screen readers.
 * Supports polite and assertive announcements with message queuing.
 */
class ScreenReaderAnnouncer {
  private politeRegion: HTMLElement | null = null;
  private assertiveRegion: HTMLElement | null = null;
  private queue: QueuedAnnouncement[] = [];
  private isProcessing = false;
  private debounceTimeout: ReturnType<typeof setTimeout> | null = null;
  private isInitialized = false;

  constructor() {
    if (typeof document !== 'undefined') {
      this.initialize();
    }
  }

  private initialize(): void {
    if (this.isInitialized) return;

    // Create polite live region
    this.politeRegion = this.createLiveRegion('polite');

    // Create assertive live region
    this.assertiveRegion = this.createLiveRegion('assertive');

    // Append to document when ready
    if (document.body) {
      document.body.appendChild(this.politeRegion);
      document.body.appendChild(this.assertiveRegion);
      this.isInitialized = true;
    } else {
      // Wait for DOM to be ready
      document.addEventListener('DOMContentLoaded', () => {
        if (this.politeRegion && this.assertiveRegion) {
          document.body.appendChild(this.politeRegion);
          document.body.appendChild(this.assertiveRegion);
          this.isInitialized = true;
        }
      });
    }
  }

  private createLiveRegion(politeness: Politeness): HTMLElement {
    const region = document.createElement('div');
    region.setAttribute('role', 'status');
    region.setAttribute('aria-live', politeness);
    region.setAttribute('aria-atomic', 'true');
    region.setAttribute('aria-relevant', 'additions text');
    region.setAttribute('data-a11y-announcer', politeness);

    // Visually hidden but accessible to screen readers
    Object.assign(region.style, {
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

    return region;
  }

  /**
   * Announce a message to screen readers
   */
  announce(message: string, options: AnnouncementOptions = {}): void {
    const {
      politeness = 'polite',
      timeout = 100,
      clearPrevious = false,
    } = options;

    if (!message.trim()) return;

    // Ensure initialized
    if (!this.isInitialized && typeof document !== 'undefined') {
      this.initialize();
    }

    if (clearPrevious) {
      this.clear();
    }

    // Debounce rapid announcements
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }

    this.debounceTimeout = setTimeout(() => {
      this.queueAnnouncement(message, politeness);
    }, timeout);
  }

  /**
   * Announce immediately (assertive)
   */
  announceImmediate(message: string): void {
    this.announce(message, { politeness: 'assertive', timeout: 0 });
  }

  /**
   * Announce politely (waits for pause in speech)
   */
  announcePolite(message: string): void {
    this.announce(message, { politeness: 'polite' });
  }

  /**
   * Announce an error
   */
  announceError(message: string): void {
    this.announce(`Error: ${message}`, { politeness: 'assertive' });
  }

  /**
   * Announce a success
   */
  announceSuccess(message: string): void {
    this.announce(message, { politeness: 'polite' });
  }

  /**
   * Announce loading state
   */
  announceLoading(
    isLoading: boolean,
    loadingMessage = 'Loading',
    loadedMessage = 'Content loaded'
  ): void {
    this.announce(isLoading ? loadingMessage : loadedMessage);
  }

  /**
   * Announce page/route change
   */
  announceRouteChange(pageName: string): void {
    this.announce(`Navigated to ${pageName}`, {
      politeness: 'polite',
      timeout: 500,
    });
  }

  /**
   * Announce form validation result
   */
  announceValidation(errors: string[]): void {
    if (errors.length === 0) {
      this.announceSuccess('Form is valid');
    } else if (errors.length === 1) {
      this.announceError(errors[0]);
    } else {
      this.announceError(
        `${errors.length} errors found. ${errors[0]}. Use Tab to navigate to each error.`
      );
    }
  }

  /**
   * Announce progress update
   */
  announceProgress(current: number, total: number, label?: string): void {
    const percentage = Math.round((current / total) * 100);
    const message = label
      ? `${label}: ${percentage}% complete`
      : `${percentage}% complete`;
    this.announce(message, { politeness: 'polite', clearPrevious: true });
  }

  /**
   * Announce list update
   */
  announceListUpdate(action: 'added' | 'removed' | 'reordered', itemName: string): void {
    const messages = {
      added: `${itemName} added`,
      removed: `${itemName} removed`,
      reordered: `${itemName} moved`,
    };
    this.announce(messages[action]);
  }

  /**
   * Clear all announcements
   */
  clear(): void {
    if (this.politeRegion) {
      this.politeRegion.textContent = '';
    }
    if (this.assertiveRegion) {
      this.assertiveRegion.textContent = '';
    }
    this.queue = [];
  }

  private queueAnnouncement(message: string, politeness: Politeness): void {
    this.queue.push({
      message,
      politeness,
      timestamp: Date.now(),
    });

    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const announcement = this.queue.shift()!;

      const region =
        announcement.politeness === 'assertive'
          ? this.assertiveRegion
          : this.politeRegion;

      if (region) {
        // Clear and set content (forces re-announcement)
        region.textContent = '';

        // Small delay to ensure screen reader picks up the change
        await this.delay(50);

        region.textContent = announcement.message;
      }

      // Wait between announcements
      await this.delay(1000);
    }

    this.isProcessing = false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Destroy the announcer
   */
  destroy(): void {
    this.politeRegion?.remove();
    this.assertiveRegion?.remove();
    this.queue = [];
    this.isInitialized = false;

    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }
  }
}

// Singleton instance
let announcerInstance: ScreenReaderAnnouncer | null = null;

/**
 * Get the global announcer instance
 */
export function getAnnouncer(): ScreenReaderAnnouncer {
  if (!announcerInstance) {
    announcerInstance = new ScreenReaderAnnouncer();
  }
  return announcerInstance;
}

/**
 * Destroy the global announcer instance
 */
export function destroyAnnouncer(): void {
  announcerInstance?.destroy();
  announcerInstance = null;
}

// Convenience functions
export const announce = (message: string, options?: AnnouncementOptions) =>
  getAnnouncer().announce(message, options);

export const announceError = (message: string) =>
  getAnnouncer().announceError(message);

export const announceSuccess = (message: string) =>
  getAnnouncer().announceSuccess(message);

export const announceRouteChange = (pageName: string) =>
  getAnnouncer().announceRouteChange(pageName);

export const announcePolite = (message: string) =>
  getAnnouncer().announcePolite(message);

export const announceImmediate = (message: string) =>
  getAnnouncer().announceImmediate(message);

export const announceLoading = (
  isLoading: boolean,
  loadingMessage?: string,
  loadedMessage?: string
) => getAnnouncer().announceLoading(isLoading, loadingMessage, loadedMessage);

export const announceProgress = (current: number, total: number, label?: string) =>
  getAnnouncer().announceProgress(current, total, label);

export { ScreenReaderAnnouncer };
