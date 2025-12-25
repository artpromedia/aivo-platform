/**
 * Version History Panel Component
 * Shows lesson versions with diff view and restore capability
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Clock,
  User,
  RotateCcw,
  Eye,
  GitCompare,
  ChevronRight,
  FileText,
  Plus,
  Minus,
  Edit,
} from 'lucide-react';
import { contentApi, LessonVersion, Lesson } from '@/lib/api/content';
import { cn } from '@/lib/utils';

interface VersionHistoryPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lessonId: string;
  onRestore: (versionId: string) => Promise<void>;
}

export const VersionHistoryPanel: React.FC<VersionHistoryPanelProps> = ({
  open,
  onOpenChange,
  lessonId,
  onRestore,
}) => {
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [compareVersion, setCompareVersion] = useState<string | null>(null);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // Fetch versions
  const { data: versions, isLoading } = useQuery({
    queryKey: ['lesson-versions', lessonId],
    queryFn: () => contentApi.getLessonVersions(lessonId),
    enabled: open,
  });

  // Fetch selected version details
  const { data: versionDetails } = useQuery({
    queryKey: ['lesson-version', lessonId, selectedVersion],
    queryFn: () => contentApi.getLessonVersion(lessonId, selectedVersion!),
    enabled: !!selectedVersion,
  });

  // Fetch compare version details
  const { data: compareDetails } = useQuery({
    queryKey: ['lesson-version', lessonId, compareVersion],
    queryFn: () => contentApi.getLessonVersion(lessonId, compareVersion!),
    enabled: !!compareVersion,
  });

  const handleRestore = async () => {
    if (!selectedVersion) return;
    
    setIsRestoring(true);
    try {
      await onRestore(selectedVersion);
      setShowRestoreConfirm(false);
      onOpenChange(false);
    } finally {
      setIsRestoring(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getRelativeTime = (dateString: string) => {
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
    return formatDate(dateString);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-[600px] sm:max-w-[600px] p-0">
          <SheetHeader className="px-6 py-4 border-b">
            <SheetTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Version History
            </SheetTitle>
          </SheetHeader>

          <div className="flex h-[calc(100vh-80px)]">
            {/* Version List */}
            <div className="w-64 border-r">
              <ScrollArea className="h-full">
                <div className="p-2">
                  {isLoading ? (
                    <VersionListSkeleton />
                  ) : (
                    versions?.map((version, index) => (
                      <VersionListItem
                        key={version.id}
                        version={version}
                        isLatest={index === 0}
                        isSelected={selectedVersion === version.id}
                        isComparing={compareVersion === version.id}
                        onSelect={() => {
                          if (compareVersion === version.id) {
                            setCompareVersion(null);
                          } else {
                            setSelectedVersion(version.id);
                          }
                        }}
                        onCompare={() => {
                          if (selectedVersion && selectedVersion !== version.id) {
                            setCompareVersion(version.id);
                          }
                        }}
                        getRelativeTime={getRelativeTime}
                      />
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Version Details / Diff View */}
            <div className="flex-1 flex flex-col">
              {selectedVersion && versionDetails ? (
                <>
                  {/* Version Header */}
                  <div className="p-4 border-b">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">
                        Version {versionDetails.version}
                      </h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowRestoreConfirm(true)}
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Restore
                      </Button>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3" />
                        {versions?.find(v => v.id === selectedVersion)?.createdBy.name}
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        {formatDate(versions?.find(v => v.id === selectedVersion)?.createdAt || '')}
                      </div>
                    </div>
                    {versions?.find(v => v.id === selectedVersion)?.note && (
                      <p className="mt-2 text-sm bg-muted p-2 rounded">
                        {versions.find(v => v.id === selectedVersion)?.note}
                      </p>
                    )}
                  </div>

                  {/* Content */}
                  <ScrollArea className="flex-1">
                    <div className="p-4">
                      {compareVersion && compareDetails ? (
                        <DiffView
                          current={versionDetails}
                          previous={compareDetails}
                        />
                      ) : (
                        <VersionPreview version={versionDetails} />
                      )}
                    </div>
                  </ScrollArea>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Select a version to view details</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Restore Confirmation */}
      <AlertDialog open={showRestoreConfirm} onOpenChange={setShowRestoreConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore this version?</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace the current content with this version. 
              Your current changes will be saved as a new version before restoring.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore} disabled={isRestoring}>
              {isRestoring ? 'Restoring...' : 'Restore Version'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

// Version List Item
interface VersionListItemProps {
  version: LessonVersion;
  isLatest: boolean;
  isSelected: boolean;
  isComparing: boolean;
  onSelect: () => void;
  onCompare: () => void;
  getRelativeTime: (date: string) => string;
}

const VersionListItem: React.FC<VersionListItemProps> = ({
  version,
  isLatest,
  isSelected,
  isComparing,
  onSelect,
  onCompare,
  getRelativeTime,
}) => (
  <div
    className={cn(
      'p-3 rounded-lg cursor-pointer transition-colors mb-1',
      isSelected && 'bg-primary/10 border border-primary',
      isComparing && 'bg-blue-50 border border-blue-500',
      !isSelected && !isComparing && 'hover:bg-muted'
    )}
    onClick={onSelect}
  >
    <div className="flex items-center justify-between mb-1">
      <div className="flex items-center gap-2">
        <span className="font-medium text-sm">v{version.version}</span>
        {isLatest && (
          <Badge variant="secondary" className="text-xs">Current</Badge>
        )}
      </div>
      {!isSelected && !isComparing && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={(e) => {
            e.stopPropagation();
            onCompare();
          }}
          title="Compare with selected"
        >
          <GitCompare className="h-3 w-3" />
        </Button>
      )}
    </div>
    <div className="text-xs text-muted-foreground">
      <div>{getRelativeTime(version.createdAt)}</div>
      <div>{version.createdBy.name}</div>
    </div>
    {version.note && (
      <p className="text-xs mt-1 truncate">{version.note}</p>
    )}
  </div>
);

// Version Preview
const VersionPreview: React.FC<{ version: Lesson }> = ({ version }) => (
  <div className="space-y-4">
    <h4 className="font-medium">Blocks ({version.blocks?.length || 0})</h4>
    <div className="space-y-2">
      {version.blocks?.map((block, index) => (
        <div key={block.id} className="p-3 border rounded-lg bg-muted/30">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">{index + 1}.</span>
            <Badge variant="outline" className="text-xs capitalize">
              {block.type.replace('-', ' ')}
            </Badge>
          </div>
          {block.type === 'text' && block.content.html && (
            <div
              className="mt-2 text-sm text-muted-foreground line-clamp-2"
              dangerouslySetInnerHTML={{ __html: block.content.html }}
            />
          )}
        </div>
      ))}
    </div>
  </div>
);

// Diff View
const DiffView: React.FC<{ current: Lesson; previous: Lesson }> = ({
  current,
  previous,
}) => {
  const currentBlocks = current.blocks || [];
  const previousBlocks = previous.blocks || [];

  // Simple diff: find added, removed, and modified blocks
  const currentIds = new Set(currentBlocks.map(b => b.id));
  const previousIds = new Set(previousBlocks.map(b => b.id));

  const added = currentBlocks.filter(b => !previousIds.has(b.id));
  const removed = previousBlocks.filter(b => !currentIds.has(b.id));
  const modified = currentBlocks.filter(b => {
    if (!previousIds.has(b.id)) return false;
    const prev = previousBlocks.find(p => p.id === b.id);
    return JSON.stringify(b.content) !== JSON.stringify(prev?.content);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 text-sm">
        <span className="flex items-center gap-1 text-green-600">
          <Plus className="h-4 w-4" />
          {added.length} added
        </span>
        <span className="flex items-center gap-1 text-red-600">
          <Minus className="h-4 w-4" />
          {removed.length} removed
        </span>
        <span className="flex items-center gap-1 text-yellow-600">
          <Edit className="h-4 w-4" />
          {modified.length} modified
        </span>
      </div>

      <Separator />

      {added.length > 0 && (
        <div>
          <h4 className="font-medium text-green-600 mb-2">Added</h4>
          <div className="space-y-2">
            {added.map((block) => (
              <div
                key={block.id}
                className="p-3 border border-green-200 bg-green-50 rounded-lg"
              >
                <Badge variant="outline" className="text-xs capitalize">
                  {block.type.replace('-', ' ')}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {removed.length > 0 && (
        <div>
          <h4 className="font-medium text-red-600 mb-2">Removed</h4>
          <div className="space-y-2">
            {removed.map((block) => (
              <div
                key={block.id}
                className="p-3 border border-red-200 bg-red-50 rounded-lg"
              >
                <Badge variant="outline" className="text-xs capitalize">
                  {block.type.replace('-', ' ')}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {modified.length > 0 && (
        <div>
          <h4 className="font-medium text-yellow-600 mb-2">Modified</h4>
          <div className="space-y-2">
            {modified.map((block) => (
              <div
                key={block.id}
                className="p-3 border border-yellow-200 bg-yellow-50 rounded-lg"
              >
                <Badge variant="outline" className="text-xs capitalize">
                  {block.type.replace('-', ' ')}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Skeleton
const VersionListSkeleton = () => (
  <div className="space-y-2">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="p-3 rounded-lg animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-16 mb-2" />
        <div className="h-3 bg-gray-200 rounded w-24 mb-1" />
        <div className="h-3 bg-gray-200 rounded w-20" />
      </div>
    ))}
  </div>
);
