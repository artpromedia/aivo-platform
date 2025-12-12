'use client';

import { useState } from 'react';
import {
  updateEmbeddedToolConfig,
  type EmbeddedToolConfig,
  TOOL_SCOPES,
} from '../../../lib/api';

interface EmbeddedToolEditorProps {
  vendorId: string;
  itemId: string;
  versionId: string;
  config: EmbeddedToolConfig | null;
  readOnly: boolean;
  onUpdate?: (config: EmbeddedToolConfig) => void;
}

export function EmbeddedToolEditor({
  vendorId,
  itemId,
  versionId,
  config: initialConfig,
  readOnly,
  onUpdate,
}: EmbeddedToolEditorProps) {
  const [config, setConfig] = useState<EmbeddedToolConfig | null>(initialConfig);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form state
  const [launchUrl, setLaunchUrl] = useState(config?.launchUrl ?? '');
  const [requiredScopes, setRequiredScopes] = useState<string[]>(config?.requiredScopes ?? []);
  const [optionalScopes, setOptionalScopes] = useState<string[]>(config?.optionalScopes ?? []);
  const [sandboxFlags, setSandboxFlags] = useState<string[]>(config?.sandboxAttributes ?? []);
  const [configJson, setConfigJson] = useState(
    config?.defaultConfigJson ? JSON.stringify(config.defaultConfigJson, null, 2) : '{}'
  );

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      // Validate JSON
      let parsedConfigJson = null;
      if (configJson.trim()) {
        try {
          parsedConfigJson = JSON.parse(configJson);
        } catch {
          setError('Invalid JSON in config');
          return;
        }
      }

      const response = await updateEmbeddedToolConfig(vendorId, itemId, versionId, {
        launchUrl,
        requiredScopes,
        optionalScopes: optionalScopes.length > 0 ? optionalScopes : undefined,
        sandboxFlags: sandboxFlags.length > 0 ? sandboxFlags : undefined,
        configJson: parsedConfigJson,
      });

      setConfig(response.data);
      setIsEditing(false);
      onUpdate?.(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setLaunchUrl(config?.launchUrl ?? '');
    setRequiredScopes(config?.requiredScopes ?? []);
    setOptionalScopes(config?.optionalScopes ?? []);
    setSandboxFlags(config?.sandboxAttributes ?? []);
    setConfigJson(config?.defaultConfigJson ? JSON.stringify(config.defaultConfigJson, null, 2) : '{}');
    setIsEditing(false);
    setError(null);
  };

  const handleScopeToggle = (scope: string, type: 'required' | 'optional') => {
    if (type === 'required') {
      setRequiredScopes((prev) =>
        prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
      );
      // Remove from optional if adding to required
      if (!requiredScopes.includes(scope)) {
        setOptionalScopes((prev) => prev.filter((s) => s !== scope));
      }
    } else {
      setOptionalScopes((prev) =>
        prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
      );
      // Remove from required if adding to optional
      if (!optionalScopes.includes(scope)) {
        setRequiredScopes((prev) => prev.filter((s) => s !== scope));
      }
    }
  };

  const SANDBOX_FLAGS = [
    'allow-scripts',
    'allow-same-origin',
    'allow-forms',
    'allow-popups',
    'allow-modals',
  ];

  if (!config && !isEditing) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center">
        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-muted p-3">
          <svg className="h-full w-full text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <p className="text-muted-foreground">No embedded tool configuration</p>
        {!readOnly && (
          <button
            onClick={() => setIsEditing(true)}
            className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Configure Tool
          </button>
        )}
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="space-y-6">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        {/* Launch URL */}
        <div>
          <label className="block text-sm font-medium">Launch URL *</label>
          <p className="mt-0.5 text-xs text-muted-foreground">
            The URL to load in the embedded iframe when launching this tool
          </p>
          <input
            type="url"
            value={launchUrl}
            onChange={(e) => setLaunchUrl(e.target.value)}
            placeholder="https://tool.example.com/launch"
            className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </div>

        {/* Required Scopes */}
        <div>
          <label className="block text-sm font-medium">Required Scopes *</label>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Scopes that must be granted for the tool to function
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {TOOL_SCOPES.map((scope) => (
              <button
                key={scope.value}
                onClick={() => handleScopeToggle(scope.value, 'required')}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  requiredScopes.includes(scope.value)
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
                title={scope.description}
              >
                {scope.label}
              </button>
            ))}
          </div>
        </div>

        {/* Optional Scopes */}
        <div>
          <label className="block text-sm font-medium">Optional Scopes</label>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Additional scopes that enhance the tool but aren&apos;t required
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {TOOL_SCOPES.filter((scope) => !requiredScopes.includes(scope.value)).map((scope) => (
              <button
                key={scope.value}
                onClick={() => handleScopeToggle(scope.value, 'optional')}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  optionalScopes.includes(scope.value)
                    ? 'bg-blue-500 text-white'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
                title={scope.description}
              >
                {scope.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sandbox Flags */}
        <div>
          <label className="block text-sm font-medium">Sandbox Flags</label>
          <p className="mt-0.5 text-xs text-muted-foreground">
            iframe sandbox attributes (security restrictions)
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {SANDBOX_FLAGS.map((flag) => (
              <button
                key={flag}
                onClick={() =>
                  setSandboxFlags((prev) =>
                    prev.includes(flag) ? prev.filter((f) => f !== flag) : [...prev, flag]
                  )
                }
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  sandboxFlags.includes(flag)
                    ? 'bg-yellow-500 text-white'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {flag}
              </button>
            ))}
          </div>
        </div>

        {/* Config JSON */}
        <div>
          <label className="block text-sm font-medium">Configuration JSON</label>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Custom configuration passed to the tool
          </p>
          <textarea
            value={configJson}
            onChange={(e) => setConfigJson(e.target.value)}
            rows={5}
            className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm"
            placeholder="{}"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            onClick={handleCancel}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={() => void handleSave()}
            disabled={saving || !launchUrl || requiredScopes.length === 0}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>
    );
  }

  // View mode
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Embedded Tool Configuration</h3>
        {!readOnly && (
          <button
            onClick={() => setIsEditing(true)}
            className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted"
          >
            Edit
          </button>
        )}
      </div>

      <div className="space-y-3 rounded-lg border border-border p-4">
        <div>
          <span className="text-sm text-muted-foreground">Launch URL</span>
          <p className="mt-0.5 font-mono text-sm break-all">{config?.launchUrl}</p>
        </div>

        <div>
          <span className="text-sm text-muted-foreground">Required Scopes</span>
          <div className="mt-1 flex flex-wrap gap-1">
            {config?.requiredScopes.map((scope) => (
              <span
                key={scope}
                className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
              >
                {TOOL_SCOPES.find((s) => s.value === scope)?.label ?? scope}
              </span>
            ))}
          </div>
        </div>

        {config?.optionalScopes && config.optionalScopes.length > 0 && (
          <div>
            <span className="text-sm text-muted-foreground">Optional Scopes</span>
            <div className="mt-1 flex flex-wrap gap-1">
              {config.optionalScopes.map((scope) => (
                <span
                  key={scope}
                  className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700"
                >
                  {TOOL_SCOPES.find((s) => s.value === scope)?.label ?? scope}
                </span>
              ))}
            </div>
          </div>
        )}

        {config?.sandboxAttributes && config.sandboxAttributes.length > 0 && (
          <div>
            <span className="text-sm text-muted-foreground">Sandbox Flags</span>
            <div className="mt-1 flex flex-wrap gap-1">
              {config.sandboxAttributes.map((flag) => (
                <span
                  key={flag}
                  className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700"
                >
                  {flag}
                </span>
              ))}
            </div>
          </div>
        )}

        {config?.defaultConfigJson && (
          <div>
            <span className="text-sm text-muted-foreground">Configuration</span>
            <pre className="mt-1 overflow-auto rounded-lg bg-muted p-2 font-mono text-xs">
              {JSON.stringify(config.defaultConfigJson, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
