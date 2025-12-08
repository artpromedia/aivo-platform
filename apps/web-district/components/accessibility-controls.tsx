'use client';

import { useAccessibility } from '@aivo/ui-web';
import React from 'react';

function ToggleButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-semibold transition focus:outline-none focus-visible:ring focus-visible:ring-focus/80
        ${active ? 'border-primary bg-primary text-on-accent' : 'border-border bg-surface text-muted hover:bg-surface-muted'}`}
    >
      {label}
    </button>
  );
}

export function AccessibilityControls() {
  const { highContrast, dyslexia, reducedMotion, setPreferences, reset } = useAccessibility();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <ToggleButton
        label="High contrast"
        active={highContrast}
        onClick={() => {
          setPreferences({ highContrast: !highContrast });
        }}
      />
      <ToggleButton
        label="Dyslexia font"
        active={dyslexia}
        onClick={() => {
          setPreferences({ dyslexia: !dyslexia });
        }}
      />
      <ToggleButton
        label="Reduced motion"
        active={reducedMotion}
        onClick={() => {
          setPreferences({ reducedMotion: !reducedMotion });
        }}
      />
      <button
        type="button"
        onClick={reset}
        className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted transition hover:bg-surface-muted focus:outline-none focus-visible:ring focus-visible:ring-focus/80"
      >
        Reset
      </button>
    </div>
  );
}
