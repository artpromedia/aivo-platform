/**
 * EditorHeader Component
 *
 * Header with:
 * - Save status indicator
 * - Mode switcher
 * - Collaboration status
 * - Action buttons
 */

'use client';

import { format } from 'date-fns';
import {
  AlertCircle,
  CheckCircle,
  Edit3,
  Eye,
  Loader2,
  MessageSquare,
  Save,
  Send,
  Wifi,
  WifiOff,
} from 'lucide-react';
import React from 'react';

import type { EditorMode } from '../../stores';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface EditorHeaderProps {
  readonly hasUnsavedChanges: boolean;
  readonly isSaving: boolean;
  readonly saveError: Error | null;
  readonly lastSavedAt: Date | null;
  readonly isConnected: boolean;
  readonly mode: EditorMode;
  readonly onModeChange: (mode: EditorMode) => void;
  readonly onSave: () => void;
  readonly onPublish?: (() => void) | undefined;
  readonly readOnly: boolean;
  readonly children?: React.ReactNode | undefined;
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export function EditorHeader({
  hasUnsavedChanges,
  isSaving,
  saveError,
  lastSavedAt,
  isConnected,
  mode,
  onModeChange,
  onSave,
  onPublish,
  readOnly,
  children,
}: EditorHeaderProps) {
  // Save status display
  const renderSaveStatus = () => {
    if (isSaving) {
      return (
        <div className="flex items-center gap-2 text-blue-600">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Saving...</span>
        </div>
      );
    }

    if (saveError) {
      return (
        <div className="flex items-center gap-2 text-red-600">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">Save failed</span>
        </div>
      );
    }

    if (hasUnsavedChanges) {
      return (
        <div className="flex items-center gap-2 text-amber-600">
          <div className="w-2 h-2 rounded-full bg-amber-500" />
          <span className="text-sm">Unsaved changes</span>
        </div>
      );
    }

    if (lastSavedAt) {
      return (
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle className="w-4 h-4" />
          <span className="text-sm">Saved {format(lastSavedAt, 'h:mm a')}</span>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
      {/* Left side - Save status and connection */}
      <div className="flex items-center gap-4">
        {/* Connection status */}
        <div
          className={`flex items-center gap-1.5 ${isConnected ? 'text-green-600' : 'text-gray-400'}`}
          title={
            isConnected
              ? 'Connected - Real-time sync active'
              : 'Offline - Changes will sync when reconnected'
          }
        >
          {isConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
        </div>

        {/* Save status */}
        {renderSaveStatus()}
      </div>

      {/* Center - Mode switcher */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => {
            onModeChange('edit');
          }}
          disabled={readOnly}
          className={`
            flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors
            ${
              mode === 'edit'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }
            ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <Edit3 className="w-4 h-4" />
          Edit
        </button>
        <button
          onClick={() => {
            onModeChange('preview');
          }}
          className={`
            flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors
            ${
              mode === 'preview'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }
          `}
        >
          <Eye className="w-4 h-4" />
          Preview
        </button>
        <button
          onClick={() => {
            onModeChange('review');
          }}
          className={`
            flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors
            ${
              mode === 'review'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }
          `}
        >
          <MessageSquare className="w-4 h-4" />
          Review
        </button>
      </div>

      {/* Right side - Collaborators and actions */}
      <div className="flex items-center gap-4">
        {/* Collaborator avatars */}
        {children}

        {/* Save button */}
        {!readOnly && (
          <button
            onClick={onSave}
            disabled={isSaving || !hasUnsavedChanges}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${
                hasUnsavedChanges && !isSaving
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </button>
        )}

        {/* Publish button */}
        {!readOnly && onPublish && (
          <button
            onClick={onPublish}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
          >
            <Send className="w-4 h-4" />
            Submit for Review
          </button>
        )}
      </div>
    </div>
  );
}

export default EditorHeader;
