'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ShareResultsProps {
  sessionId: string;
}

export function ShareResults({ sessionId }: ShareResultsProps) {
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    try {
      const shareUrl = `${window.location.origin}/assessment/results/${sessionId}`;
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleShareEmail = () => {
    const subject = 'Check out my AIVO assessment results!';
    const body = `I just completed my baseline assessment on AIVO!\n\nView my results: ${window.location.origin}/assessment/results/${sessionId}`;
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowShareMenu(!showShareMenu)}
        className="flex items-center gap-2 px-4 py-2 border-2 border-gray-200 rounded-lg
          hover:border-indigo-600 hover:bg-indigo-50 transition-all"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
          />
        </svg>
        <span className="font-medium text-gray-900">Share</span>
      </button>

      <AnimatePresence>
        {showShareMenu && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-full left-0 mb-2 bg-white rounded-xl shadow-xl border-2 border-gray-100 p-2 min-w-[200px]"
          >
            <button
              onClick={handleCopyLink}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-indigo-50 transition-colors"
            >
              <span className="text-xl">{copied ? '✓' : '🔗'}</span>
              <span className="font-medium text-gray-900">
                {copied ? 'Copied!' : 'Copy Link'}
              </span>
            </button>

            <button
              onClick={handleShareEmail}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-indigo-50 transition-colors"
            >
              <span className="text-xl">📧</span>
              <span className="font-medium text-gray-900">Share via Email</span>
            </button>

            <button
              onClick={handlePrint}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-indigo-50 transition-colors"
            >
              <span className="text-xl">🖨️</span>
              <span className="font-medium text-gray-900">Print Results</span>
            </button>

            <div className="border-t border-gray-100 my-2" />

            <div className="px-4 py-2 text-xs text-gray-500">
              Share your progress with parents or teachers!
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
