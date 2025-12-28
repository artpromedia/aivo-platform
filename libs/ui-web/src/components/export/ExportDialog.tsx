// ══════════════════════════════════════════════════════════════════════════════
// EXPORT DIALOG COMPONENT
// Main dialog for exporting content to SCORM, QTI, Common Cartridge, xAPI
// ══════════════════════════════════════════════════════════════════════════════

import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Download,
  FileArchive,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { ExportFormatSelector, ExportFormat } from './ExportFormatSelector';
import { ExportOptionsPanel, ExportOptions } from './ExportOptionsPanel';
import { useExport } from '../hooks/useExport';

export interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentType: 'lesson' | 'assessment' | 'question' | 'course';
  contentIds: string[];
  contentTitle?: string;
}

type ExportStep = 'format' | 'options' | 'exporting' | 'complete' | 'error';

export function ExportDialog({
  open,
  onOpenChange,
  contentType,
  contentIds,
  contentTitle,
}: ExportDialogProps) {
  const [step, setStep] = useState<ExportStep>('format');
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat | null>(null);
  const [options, setOptions] = useState<ExportOptions>({});

  const {
    startExport,
    progress,
    progressMessage,
    downloadUrl,
    error,
    isExporting,
    reset,
  } = useExport();

  const handleFormatSelect = useCallback((format: ExportFormat) => {
    setSelectedFormat(format);
    setStep('options');
  }, []);

  const handleBack = useCallback(() => {
    if (step === 'options') setStep('format');
  }, [step]);

  const handleStartExport = useCallback(async () => {
    if (!selectedFormat) return;

    setStep('exporting');

    try {
      await startExport({
        contentType,
        contentIds,
        format: selectedFormat,
        options,
      });
      setStep('complete');
    } catch (err) {
      setStep('error');
    }
  }, [selectedFormat, contentType, contentIds, options, startExport]);

  const handleClose = useCallback(() => {
    if (!isExporting) {
      setStep('format');
      setSelectedFormat(null);
      setOptions({});
      reset();
      onOpenChange(false);
    }
  }, [isExporting, reset, onOpenChange]);

  const handleDownload = useCallback(() => {
    if (downloadUrl) {
      window.open(downloadUrl, '_blank');
    }
  }, [downloadUrl]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileArchive className="h-5 w-5" />
            Export Content
          </DialogTitle>
          <DialogDescription>
            {contentTitle
              ? `Export "${contentTitle}" to a learning standard format`
              : `Export ${contentIds.length} ${contentType}(s) to a learning standard format`}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Step: Format Selection */}
          {step === 'format' && (
            <ExportFormatSelector
              contentType={contentType}
              onSelect={handleFormatSelect}
            />
          )}

          {/* Step: Options */}
          {step === 'options' && selectedFormat && (
            <ExportOptionsPanel
              format={selectedFormat}
              contentType={contentType}
              options={options}
              onChange={setOptions}
            />
          )}

          {/* Step: Exporting */}
          {step === 'exporting' && (
            <div className="space-y-4">
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
              <Progress value={progress} className="w-full" />
              <p className="text-center text-sm text-muted-foreground">
                {progressMessage || 'Preparing export...'}
              </p>
            </div>
          )}

          {/* Step: Complete */}
          {step === 'complete' && (
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center py-8">
                <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
                <h3 className="text-lg font-semibold">Export Complete!</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Your export is ready for download
                </p>
              </div>
              <div className="flex justify-center">
                <Button onClick={handleDownload} size="lg">
                  <Download className="mr-2 h-4 w-4" />
                  Download Package
                </Button>
              </div>
              <p className="text-center text-xs text-muted-foreground">
                Download link expires in 7 days
              </p>
            </div>
          )}

          {/* Step: Error */}
          {step === 'error' && (
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center py-8">
                <XCircle className="h-16 w-16 text-destructive mb-4" />
                <h3 className="text-lg font-semibold">Export Failed</h3>
              </div>
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {error || 'An unexpected error occurred during export'}
                </AlertDescription>
              </Alert>
            </div>
          )}
        </div>

        <DialogFooter>
          {step === 'format' && (
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          )}

          {step === 'options' && (
            <>
              <Button variant="outline" onClick={handleBack}>
                Back
              </Button>
              <Button onClick={handleStartExport}>
                <FileArchive className="mr-2 h-4 w-4" />
                Start Export
              </Button>
            </>
          )}

          {(step === 'complete' || step === 'error') && (
            <Button variant="outline" onClick={handleClose}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
