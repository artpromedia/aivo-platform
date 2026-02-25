'use client';

import React, { useEffect, useState } from 'react';

interface ImpersonationBannerProps {
  /** Admin user ID performing the impersonation */
  adminUserId: string;
  /** Whether the session is read-only */
  readOnly: boolean;
  /** ISO expiry timestamp */
  expiresAt: string;
  /** Impersonation session ID */
  sessionId: string;
  /** Optional callback to end the impersonation session */
  onEndSession?: () => void;
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
 * A prominent banner displayed at the top of the page when the current
 * session is an impersonated session. Shows admin info, remaining time,
 * read-only badge, and an optional button to end the session.
 *
 * Usage:
 * ```tsx
 * {session.isImpersonated && session.impersonation && (
 *   <ImpersonationBanner {...session.impersonation} />
 * )}
 * ```
 */
export function ImpersonationBanner({
  adminUserId,
  readOnly,
  expiresAt,
  sessionId,
  onEndSession,
}: ImpersonationBannerProps) {
  const [timeLeft, setTimeLeft] = useState(() => formatTimeRemaining(expiresAt));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(formatTimeRemaining(expiresAt));
    }, 30_000);
    return () => clearInterval(timer);
  }, [expiresAt]);

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
        background: isExpired
          ? '#dc2626' /* red-600 */
          : '#d97706' /* amber-600 */,
        color: '#ffffff',
        fontSize: '14px',
        fontWeight: 600,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        lineHeight: '1.5',
        flexWrap: 'wrap' as const,
      }}
    >
      {/* Shield icon */}
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
          {adminUserId.slice(0, 8)}…
        </span>
        )
      </span>

      {readOnly && (
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

      {onEndSession && !isExpired && (
        <button
          type="button"
          onClick={onEndSession}
          style={{
            padding: '4px 12px',
            background: '#ffffff',
            color: '#92400e' /* amber-800 */,
            border: 'none',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          End Session
        </button>
      )}

      <span
        style={{
          fontSize: '10px',
          opacity: 0.7,
          fontFamily: 'monospace',
        }}
        title={`Session: ${sessionId}`}
      >
        ID: {sessionId.slice(0, 8)}
      </span>
    </div>
  );
}
