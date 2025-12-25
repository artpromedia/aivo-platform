/**
 * Sync History Viewer Component
 *
 * Displays the history of Google Classroom sync operations
 * with detailed logs and error information.
 *
 * Features:
 * - View sync history with filtering
 * - Detailed sync statistics
 * - Error logs and troubleshooting
 * - Manual sync trigger
 *
 * @component
 */

'use client';

import {
  Loader2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Users,
  UserMinus,
  UserPlus,
  ChevronDown,
  History,
  Play,
  Filter,
} from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import type { SyncHistoryEntry } from '@/lib/api/google-classroom';
import { googleClassroomApi, SyncResult } from '@/lib/api/google-classroom';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface SyncHistoryViewerProps {
  /** Course ID to filter by (optional) */
  courseId?: string;
  /** Class ID to filter by (optional) */
  classId?: string;
  /** Maximum entries to show */
  limit?: number;
  /** Show manual sync button */
  showSyncButton?: boolean;
  /** Class name */
  className?: string;
}

type SyncTypeFilter = 'all' | 'full' | 'incremental' | 'webhook';
type StatusFilter = 'all' | 'success' | 'failed';

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export function SyncHistoryViewer({
  courseId,
  classId,
  limit = 50,
  showSyncButton = true,
  className = '',
}: SyncHistoryViewerProps) {
  const [history, setHistory] = useState<SyncHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<SyncTypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedEntry, setSelectedEntry] = useState<SyncHistoryEntry | null>(null);

  const { toast } = useToast();

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const entries = await googleClassroomApi.getSyncHistory({
        courseId,
        classId,
        limit,
        syncType: typeFilter !== 'all' ? typeFilter : undefined,
        success: statusFilter === 'all' ? undefined : statusFilter === 'success',
      });
      setHistory(entries);
    } catch (err: any) {
      setError(err.message || 'Failed to load sync history');
    } finally {
      setLoading(false);
    }
  }, [courseId, classId, limit, typeFilter, statusFilter]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleManualSync = async () => {
    if (!courseId) return;

    try {
      setSyncing(true);
      const result = await googleClassroomApi.syncCourse(courseId, { full: false });
      toast({
        title: 'Sync Complete',
        description: `Synced ${result.studentsAdded + result.studentsUpdated} students`,
      });
      fetchHistory();
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

  // Calculate stats
  const stats = calculateStats(history);

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Sync History
            </CardTitle>
            <CardDescription>View roster synchronization history and logs</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchHistory} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            {showSyncButton && courseId && (
              <Button size="sm" onClick={handleManualSync} disabled={syncing}>
                {syncing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-2 h-4 w-4" />
                )}
                Sync Now
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Stats summary */}
        <SyncStats stats={stats} />

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select
              value={typeFilter}
              onValueChange={(v) => {
                setTypeFilter(v as SyncTypeFilter);
              }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Sync Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="full">Full Sync</SelectItem>
                <SelectItem value="incremental">Incremental</SelectItem>
                <SelectItem value="webhook">Webhook</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v as StatusFilter);
            }}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="success">Successful</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : history.length === 0 ? (
          <EmptyState />
        ) : (
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Changes</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((entry) => (
                  <TableRow
                    key={entry.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      setSelectedEntry(entry);
                    }}
                  >
                    <TableCell className="whitespace-nowrap">
                      {formatDateTime(entry.createdAt)}
                    </TableCell>
                    <TableCell>
                      <SyncTypeBadge type={entry.syncType} />
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {entry.courseName || entry.googleCourseId}
                    </TableCell>
                    <TableCell>
                      <ChangesSummary entry={entry} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDuration(entry.durationMs)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge success={entry.success} errors={entry.errors?.length || 0} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}

        {/* Detail Dialog */}
        <SyncDetailDialog
          entry={selectedEntry}
          open={!!selectedEntry}
          onOpenChange={(open) => {
            if (!open) setSelectedEntry(null);
          }}
        />
      </CardContent>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

function SyncStats({ stats }: { stats: SyncStatsData }) {
  return (
    <div className="grid grid-cols-4 gap-4">
      <StatCard label="Total Syncs" value={stats.total} icon={History} />
      <StatCard
        label="Successful"
        value={stats.successful}
        icon={CheckCircle2}
        iconColor="text-green-500"
      />
      <StatCard label="Failed" value={stats.failed} icon={XCircle} iconColor="text-red-500" />
      <StatCard label="Avg Duration" value={`${stats.avgDuration}s`} icon={Clock} />
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  iconColor = 'text-muted-foreground',
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  iconColor?: string;
}) {
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`h-4 w-4 ${iconColor}`} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}

function SyncTypeBadge({ type }: { type: string }) {
  const config: Record<string, { variant: any; label: string }> = {
    full: { variant: 'default', label: 'Full' },
    incremental: { variant: 'secondary', label: 'Incremental' },
    webhook: { variant: 'outline', label: 'Webhook' },
    manual: { variant: 'default', label: 'Manual' },
  };

  const { variant, label } = config[type] || { variant: 'secondary', label: type };

  return <Badge variant={variant}>{label}</Badge>;
}

function StatusBadge({ success, errors }: { success: boolean; errors: number }) {
  if (success && errors === 0) {
    return (
      <Badge variant="success" className="gap-1">
        <CheckCircle2 className="h-3 w-3" />
        Success
      </Badge>
    );
  }

  if (success && errors > 0) {
    return (
      <Badge variant="warning" className="gap-1">
        <AlertTriangle className="h-3 w-3" />
        Partial
      </Badge>
    );
  }

  return (
    <Badge variant="destructive" className="gap-1">
      <XCircle className="h-3 w-3" />
      Failed
    </Badge>
  );
}

function ChangesSummary({ entry }: { entry: SyncHistoryEntry }) {
  const changes = [
    { value: entry.studentsAdded, icon: UserPlus, color: 'text-green-500' },
    { value: entry.studentsRemoved, icon: UserMinus, color: 'text-red-500' },
    { value: entry.studentsUpdated, icon: Users, color: 'text-blue-500' },
  ];

  return (
    <div className="flex items-center gap-2">
      {changes.map((change, idx) => {
        if (!change.value) return null;
        const Icon = change.icon;
        return (
          <span key={idx} className={`flex items-center gap-1 text-sm ${change.color}`}>
            <Icon className="h-3 w-3" />
            {change.value}
          </span>
        );
      })}
      {!entry.studentsAdded && !entry.studentsRemoved && !entry.studentsUpdated && (
        <span className="text-sm text-muted-foreground">No changes</span>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-12">
      <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
      <h3 className="font-medium mb-2">No Sync History</h3>
      <p className="text-sm text-muted-foreground">
        Sync history will appear here after your first roster sync.
      </p>
    </div>
  );
}

function SyncDetailDialog({
  entry,
  open,
  onOpenChange,
}: {
  entry: SyncHistoryEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!entry) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <StatusBadge success={entry.success} errors={entry.errors?.length || 0} />
            Sync Details
          </DialogTitle>
          <DialogDescription>
            {formatDateTime(entry.createdAt)} · {entry.triggeredBy || 'Scheduled'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-sm text-muted-foreground">Course</p>
              <p className="font-medium">{entry.courseName || entry.googleCourseId}</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-sm text-muted-foreground">Duration</p>
              <p className="font-medium">{formatDuration(entry.durationMs)}</p>
            </div>
          </div>

          {/* Changes breakdown */}
          <Accordion type="single" collapsible>
            <AccordionItem value="changes">
              <AccordionTrigger>
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Changes
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  <DetailRow
                    icon={UserPlus}
                    label="Students Added"
                    value={entry.studentsAdded}
                    color="text-green-500"
                  />
                  <DetailRow
                    icon={UserMinus}
                    label="Students Removed"
                    value={entry.studentsRemoved}
                    color="text-red-500"
                  />
                  <DetailRow
                    icon={Users}
                    label="Students Updated"
                    value={entry.studentsUpdated}
                    color="text-blue-500"
                  />
                  <DetailRow
                    icon={UserPlus}
                    label="Teachers Added"
                    value={entry.teachersAdded}
                    color="text-green-500"
                  />
                  <DetailRow
                    icon={UserMinus}
                    label="Teachers Removed"
                    value={entry.teachersRemoved}
                    color="text-red-500"
                  />
                  <DetailRow
                    icon={UserPlus}
                    label="Guardians Added"
                    value={entry.guardiansAdded}
                    color="text-purple-500"
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {entry.errors && entry.errors.length > 0 && (
              <AccordionItem value="errors">
                <AccordionTrigger>
                  <span className="flex items-center gap-2 text-destructive">
                    <XCircle className="h-4 w-4" />
                    Errors ({entry.errors.length})
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2">
                    {entry.errors.map((error, idx) => (
                      <Alert key={idx} variant="destructive">
                        <AlertDescription className="text-sm">{error}</AlertDescription>
                      </Alert>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {entry.warnings && entry.warnings.length > 0 && (
              <AccordionItem value="warnings">
                <AccordionTrigger>
                  <span className="flex items-center gap-2 text-yellow-600">
                    <AlertTriangle className="h-4 w-4" />
                    Warnings ({entry.warnings.length})
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2">
                    {entry.warnings.map((warning, idx) => (
                      <Alert key={idx}>
                        <AlertDescription className="text-sm">{warning}</AlertDescription>
                      </Alert>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="flex items-center gap-2 text-sm">
        <Icon className={`h-4 w-4 ${color}`} />
        {label}
      </span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ══════════════════════════════════════════════════════════════════════════════

interface SyncStatsData {
  total: number;
  successful: number;
  failed: number;
  avgDuration: number;
}

function calculateStats(history: SyncHistoryEntry[]): SyncStatsData {
  if (history.length === 0) {
    return { total: 0, successful: 0, failed: 0, avgDuration: 0 };
  }

  const successful = history.filter((e) => e.success).length;
  const totalDuration = history.reduce((sum, e) => sum + (e.durationMs || 0), 0);

  return {
    total: history.length,
    successful,
    failed: history.length - successful,
    avgDuration: Math.round(totalDuration / history.length / 1000),
  };
}

function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDuration(ms: number | undefined): string {
  if (!ms) return '-';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms / 60000)}m`;
}

export default SyncHistoryViewer;
