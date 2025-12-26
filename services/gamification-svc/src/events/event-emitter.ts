/**
 * Simple Event Emitter for Gamification Events
 */

type EventHandler = (...args: unknown[]) => void | Promise<void>;

class EventEmitter {
  private handlers: Map<string, Set<EventHandler>> = new Map();

  on(event: string, handler: EventHandler): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
  }

  off(event: string, handler: EventHandler): void {
    this.handlers.get(event)?.delete(handler);
  }

  emit(event: string, ...args: unknown[]): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      for (const handler of handlers) {
        try {
          void handler(...args);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      }
    }
  }

  async emitAsync(event: string, ...args: unknown[]): Promise<void> {
    const handlers = this.handlers.get(event);
    if (handlers) {
      await Promise.all(
        Array.from(handlers).map(async (handler) => {
          try {
            await handler(...args);
          } catch (error) {
            console.error(`Error in async event handler for ${event}:`, error);
          }
        })
      );
    }
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.handlers.delete(event);
    } else {
      this.handlers.clear();
    }
  }
}

export const eventEmitter = new EventEmitter();
export type { EventEmitter };
