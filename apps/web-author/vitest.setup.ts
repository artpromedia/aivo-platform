import '@testing-library/jest-dom/vitest';

// Mock matchMedia (jsdom doesn't implement it)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    addListener: () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    removeListener: () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    addEventListener: () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
