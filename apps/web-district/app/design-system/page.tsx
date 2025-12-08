'use client';

import { Badge, Button, Card, Heading, useAccessibility, useGradeTheme } from '@aivo/ui-web';
import { useMemo } from 'react';

const sampleItems = [
  { title: 'Primary action', variant: 'primary' as const },
  { title: 'Secondary action', variant: 'secondary' as const },
  { title: 'Ghost action', variant: 'ghost' as const },
];

function ControlPanel() {
  const { grade, setGrade, availableGrades, labels } = useGradeTheme();
  const { highContrast, dyslexia, reducedMotion, setPreferences, reset } = useAccessibility();

  const gradeOptions = useMemo(
    () => availableGrades.map((g) => ({ value: g, label: labels[g] })),
    [availableGrades, labels]
  );

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4 shadow">
      <div className="flex flex-wrap gap-3">
        <label className="flex items-center gap-2 text-sm font-semibold text-muted">
          Grade band
          <select
            value={grade}
            onChange={(e) => {
              setGrade(e.target.value);
            }}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          >
            {gradeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-text">
          <input
            type="checkbox"
            checked={highContrast}
            onChange={(e) => {
              setPreferences({ highContrast: e.target.checked });
            }}
          />
          High contrast
        </label>
        <label className="flex items-center gap-2 text-sm text-text">
          <input
            type="checkbox"
            checked={dyslexia}
            onChange={(e) => {
              setPreferences({ dyslexia: e.target.checked });
            }}
          />
          Dyslexia-friendly font
        </label>
        <label className="flex items-center gap-2 text-sm text-text">
          <input
            type="checkbox"
            checked={reducedMotion}
            onChange={(e) => {
              setPreferences({ reducedMotion: e.target.checked });
            }}
          />
          Reduced motion
        </label>
        <button
          type="button"
          onClick={reset}
          className="rounded-lg border border-border px-3 py-1 text-sm text-muted hover:bg-surface-muted"
        >
          Reset
        </button>
      </div>
    </div>
  );
}

function ComponentShowcase() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <div className="flex items-center justify-between">
          <Heading level={2}>Buttons</Heading>
          <Badge tone="info">Interactive</Badge>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          {sampleItems.map((item) => (
            <Button key={item.title} variant={item.variant}>
              {item.title}
            </Button>
          ))}
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <Heading level={2}>Card + text</Heading>
          <Badge tone="success">Layout</Badge>
        </div>
        <p className="mt-3 text-muted">
          Cards inherit theme colors, radius, and shadow tokens. Typography follows the grade-band
          scale.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Card>
            <Heading level={3}>Nested card</Heading>
            <p className="mt-2 text-muted">Uses surface-muted background in this theme.</p>
            <Button className="mt-3 text-sm">Primary</Button>
          </Card>
          <Card>
            <Heading level={3}>Emphasis</Heading>
            <p className="mt-2 text-muted">
              Try toggling high contrast to verify text/background contrast.
            </p>
            <Button className="mt-3 text-sm" variant="secondary">
              Secondary
            </Button>
          </Card>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <Heading level={2}>Typography</Heading>
          <Badge tone="warning">Scale</Badge>
        </div>
        <div className="mt-3 space-y-2 text-text">
          <Heading level={1}>Display — Grade tuned</Heading>
          <Heading level={2}>Headline — Token driven</Heading>
          <Heading level={3}>Title — Contextual</Heading>
          <p className="text-body font-semibold">Body — Readability</p>
          <p className="text-muted">
            Dyslexia toggle swaps font family across the page. Reduced motion affects transitions,
            while high contrast swaps palette tokens.
          </p>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <Heading level={2}>Badges</Heading>
          <Badge tone="info">States</Badge>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge tone="info">Info</Badge>
          <Badge tone="success">Success</Badge>
          <Badge tone="warning">Warning</Badge>
          <Badge tone="error">Error</Badge>
        </div>
      </Card>
    </div>
  );
}

export default function DesignSystemPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <div className="flex items-center justify-between gap-3">
        <Heading level={2}>Design System Gallery</Heading>
        <p className="text-sm text-muted">
          Live components driven by tokens, grade themes, and a11y toggles.
        </p>
      </div>
      <ControlPanel />
      <ComponentShowcase />
    </div>
  );
}
