'use client';

import {
  Download,
  FileText,
  Loader2,
  CheckCircle,
  Share2,
  Mail,
  Printer,
} from 'lucide-react';
import { useState } from 'react';

interface PDFExportProps {
  childId: string;
  childName: string;
  dateRange: { start: string; end: string };
  onExport: () => Promise<void>;
  isExporting?: boolean;
}

export function PDFExport({
  childId,
  childName,
  dateRange,
  onExport,
  isExporting = false,
}: PDFExportProps) {
  const [showOptions, setShowOptions] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const handleExport = async () => {
    try {
      await onExport();
      setExportSuccess(true);
      setTimeout(() => { setExportSuccess(false); }, 3000);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleEmail = () => {
    const subject = encodeURIComponent(`Progress Report for ${childName}`);
    const body = encodeURIComponent(
      `Please find attached the progress report for ${childName} from ${dateRange.start} to ${dateRange.end}.`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  return (
    <div className="relative">
      <button
        onClick={() => { setShowOptions(!showOptions); }}
        disabled={isExporting}
        className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
      >
        {isExporting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Generating...</span>
          </>
        ) : exportSuccess ? (
          <>
            <CheckCircle className="w-5 h-5" />
            <span>Downloaded!</span>
          </>
        ) : (
          <>
            <FileText className="w-5 h-5" />
            <span>Export PDF</span>
          </>
        )}
      </button>

      {showOptions && !isExporting && !exportSuccess && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-2 z-10">
          <button
            onClick={handleExport}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Download PDF</span>
          </button>
          <button
            onClick={handlePrint}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
          <button
            onClick={handleEmail}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
          >
            <Mail className="w-4 h-4" />
            <span>Email Report</span>
          </button>
          <hr className="my-2 border-gray-100" />
          <button
            onClick={() => {
              navigator.clipboard.writeText(
                `${window.location.origin}/reports/shared/${childId}?start=${dateRange.start}&end=${dateRange.end}`
              );
              setShowOptions(false);
            }}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
          >
            <Share2 className="w-4 h-4" />
            <span>Copy Share Link</span>
          </button>
        </div>
      )}

      {/* Click outside to close */}
      {showOptions && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => { setShowOptions(false); }}
        />
      )}
    </div>
  );
}
