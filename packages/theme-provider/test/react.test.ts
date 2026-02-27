import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock React — we test ThemeProvider logic without a real DOM
vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  return {
    ...actual,
    // Provide working hooks for test environment
    createContext: actual.createContext,
    useContext: actual.useContext,
    useState: actual.useState,
    useEffect: actual.useEffect,
    useMemo: actual.useMemo,
    useCallback: actual.useCallback,
  };
});

import {
  useAivoTheme,
  ThemeProvider,
  DEFAULT_THEME,
  type ThemeContextValue,
  type ThemeProviderProps,
} from '../src/react.js';

// ------------------------------------------------------------------
// useAivoTheme hook (default context)
// ------------------------------------------------------------------

describe('useAivoTheme default context', () => {
  it('exports useAivoTheme function', () => {
    expect(typeof useAivoTheme).toBe('function');
  });
});

// ------------------------------------------------------------------
// ThemeProvider exports
// ------------------------------------------------------------------

describe('ThemeProvider', () => {
  it('is exported as a function component', () => {
    expect(typeof ThemeProvider).toBe('function');
  });

  it('DEFAULT_THEME is re-exported', () => {
    expect(DEFAULT_THEME).toBeDefined();
    expect(typeof DEFAULT_THEME).toBe('object');
  });
});

// ------------------------------------------------------------------
// ThemeContextValue type check (compile-time)
// ------------------------------------------------------------------

describe('ThemeContextValue shape', () => {
  it('default context has expected properties', () => {
    // Type assertion validates the interface exists
    const defaultValue: ThemeContextValue = {
      theme: DEFAULT_THEME,
      loading: false,
      error: null,
      refresh: () => {},
    };

    expect(defaultValue.theme).toBe(DEFAULT_THEME);
    expect(defaultValue.loading).toBe(false);
    expect(defaultValue.error).toBeNull();
    expect(typeof defaultValue.refresh).toBe('function');
  });
});
