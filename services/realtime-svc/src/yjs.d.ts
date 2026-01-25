/**
 * Type declarations for yjs module
 * This file helps TypeScript resolve the yjs module when using bundler moduleResolution
 */
declare module 'yjs' {
  export class Doc {
    constructor();
    destroy(): void;
    getText(name?: string): Text;
    getArray<T>(name?: string): Array<T>;
    getMap<T>(name?: string): Map<T>;
    on(event: string, callback: (...args: unknown[]) => void): void;
    off(event: string, callback: (...args: unknown[]) => void): void;
  }

  export class Text {
    insert(index: number, text: string, attributes?: Record<string, unknown>): void;
    delete(index: number, length: number): void;
    toString(): string;
    toJSON(): string;
  }

  export class Array<T> {
    insert(index: number, content: T[]): void;
    delete(index: number, length: number): void;
    push(content: T[]): void;
    get(index: number): T;
    toArray(): T[];
    toJSON(): T[];
    length: number;
  }

  export class Map<T> {
    set(key: string, value: T): void;
    get(key: string): T | undefined;
    delete(key: string): void;
    has(key: string): boolean;
    toJSON(): Record<string, T>;
  }

  export function applyUpdate(doc: Doc, update: Uint8Array, origin?: unknown): void;
  export function encodeStateAsUpdate(doc: Doc, encodedTargetStateVector?: Uint8Array): Uint8Array;
  export function encodeStateVector(doc: Doc): Uint8Array;
}
