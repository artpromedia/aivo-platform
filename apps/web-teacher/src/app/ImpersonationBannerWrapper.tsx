'use client';

import { useEffect, useState } from 'react';

interface ImpersonationState {
  sessionId: string;
  adminUserId: string;
  readOnly: boolean;
  expiresAt: string;
}

function formatTimeRemaining(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${minutes}m remaining`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m remaining`;
}

/**
 * Renders an impersonation banner when the current session is impersonated.
 * Fetches session state from /api/auth/session independently.
 */
export function ImpersonationBannerWrapper() {
  const [impersonation, setImpersonation] = useState<ImpersonationState | null>(null);
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch('/api/auth/session', { credentials: 'same-origin' });
        if (!res.ok) return;
        const data = await res.json() as {
          session?: { isImpersonated?: boolean; impersonation?: ImpersonationState };
        };
        if (data.session?.isImpersonated && data.session.impersonation) {
          setImpersonation(data.session.impersonation);
          setTimeLeft(formatTimeRemaining(data.session.impersonation.expiresAt));
        }
      } catch {
        // Silently ignore - not critical
      }
    }
    void checkSession();
  }, []);

  useEffect(() => {
    if (!impersonation) return;
    const timer = setInterval(() => {
      setTimeLeft(formatTimeRemaining(impersonation.expiresAt));
    }, 30_000);
    return () => { clearInterval(timer); };
  }, [impersonation]);

  if (!impersonation) return null;

  const isExpired = timeLeft === 'Expired';

  return (
    <div
      role="alert"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        padding: '8px 16px',
        background: isExpired ? '#dc2626' : '#d97706',
        color: '#ffffff',
        fontSize: '14px',
        fontWeight: 600,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        lineHeight: '1.5',
        flexWrap: 'wrap' as const,
      }}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
      <span>
        Impersonation Active — Viewing as this user (admin:{' '}
        <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>
          {impersonation.adminUserId.slice(0, 8)}…
        </span>
        )
      </span>
      {impersonation.readOnly && (
        <span
          style={{
            display: 'inline-block',
            padding: '2px 8px',
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Read-Only
        </span>
      )}
      <span
        style={{
          display: 'inline-block',
          padding: '2px 8px',
          background: 'rgba(0,0,0,0.15)',
          borderRadius: '4px',
          fontSize: '12px',
        }}
      >
        {timeLeft}
      </span>
      <span
        style={{
          fontSize: '10px',
          opacity: 0.7,
          fontFamily: 'monospace',
        }}
        title={`Session: ${impersonation.sessionId}`}
      >
        ID: {impersonation.sessionId.slice(0, 8)}
      </span>
    </div>
  );
}
