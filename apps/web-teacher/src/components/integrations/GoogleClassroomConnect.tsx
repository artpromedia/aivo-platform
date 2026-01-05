/**
 * Google Classroom Connect Component
 *
 * Provides OAuth connection flow for teachers to link their
 * Google Classroom account with AIVO.
 *
 * Features:
 * - OAuth 2.0 popup flow
 * - Connection status display
 * - Course listing and selection
 * - Disconnect functionality
 *
 * @component
 */

'use client';

import { Loader2, CheckCircle2, XCircle, Link2, Unlink, RefreshCw } from 'lucide-react';
import React, { useState, useEffect, useCallback, useRef } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import type { ConnectionStatus } from '@/lib/api/google-classroom';
import { googleClassroomApi } from '@/lib/api/google-classroom';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface GoogleClassroomConnectProps {
  /** Callback when connection status changes */
  onConnectionChange?: (connected: boolean) => void;
  /** Show compact version */
  compact?: boolean;
  /** Custom class name */
  className?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export function GoogleClassroomConnect({
  onConnectionChange,
  compact = false,
  className = '',
}: GoogleClassroomConnectProps) {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ref for OAuth popup interval cleanup
  const popupCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { toast } = useToast();

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (popupCheckIntervalRef.current) {
        clearInterval(popupCheckIntervalRef.current);
        popupCheckIntervalRef.current = null;
      }
    };
  }, []);

  // Fetch connection status
  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const connectionStatus = await googleClassroomApi.getConnectionStatus();
      setStatus(connectionStatus);
      onConnectionChange?.(connectionStatus.connected);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch connection status');
      console.error('Failed to fetch Google Classroom status:', err);
    } finally {
      setLoading(false);
    }
  }, [onConnectionChange]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Handle OAuth popup message
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GOOGLE_CLASSROOM_CONNECTED') {
        setConnecting(false);
        toast({
          title: 'Connected!',
          description: 'Your Google Classroom account has been linked.',
        });
        fetchStatus();
      } else if (event.data?.type === 'GOOGLE_CLASSROOM_ERROR') {
        setConnecting(false);
        setError(event.data.error || 'Failed to connect');
        toast({
          variant: 'destructive',
          title: 'Connection Failed',
          description: event.data.error || 'Could not connect to Google Classroom.',
        });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [toast, fetchStatus]);

  // Initiate OAuth flow
  const handleConnect = async () => {
    try {
      setConnecting(true);
      setError(null);

      const authUrl = await googleClassroomApi.getConnectUrl();

      // Open OAuth popup
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        authUrl,
        'google-classroom-auth',
        `width=${width},height=${height},left=${left},top=${top},popup=1`
      );

      if (!popup) {
        throw new Error('Please allow popups to connect to Google Classroom');
      }

      // Check if popup is closed
      popupCheckIntervalRef.current = setInterval(() => {
        if (popup.closed) {
          if (popupCheckIntervalRef.current) {
            clearInterval(popupCheckIntervalRef.current);
            popupCheckIntervalRef.current = null;
          }
          setConnecting(false);
        }
      }, 500);
    } catch (err: any) {
      setConnecting(false);
      setError(err.message);
      toast({
        variant: 'destructive',
        title: 'Connection Failed',
        description: err.message,
      });
    }
  };

  // Handle disconnect
  const handleDisconnect = async () => {
    try {
      setDisconnecting(true);
      await googleClassroomApi.disconnect();
      setShowDisconnectDialog(false);
      toast({
        title: 'Disconnected',
        description: 'Your Google Classroom account has been unlinked.',
      });
      fetchStatus();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to Disconnect',
        description: err.message,
      });
    } finally {
      setDisconnecting(false);
    }
  };

  // Compact version
  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : status?.connected ? (
          <>
            <Badge variant="success" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Connected
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowDisconnectDialog(true);
              }}
            >
              <Unlink className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <Button size="sm" onClick={handleConnect} disabled={connecting}>
            {connecting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Link2 className="mr-2 h-4 w-4" />
            )}
            Connect
          </Button>
        )}

        <DisconnectDialog
          open={showDisconnectDialog}
          onOpenChange={setShowDisconnectDialog}
          onConfirm={handleDisconnect}
          loading={disconnecting}
        />
      </div>
    );
  }

  // Full card version
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GoogleClassroomLogo className="h-8 w-8" />
            <div>
              <CardTitle>Google Classroom</CardTitle>
              <CardDescription>
                Sync classes, students, and grades with Google Classroom
              </CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={fetchStatus} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : status?.connected ? (
          <ConnectedStatus status={status} onRefresh={fetchStatus} />
        ) : (
          <DisconnectedStatus onConnect={handleConnect} connecting={connecting} />
        )}
      </CardContent>

      {status?.connected && (
        <CardFooter className="flex justify-between border-t pt-4">
          <p className="text-sm text-muted-foreground">Connected as {status.email}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setShowDisconnectDialog(true);
            }}
          >
            <Unlink className="mr-2 h-4 w-4" />
            Disconnect
          </Button>
        </CardFooter>
      )}

      <DisconnectDialog
        open={showDisconnectDialog}
        onOpenChange={setShowDisconnectDialog}
        onConfirm={handleDisconnect}
        loading={disconnecting}
      />
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

function ConnectedStatus({
  status,
  onRefresh,
}: {
  status: ConnectionStatus;
  onRefresh: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-5 w-5 text-green-500" />
        <span className="font-medium">Connected to Google Classroom</span>
      </div>

      <div className="rounded-lg bg-muted/50 p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Email</span>
          <span className="font-medium">{status.email}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Courses Synced</span>
          <span className="font-medium">{status.coursesLinked || 0}</span>
        </div>
        {status.lastSyncAt && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Last Sync</span>
            <span className="font-medium">{new Date(status.lastSyncAt).toLocaleString()}</span>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onRefresh}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh Status
        </Button>
      </div>
    </div>
  );
}

function DisconnectedStatus({
  onConnect,
  connecting,
}: {
  onConnect: () => void;
  connecting: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <XCircle className="h-5 w-5" />
        <span>Not connected to Google Classroom</span>
      </div>

      <div className="rounded-lg border border-dashed p-6 text-center">
        <GoogleClassroomLogo className="mx-auto h-12 w-12 mb-4 opacity-50" />
        <h4 className="font-medium mb-2">Connect Your Account</h4>
        <p className="text-sm text-muted-foreground mb-4">
          Link your Google Classroom to automatically sync classes, students, assignments, and
          grades.
        </p>
        <Button onClick={onConnect} disabled={connecting}>
          {connecting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <Link2 className="mr-2 h-4 w-4" />
              Connect Google Classroom
            </>
          )}
        </Button>
      </div>

      <div className="text-xs text-muted-foreground">
        <p className="font-medium mb-1">AIVO will request permission to:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>View your Google Classroom classes</li>
          <li>View class rosters (teachers and students)</li>
          <li>Create and manage assignments</li>
          <li>View and manage grades</li>
        </ul>
      </div>
    </div>
  );
}

function DisconnectDialog({
  open,
  onOpenChange,
  onConfirm,
  loading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  loading: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Disconnect Google Classroom?</DialogTitle>
          <DialogDescription>
            This will stop syncing between AIVO and Google Classroom. Your existing data will
            remain, but future changes won&apos;t be synchronized.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
            }}
          >
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Unlink className="mr-2 h-4 w-4" />
            )}
            Disconnect
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function GoogleClassroomLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="4" fill="#0F9D58" />
      <path
        d="M12 12.5C10.34 12.5 9 11.16 9 9.5C9 7.84 10.34 6.5 12 6.5C13.66 6.5 15 7.84 15 9.5C15 11.16 13.66 12.5 12 12.5Z"
        fill="white"
      />
      <path
        d="M17.5 18.5H6.5V17C6.5 15 10.5 13.5 12 13.5C13.5 13.5 17.5 15 17.5 17V18.5Z"
        fill="white"
      />
      <path
        d="M18 9.5C18 10.88 16.88 12 15.5 12C15.32 12 15.14 11.98 14.97 11.94"
        stroke="white"
        strokeWidth="1.5"
      />
      <path
        d="M6 9.5C6 10.88 7.12 12 8.5 12C8.68 12 8.86 11.98 9.03 11.94"
        stroke="white"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export default GoogleClassroomConnect;
