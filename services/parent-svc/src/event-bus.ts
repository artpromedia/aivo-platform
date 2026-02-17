/**
 * Simple Event Bus
 *
 * Lightweight replacement for NestJS EventEmitter2.
 * Uses Node.js built-in EventEmitter for domain event emission.
 */

import { EventEmitter } from 'node:events';

export const eventBus = new EventEmitter();
eventBus.setMaxListeners(50);
