/**
 * Grade Passback UI Component
 *
 * Provides interface for viewing and manually syncing grades
 * between AIVO and Google Classroom.
 *
 * Features:
 * - View pending grade syncs
 * - Manually trigger grade passback
 * - View sync history and errors
 * - Retry failed syncs
 *
 * @component
 */

'use client';

import {
  Loader2,
  RefreshCw,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import type { GradePassbackResult, PendingGrade } from '@/lib/api/google-classroom';
import { googleClassroomApi } from '@/lib/api/google-classroom';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface GradePassbackUIProps {
  /** Course ID to show grades for */
  courseId: string;
  /** Assignment ID (optional - show all if not provided) */
  assignmentId?: string;
  /** Compact mode for embedding */
  compact?: boolean;
  /** Class name */
  className?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export function GradePassbackUI({
  courseId,
  assignmentId,
  compact = false,
  className = '',
}: GradePassbackUIProps) {
  const [pendingGrades, setPendingGrades] = useState<PendingGrade[]>([]);
  const [selectedGrades, setSelectedGrades] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [syncResult, setSyncResult] = useState<GradePassbackResult | null>(null);

  const { toast } = useToast();

  const fetchPendingGrades = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const grades = await googleClassroomApi.getPendingGrades(courseId, assignmentId);
      setPendingGrades(grades);
    } catch (err: any) {
      setError(err.message || 'Failed to load pending grades');
    } finally {
      setLoading(false);
    }
  }, [courseId, assignmentId]);

  useEffect(() => {
    fetchPendingGrades();
  }, [fetchPendingGrades]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedGrades(new Set(pendingGrades.map((g) => g.id)));
    } else {
      setSelectedGrades(new Set());
    }
  };

  const handleSelectGrade = (gradeId: string, checked: boolean) => {
    const newSelected = new Set(selectedGrades);
    if (checked) {
      newSelected.add(gradeId);
    } else {
      newSelected.delete(gradeId);
    }
    setSelectedGrades(newSelected);
  };

  const handleSyncGrades = async () => {
    setShowConfirmDialog(false);
    setSyncing(true);
    setSyncResult(null);

    try {
      const gradeIds = Array.from(selectedGrades);
      const result = await googleClassroomApi.syncGrades(courseId, gradeIds);
      setSyncResult(result);

      if (result.successful > 0) {
        toast({
          title: 'Grades Synced',
          description: `Successfully synced ${result.successful} grades to Google Classroom`,
        });
      }

      if (result.failed > 0) {
        toast({
          variant: 'destructive',
          title: 'Some Grades Failed',
          description: `${result.failed} grades could not be synced`,
        });
      }

      // Refresh list
      await fetchPendingGrades();
      setSelectedGrades(new Set());
    } catch (err: any) {
      setError(err.message);
      toast({
        variant: 'destructive',
        title: 'Sync Failed',
        description: err.message,
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncAll = async () => {
    setSyncing(true);
    try {
      const result = await googleClassroomApi.syncAllPendingGrades(courseId);
      setSyncResult(result);

      toast({
        title: 'Grades Synced',
        description: `Synced ${result.successful} grades, ${result.failed} failed`,
      });

      await fetchPendingGrades();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Sync Failed',
        description: err.message,
      });
    } finally {
      setSyncing(false);
    }
  };

  // Compact view
  if (compact) {
    return (
      <CompactGradeView
        pendingCount={pendingGrades.length}
        loading={loading}
        syncing={syncing}
        onSync={handleSyncAll}
        onRefresh={fetchPendingGrades}
        className={className}
      />
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Grade Passback
            </CardTitle>
            <CardDescription>Sync completed lesson grades to Google Classroom</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchPendingGrades} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              size="sm"
              onClick={handleSyncAll}
              disabled={syncing || pendingGrades.length === 0}
            >
              {syncing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Sync All ({pendingGrades.length})
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {syncResult && (
          <SyncResultAlert
            result={syncResult}
            onClose={() => {
              setSyncResult(null);
            }}
          />
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : pendingGrades.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedGrades.size === pendingGrades.length}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm text-muted-foreground">
                  {selectedGrades.size} of {pendingGrades.length} selected
                </span>
              </div>
              {selectedGrades.size > 0 && (
                <Button
                  size="sm"
                  onClick={() => {
                    setShowConfirmDialog(true);
                  }}
                  disabled={syncing}
                >
                  <Send className="mr-2 h-4 w-4" />
                  Sync Selected ({selectedGrades.size})
                </Button>
              )}
            </div>

            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Assignment</TableHead>
                    <TableHead className="text-right">Score</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingGrades.map((grade) => (
                    <TableRow key={grade.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedGrades.has(grade.id)}
                          onCheckedChange={(checked) => {
                            handleSelectGrade(grade.id, !!checked);
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{grade.studentName}</p>
                          <p className="text-xs text-muted-foreground">{grade.studentEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell>{grade.assignmentTitle}</TableCell>
                      <TableCell className="text-right font-medium">
                        {grade.score}/{grade.maxPoints}
                        <span className="ml-1 text-muted-foreground">
                          ({Math.round((grade.score / grade.maxPoints) * 100)}%)
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatRelativeTime(grade.completedAt)}
                      </TableCell>
                      <TableCell>
                        <GradeStatusBadge status={grade.syncStatus} error={grade.lastError} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </>
        )}

        <ConfirmSyncDialog
          open={showConfirmDialog}
          onOpenChange={setShowConfirmDialog}
          selectedCount={selectedGrades.size}
          onConfirm={handleSyncGrades}
          loading={syncing}
        />
      </CardContent>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

function CompactGradeView({
  pendingCount,
  loading,
  syncing,
  onSync,
  onRefresh,
  className,
}: {
  pendingCount: number;
  loading: boolean;
  syncing: boolean;
  onSync: () => void;
  onRefresh: () => void;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : pendingCount > 0 ? (
        <>
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            {pendingCount} pending
          </Badge>
          <Button size="sm" variant="outline" onClick={onSync} disabled={syncing}>
            {syncing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Send className="mr-1 h-3 w-3" />
                Sync
              </>
            )}
          </Button>
        </>
      ) : (
        <Badge variant="success" className="gap-1">
          <CheckCircle2 className="h-3 w-3" />
          All synced
        </Badge>
      )}
      <Button size="icon" variant="ghost" onClick={onRefresh}>
        <RefreshCw className="h-4 w-4" />
      </Button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-12">
      <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
      <h3 className="font-medium mb-2">All Grades Synced</h3>
      <p className="text-sm text-muted-foreground">
        There are no pending grades to sync to Google Classroom.
      </p>
    </div>
  );
}

function GradeStatusBadge({
  status,
  error,
}: {
  status: 'pending' | 'synced' | 'failed' | 'retrying';
  error?: string;
}) {
  const statusConfig = {
    pending: { icon: Clock, variant: 'secondary' as const, label: 'Pending' },
    synced: { icon: CheckCircle2, variant: 'success' as const, label: 'Synced' },
    failed: { icon: XCircle, variant: 'destructive' as const, label: 'Failed' },
    retrying: { icon: RefreshCw, variant: 'outline' as const, label: 'Retrying' },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  if (error) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Badge variant={config.variant} className="gap-1">
              <Icon className="h-3 w-3" />
              {config.label}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="max-w-xs">{error}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Badge variant={config.variant} className="gap-1">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

function SyncResultAlert({
  result,
  onClose,
}: {
  result: GradePassbackResult;
  onClose: () => void;
}) {
  return (
    <Alert className="mb-4" variant={result.failed > 0 ? 'destructive' : 'default'}>
      <div className="flex items-start justify-between">
        <div className="flex gap-2">
          {result.failed > 0 ? (
            <AlertCircle className="h-4 w-4" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          <div>
            <AlertTitle>Sync Complete</AlertTitle>
            <AlertDescription>
              {result.successful} grades synced successfully
              {result.failed > 0 && `, ${result.failed} failed`}
            </AlertDescription>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Dismiss
        </Button>
      </div>
    </Alert>
  );
}

function ConfirmSyncDialog({
  open,
  onOpenChange,
  selectedCount,
  onConfirm,
  loading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  onConfirm: () => void;
  loading: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sync Grades to Google Classroom?</DialogTitle>
          <DialogDescription>
            This will send {selectedCount} grade{selectedCount !== 1 ? 's' : ''} to Google
            Classroom. Students will be able to see their grades in Classroom.
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
          <Button onClick={onConfirm} disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Sync Grades
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ══════════════════════════════════════════════════════════════════════════════

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default GradePassbackUI;
