'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

import type { FeatureAnnouncement } from './types.js';

// ─── useFeatureSeen Hook ──────────────────────────────────────────────

interface UseFeatureSeenOptions {
  apiBase?: string;
}

export function useFeatureSeen(
  featureKey: string,
  { apiBase = '/api/onboarding' }: UseFeatureSeenOptions = {},
) {
  const [seen, setSeen] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${apiBase}/features/check`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ featureKeys: [featureKey] }),
        });
        if (res.ok) {
          const data = await res.json();
          setSeen(data[featureKey] ?? false);
        } else {
          setSeen(false);
        }
      } catch {
        setSeen(false);
      }
    })();
  }, [apiBase, featureKey]);

  const markSeen = useCallback(async () => {
    setSeen(true);
    try {
      await fetch(`${apiBase}/features/seen`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featureKey }),
      });
    } catch {
      // Optimistic — already set to true
    }
  }, [apiBase, featureKey]);

  return { seen, markSeen };
}

// ─── Inline Styles ────────────────────────────────────────────────────

const styles = {
  wrapper: {
    position: 'relative',
    display: 'inline-block',
  } as React.CSSProperties,

  pulse: {
    position: 'absolute',
    top: '-4px',
    right: '-4px',
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    backgroundColor: '#3b82f6',
    zIndex: 10,
    animation: 'aivo-pulse 2s ease-in-out infinite',
  } as React.CSSProperties,

  tooltip: (position: string) => {
    const base: React.CSSProperties = {
      position: 'absolute',
      zIndex: 1000,
      width: '280px',
      backgroundColor: '#ffffff',
      borderRadius: '10px',
      border: '1px solid #e5e7eb',
      boxShadow: '0 10px 25px rgba(0,0,0,0.12), 0 4px 10px rgba(0,0,0,0.06)',
      padding: '16px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      animation: 'aivo-fadein 0.2s ease-out',
    };

    switch (position) {
      case 'top':
        return { ...base, bottom: 'calc(100% + 10px)', left: '50%', transform: 'translateX(-50%)' };
      case 'bottom':
        return { ...base, top: 'calc(100% + 10px)', left: '50%', transform: 'translateX(-50%)' };
      case 'left':
        return { ...base, right: 'calc(100% + 10px)', top: '50%', transform: 'translateY(-50%)' };
      case 'right':
        return { ...base, left: 'calc(100% + 10px)', top: '50%', transform: 'translateY(-50%)' };
      default:
        return { ...base, bottom: 'calc(100% + 10px)', left: '50%', transform: 'translateX(-50%)' };
    }
  },

  arrow: (position: string) => {
    const base: React.CSSProperties = {
      position: 'absolute',
      width: '10px',
      height: '10px',
      backgroundColor: '#ffffff',
      border: '1px solid #e5e7eb',
      transform: 'rotate(45deg)',
    };

    switch (position) {
      case 'top':
        return { ...base, bottom: '-6px', left: '50%', marginLeft: '-5px', borderTop: 'none', borderLeft: 'none' };
      case 'bottom':
        return { ...base, top: '-6px', left: '50%', marginLeft: '-5px', borderBottom: 'none', borderRight: 'none' };
      case 'left':
        return { ...base, right: '-6px', top: '50%', marginTop: '-5px', borderBottom: 'none', borderLeft: 'none' };
      case 'right':
        return { ...base, left: '-6px', top: '50%', marginTop: '-5px', borderTop: 'none', borderRight: 'none' };
      default:
        return { ...base, bottom: '-6px', left: '50%', marginLeft: '-5px', borderTop: 'none', borderLeft: 'none' };
    }
  },

  badge: {
    display: 'inline-block',
    fontSize: '10px',
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    backgroundColor: '#dbeafe',
    color: '#2563eb',
    padding: '2px 8px',
    borderRadius: '10px',
    marginBottom: '8px',
    letterSpacing: '0.05em',
  } as React.CSSProperties,

  title: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#111827',
    margin: '0 0 4px',
  } as React.CSSProperties,

  description: {
    fontSize: '13px',
    color: '#6b7280',
    lineHeight: '1.5',
    margin: '0 0 12px',
  } as React.CSSProperties,

  actions: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as React.CSSProperties,

  learnMore: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#3b82f6',
    textDecoration: 'none',
    cursor: 'pointer',
  } as React.CSSProperties,

  gotIt: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#ffffff',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '6px',
    padding: '6px 14px',
    cursor: 'pointer',
  } as React.CSSProperties,
};

// ─── Style Injection ──────────────────────────────────────────────────

const STYLE_ID = 'aivo-feature-announcements-keyframes';

function ensureKeyframes() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes aivo-pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.6; transform: scale(1.3); }
    }
    @keyframes aivo-fadein {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);
}

// ─── FeatureHighlight Component ───────────────────────────────────────

export interface FeatureHighlightProps {
  feature: FeatureAnnouncement;
  /** The element to wrap with the tooltip */
  children: React.ReactNode;
  /** API base path for the onboarding/feature service */
  apiBase?: string;
}

export function FeatureHighlight({
  feature,
  children,
  apiBase = '/api/onboarding',
}: FeatureHighlightProps) {
  const { seen, markSeen } = useFeatureSeen(feature.key, { apiBase });
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const position = feature.position ?? 'top';
  const showPulse = feature.showPulse ?? true;

  // Inject keyframes on mount
  useEffect(() => {
    ensureKeyframes();
  }, []);

  // Once we know it hasn't been seen, auto-show the tooltip
  useEffect(() => {
    if (seen === false) {
      // Small delay so the element is rendered first
      const t = setTimeout(() => { setOpen(true); }, 500);
      return () => { clearTimeout(t); };
    }
  }, [seen]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        handleDismiss();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => { document.removeEventListener('mousedown', handler); };
  });

  const handleDismiss = useCallback(() => {
    setOpen(false);
    void markSeen();
  }, [markSeen]);

  // Don't render anything extra while loading or if already seen
  if (seen === null || seen) {
    return <>{children}</>;
  }

  return (
    <div ref={wrapperRef} style={styles.wrapper}>
      {children}

      {/* Pulsing indicator */}
      {showPulse && !open && <div style={styles.pulse} />}

      {/* Tooltip */}
      {open && (
        <div style={styles.tooltip(position)}>
          <div style={styles.arrow(position)} />

          {feature.badge && <span style={styles.badge}>{feature.badge}</span>}

          <h4 style={styles.title}>{feature.title}</h4>
          <p style={styles.description}>{feature.description}</p>

          <div style={styles.actions}>
            {feature.learnMoreUrl ? (
              <a
                href={feature.learnMoreUrl}
                style={styles.learnMore}
                target="_blank"
                rel="noopener noreferrer"
              >
                {feature.learnMoreLabel ?? 'Learn more'}
              </a>
            ) : (
              <span />
            )}
            <button type="button" style={styles.gotIt} onClick={handleDismiss}>
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
