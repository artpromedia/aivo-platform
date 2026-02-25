/**
 * @aivo/theme-provider/react
 *
 * React context provider that fetches tenant branding from the API
 * and applies CSS custom properties to the document root.
 *
 * Usage in a Next.js layout:
 *
 *   import { ThemeProvider } from '@aivo/theme-provider/react';
 *
 *   export default function RootLayout({ children }) {
 *     return (
 *       <html>
 *         <body>
 *           <ThemeProvider>{children}</ThemeProvider>
 *         </body>
 *       </html>
 *     );
 *   }
 */

'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  type AivoTheme,
  DEFAULT_THEME,
  themeToCssVars,
} from './index';

/* -------------------------------------------------------------------------- */
/*  Context                                                                    */
/* -------------------------------------------------------------------------- */

export interface ThemeContextValue {
  /** Current resolved theme */
  theme: AivoTheme;
  /** Whether the theme is still being fetched */
  loading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Force a re-fetch of the theme */
  refresh: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: DEFAULT_THEME,
  loading: false,
  error: null,
  refresh: () => { /* noop */ },
});

export const useAivoTheme = () => useContext(ThemeContext);

/* -------------------------------------------------------------------------- */
/*  Provider props                                                             */
/* -------------------------------------------------------------------------- */

export interface ThemeProviderProps {
  children: ReactNode;

  /**
   * Explicit domain to resolve branding for.
   * If omitted, `window.location.hostname` is used automatically.
   */
  domain?: string;

  /**
   * Base URL for the branding API.
   * Defaults to `/api/branding` (for Next.js proxy) or the tenant-svc URL.
   */
  brandingApiUrl?: string;

  /**
   * Initial theme to use while fetching.
   * Defaults to `DEFAULT_THEME`.
   */
  initialTheme?: AivoTheme;

  /**
   * If true, skip the API fetch and just use `initialTheme`.
   * Useful for SSR or testing.
   */
  staticMode?: boolean;
}

/* -------------------------------------------------------------------------- */
/*  Provider component                                                         */
/* -------------------------------------------------------------------------- */

export function ThemeProvider({
  children,
  domain,
  brandingApiUrl,
  initialTheme,
  staticMode = false,
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<AivoTheme>(initialTheme ?? DEFAULT_THEME);
  const [loading, setLoading] = useState(!staticMode);
  const [error, setError] = useState<string | null>(null);
  const [fetchKey, setFetchKey] = useState(0);

  const refresh = useCallback(() => { setFetchKey((k) => k + 1); }, []);

  // Resolve the domain to use
  const resolvedDomain = useMemo(() => {
    if (domain) return domain;
    if (typeof window !== 'undefined') return window.location.hostname;
    return null;
  }, [domain]);

  // Resolve the API URL
  const apiUrl = useMemo(() => {
    if (brandingApiUrl) return brandingApiUrl;
    // Default: proxy through the app's own API route
    return '/api/branding';
  }, [brandingApiUrl]);

  /* ------ Fetch branding from API --------------------------------------- */

  useEffect(() => {
    if (staticMode || !resolvedDomain) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const fetchBranding = async () => {
      try {
        const url = `${apiUrl}?domain=${encodeURIComponent(resolvedDomain)}`;
        const res = await fetch(url, {
          headers: { Accept: 'application/json' },
          cache: 'default',
        });

        if (!res.ok) {
          throw new Error(`Branding API returned ${res.status}`);
        }

        const data = (await res.json()) as Partial<AivoTheme>;
        if (!cancelled) {
          setTheme(mergeTheme(data));
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to load branding',
          );
          // Keep current theme (default or initial) on error
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchBranding();
    return () => {
      cancelled = true;
    };
  }, [resolvedDomain, apiUrl, fetchKey, staticMode]);

  /* ------ Apply CSS custom properties to :root -------------------------- */

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    const vars = themeToCssVars(theme);

    for (const [prop, value] of Object.entries(vars)) {
      root.style.setProperty(prop, value);
    }

    // Update document title
    if (theme.displayName) {
      document.title = document.title.replace(/^[^|–—-]+/, `${theme.displayName} `);
    }

    // Update favicon
    if (theme.faviconUrl) {
      let link = document.querySelector<HTMLLinkElement>(
        'link[rel="icon"]',
      );
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = theme.faviconUrl;
    }

    // Cleanup: remove custom properties on unmount
    return () => {
      for (const prop of Object.keys(vars)) {
        root.style.removeProperty(prop);
      }
    };
  }, [theme]);

  /* ------ Render -------------------------------------------------------- */

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, loading, error, refresh }),
    [theme, loading, error, refresh],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/** Merge partial API response with defaults to ensure all fields present */
function mergeTheme(partial: Partial<AivoTheme>): AivoTheme {
  return {
    ...DEFAULT_THEME,
    ...Object.fromEntries(
      Object.entries(partial).filter(([, v]) => v != null),
    ),
  } as AivoTheme;
}

export { DEFAULT_THEME, type AivoTheme } from './index';
