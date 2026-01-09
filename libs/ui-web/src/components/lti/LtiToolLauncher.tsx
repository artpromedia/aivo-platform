// ══════════════════════════════════════════════════════════════════════════════
// LTI TOOL LAUNCHER COMPONENT
// Launch external LTI tools from within the platform
// ══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, ExternalLink, AlertTriangle, RefreshCw, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface LtiTool {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  clientId: string;
  deploymentId: string;
  launchUrl: string;
  customParameters?: Record<string, string>;
}

export interface LtiLaunchContext {
  courseId?: string;
  resourceId?: string;
  userId?: string;
  roles?: string[];
  customClaims?: Record<string, unknown>;
}

interface LtiToolLauncherProps {
  tool: LtiTool;
  context: LtiLaunchContext;
  className?: string;
  height?: string | number;
  allowFullscreen?: boolean;
  onLaunchStart?: () => void;
  onLaunchComplete?: () => void;
  onError?: (error: Error) => void;
  onMessage?: (message: MessageEvent) => void;
}

const API_BASE = process.env.NEXT_PUBLIC_IMPORT_EXPORT_API || '/api/import-export';

export function LtiToolLauncher({
  tool,
  context,
  className,
  height = 600,
  allowFullscreen = true,
  onLaunchStart,
  onLaunchComplete,
  onError,
  onMessage,
}: LtiToolLauncherProps) {
  const [status, setStatus] = useState<'idle' | 'launching' | 'ready' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle postMessage from LTI tool
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Validate origin matches tool's domain
      try {
        const toolOrigin = new URL(tool.launchUrl).origin;
        if (event.origin !== toolOrigin) return;
      } catch {
        return;
      }

      onMessage?.(event);

      // Handle standard LTI messages
      if (event.data?.subject === 'lti.capabilities') {
        // Respond with supported capabilities
        iframeRef.current?.contentWindow?.postMessage(
          {
            subject: 'lti.capabilities.response',
            supported: ['lti.fetchWindowSize', 'lti.scrollTo', 'lti.close'],
          },
          event.origin
        );
      } else if (event.data?.subject === 'lti.fetchWindowSize') {
        const rect = containerRef.current?.getBoundingClientRect();
        iframeRef.current?.contentWindow?.postMessage(
          {
            subject: 'lti.fetchWindowSize.response',
            width: rect?.width || 800,
            height: rect?.height || 600,
          },
          event.origin
        );
      } else if (event.data?.subject === 'lti.close') {
        // Tool requested to close - could trigger navigation or dialog close
        console.log('LTI tool requested close');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [tool.launchUrl, onMessage]);

  // Initiate LTI launch
  const launchTool = useCallback(async () => {
    setStatus('launching');
    setError(null);
    onLaunchStart?.();

    try {
      // Request OIDC initiation URL from backend
      const response = await fetch(`${API_BASE}/lti/platform/launch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          toolId: tool.id,
          context: {
            courseId: context.courseId,
            resourceId: context.resourceId,
            customParameters: tool.customParameters,
          },
          launchPresentation: {
            documentTarget: 'iframe',
            returnUrl: window.location.href,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to initiate LTI launch');
      }

      const data = await response.json();

      // Create and submit the form to initiate OIDC flow
      if (formRef.current && iframeRef.current) {
        formRef.current.action = data.oidcLoginUrl;
        
        // Set form fields
        const loginHint = formRef.current.querySelector<HTMLInputElement>('[name="login_hint"]');
        const clientId = formRef.current.querySelector<HTMLInputElement>('[name="client_id"]');
        const ltiMessageHint = formRef.current.querySelector<HTMLInputElement>('[name="lti_message_hint"]');
        const targetLinkUri = formRef.current.querySelector<HTMLInputElement>('[name="target_link_uri"]');
        const ltiDeploymentId = formRef.current.querySelector<HTMLInputElement>('[name="lti_deployment_id"]');

        if (loginHint) loginHint.value = data.loginHint;
        if (clientId) clientId.value = tool.clientId;
        if (ltiMessageHint) ltiMessageHint.value = data.ltiMessageHint || '';
        if (targetLinkUri) targetLinkUri.value = tool.launchUrl;
        if (ltiDeploymentId) ltiDeploymentId.value = tool.deploymentId;

        formRef.current.submit();
      }

      // Wait for iframe to load
      iframeRef.current?.addEventListener('load', () => {
        setStatus('ready');
        onLaunchComplete?.();
      }, { once: true });

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Launch failed');
      setError(error.message);
      setStatus('error');
      onError?.(error);
    }
  }, [tool, context, onLaunchStart, onLaunchComplete, onError]);

  // Auto-launch on mount
  useEffect(() => {
    launchTool();
  }, [launchTool]);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  if (status === 'error') {
    return (
      <Card className={cn('w-full', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {tool.icon && <img src={tool.icon} alt={`${tool.name} icon`} className="h-6 w-6" />}
            {tool.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Launch Failed</AlertTitle>
            <AlertDescription className="mt-2">
              {error || 'Unable to launch the tool. Please try again.'}
            </AlertDescription>
          </Alert>
          <div className="mt-4 flex gap-2">
            <Button onClick={launchTool} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
            <Button variant="ghost" asChild>
              <a href={tool.launchUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Open in New Tab
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative w-full overflow-hidden rounded-lg border bg-background',
        isFullscreen && 'fixed inset-0 z-50 rounded-none border-none',
        className
      )}
      style={{ height: isFullscreen ? '100vh' : height }}
    >
      {/* Loading overlay */}
      {status === 'launching' && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-sm text-muted-foreground">Launching {tool.name}...</p>
        </div>
      )}

      {/* Toolbar */}
      <div className="absolute right-2 top-2 z-20 flex gap-1">
        {allowFullscreen && (
          <Button
            variant="secondary"
            size="icon"
            className="h-8 w-8"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        )}
        <Button
          variant="secondary"
          size="icon"
          className="h-8 w-8"
          onClick={launchTool}
          title="Refresh"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Hidden form for OIDC initiation */}
      <form
        ref={formRef}
        method="POST"
        target="lti-iframe"
        style={{ display: 'none' }}
      >
        <input type="hidden" name="iss" value={process.env.NEXT_PUBLIC_LTI_ISSUER || ''} />
        <input type="hidden" name="login_hint" />
        <input type="hidden" name="client_id" />
        <input type="hidden" name="lti_message_hint" />
        <input type="hidden" name="target_link_uri" />
        <input type="hidden" name="lti_deployment_id" />
      </form>

      {/* LTI iframe */}
      <iframe
        ref={iframeRef}
        name="lti-iframe"
        title={tool.name}
        className="h-full w-full border-0"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
        allow="camera; microphone; fullscreen; clipboard-read; clipboard-write"
      />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// LTI TOOL PICKER
// Select an LTI tool to launch
// ══════════════════════════════════════════════════════════════════════════════

interface LtiToolPickerProps {
  tools: LtiTool[];
  selectedId?: string;
  onSelect: (tool: LtiTool) => void;
  className?: string;
}

export function LtiToolPicker({
  tools,
  selectedId,
  onSelect,
  className,
}: LtiToolPickerProps) {
  return (
    <div className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-3', className)}>
      {tools.map((tool) => (
        <Card
          key={tool.id}
          className={cn(
            'cursor-pointer transition-all hover:border-primary',
            selectedId === tool.id && 'border-primary bg-primary/5'
          )}
          onClick={() => onSelect(tool)}
        >
          <CardContent className="flex items-start gap-4 p-4">
            {tool.icon ? (
              <img src={tool.icon} alt={`${tool.name} icon`} className="h-12 w-12 rounded object-contain" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded bg-muted">
                <ExternalLink className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 space-y-1">
              <h3 className="font-medium leading-none">{tool.name}</h3>
              {tool.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {tool.description}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
