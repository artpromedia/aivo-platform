'use client';

import { Button, Card } from '@aivo/ui-web';
import { useState } from 'react';

import { cn } from '../../lib/cn';
import type { LearningObjectVersion, AccessibilityJson } from '../../lib/types';

interface AccessibilityTabProps {
  version: LearningObjectVersion;
  canEdit: boolean;
  onSave: (updates: { accessibilityJson: AccessibilityJson }) => Promise<void>;
}

export function AccessibilityTab({ version, canEdit, onSave }: AccessibilityTabProps) {
  const [accessibility, setAccessibility] = useState<AccessibilityJson>(
    version.accessibilityJson || {}
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ accessibilityJson: accessibility });
    } finally {
      setSaving(false);
    }
  };

  const updateField = <K extends keyof AccessibilityJson>(key: K, value: AccessibilityJson[K]) => {
    setAccessibility((prev) => ({ ...prev, [key]: value }));
  };

  const toggleField = (key: keyof AccessibilityJson) => {
    setAccessibility((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-6">
      <Card title="Text Alternatives">
        <div className="space-y-4">
          <div>
            <label htmlFor="altText" className="block text-sm font-medium text-text">
              Alt Text for Media
            </label>
            <textarea
              id="altText"
              value={accessibility.altText || ''}
              onChange={(e) => {
                updateField('altText', e.target.value);
              }}
              disabled={!canEdit}
              rows={3}
              className="mt-1 block w-full rounded-lg border border-border bg-surface px-3 py-2 text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-60"
              placeholder="Describe any images, diagrams, or other visual content..."
            />
            <p className="mt-1 text-xs text-muted">Provide descriptive text for screen readers.</p>
          </div>

          <div>
            <label htmlFor="readingLevelMetadata" className="block text-sm font-medium text-text">
              Reading Level Metadata
            </label>
            <input
              id="readingLevelMetadata"
              type="text"
              value={accessibility.readingLevelMetadata || ''}
              onChange={(e) => {
                updateField('readingLevelMetadata', e.target.value);
              }}
              disabled={!canEdit}
              className="mt-1 block w-full rounded-lg border border-border bg-surface px-3 py-2 text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-60"
              placeholder="e.g., Grade 4, Lexile 650"
            />
          </div>
        </div>
      </Card>

      <Card title="Accessibility Supports">
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Indicate which accessibility features this content supports.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <AccessibilityToggle
              label="Dyslexia-Friendly Font"
              description="Content can be displayed with OpenDyslexic or similar fonts"
              checked={accessibility.supportsDyslexiaFriendlyFont ?? false}
              onChange={() => {
                toggleField('supportsDyslexiaFriendlyFont');
              }}
              disabled={!canEdit}
            />
            <AccessibilityToggle
              label="Reduced Stimuli"
              description="Content works with simplified visual presentation"
              checked={accessibility.supportsReducedStimuli ?? false}
              onChange={() => {
                toggleField('supportsReducedStimuli');
              }}
              disabled={!canEdit}
            />
            <AccessibilityToggle
              label="High Contrast"
              description="Content is readable in high contrast mode"
              checked={accessibility.supportsHighContrast ?? false}
              onChange={() => {
                toggleField('supportsHighContrast');
              }}
              disabled={!canEdit}
            />
            <AccessibilityToggle
              label="Screen Reader"
              description="Content is fully accessible via screen reader"
              checked={accessibility.supportsScreenReader ?? false}
              onChange={() => {
                toggleField('supportsScreenReader');
              }}
              disabled={!canEdit}
            />
          </div>
        </div>
      </Card>

      <Card title="Supplementary Resources">
        <div className="space-y-4">
          <div>
            <label htmlFor="audioDescriptionUrl" className="block text-sm font-medium text-text">
              Audio Description URL
            </label>
            <input
              id="audioDescriptionUrl"
              type="url"
              value={accessibility.audioDescriptionUrl || ''}
              onChange={(e) => {
                updateField('audioDescriptionUrl', e.target.value);
              }}
              disabled={!canEdit}
              className="mt-1 block w-full rounded-lg border border-border bg-surface px-3 py-2 text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-60"
              placeholder="https://..."
            />
            <p className="mt-1 text-xs text-muted">Link to audio version of the content.</p>
          </div>

          <div>
            <label htmlFor="signLanguageVideoUrl" className="block text-sm font-medium text-text">
              Sign Language Video URL
            </label>
            <input
              id="signLanguageVideoUrl"
              type="url"
              value={accessibility.signLanguageVideoUrl || ''}
              onChange={(e) => {
                updateField('signLanguageVideoUrl', e.target.value);
              }}
              disabled={!canEdit}
              className="mt-1 block w-full rounded-lg border border-border bg-surface px-3 py-2 text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-60"
              placeholder="https://..."
            />
            <p className="mt-1 text-xs text-muted">Link to ASL/BSL interpretation video.</p>
          </div>
        </div>
      </Card>

      {canEdit && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Accessibility Settings'}
          </Button>
        </div>
      )}
    </div>
  );
}

interface AccessibilityToggleProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
  disabled: boolean;
}

function AccessibilityToggle({
  label,
  description,
  checked,
  onChange,
  disabled,
}: AccessibilityToggleProps) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors',
        checked ? 'border-primary bg-primary/5' : 'border-border',
        disabled && 'cursor-not-allowed opacity-60'
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary"
      />
      <div>
        <div className="font-medium text-text">{label}</div>
        <div className="text-xs text-muted">{description}</div>
      </div>
    </label>
  );
}
