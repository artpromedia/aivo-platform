/**
 * EditorToolbar Component
 *
 * Toolbar with:
 * - Block type actions
 * - Formatting controls
 * - Undo/redo
 */

'use client';

import {
  Bold,
  Code,
  Columns,
  Heading1,
  Heading2,
  HelpCircle,
  Image,
  Italic,
  Link,
  List,
  ListOrdered,
  MessageSquare,
  Minus,
  Plus,
  Quote,
  Redo2,
  Type,
  Underline,
  Undo2,
  Video,
} from 'lucide-react';
import React from 'react';

import { selectCanRedo, selectCanUndo, useContentStore, useEditorStore } from '../../stores';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface EditorToolbarProps {
  readonly selectedBlockId: string | null;
  readonly onInsertBlock: () => void;
}

interface ToolbarButtonProps {
  readonly icon: React.ElementType;
  readonly label: string;
  readonly onClick: () => void;
  readonly disabled?: boolean;
  readonly active?: boolean;
}

// ══════════════════════════════════════════════════════════════════════════════
// TOOLBAR BUTTON
// ══════════════════════════════════════════════════════════════════════════════

function getButtonClassName(disabled: boolean, active: boolean): string {
  if (disabled) {
    return 'text-gray-300 cursor-not-allowed';
  }
  if (active) {
    return 'bg-blue-100 text-blue-600';
  }
  return 'text-gray-600 hover:bg-gray-100';
}

function ToolbarButton({
  icon: Icon,
  label,
  onClick,
  disabled = false,
  active = false,
}: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={`
        p-2 rounded-lg transition-colors
        ${getButtonClassName(disabled, active)}
      `}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export function EditorToolbar({
  selectedBlockId: _selectedBlockId,
  onInsertBlock,
}: EditorToolbarProps) {
  // Store access
  const canUndo = useEditorStore(selectCanUndo);
  const canRedo = useEditorStore(selectCanRedo);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const setVersionBlocks = useContentStore((s) => s.setVersionBlocks);

  // Handle undo
  const handleUndo = () => {
    const blocks = undo();
    if (blocks) {
      setVersionBlocks(blocks);
    }
  };

  // Handle redo
  const handleRedo = () => {
    const blocks = redo();
    if (blocks) {
      setVersionBlocks(blocks);
    }
  };

  // Text formatting using document.execCommand
  // This API is deprecated but remains the only way to format contenteditable text
  // until the Input Events Level 2 spec is fully implemented across browsers
  const handleFormat = (format: 'bold' | 'italic' | 'underline') => {
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    document.execCommand(format);
  };

  const handleLink = () => {
    const url = globalThis.prompt('Enter URL:');
    if (url) {
      // eslint-disable-next-line @typescript-eslint/no-deprecated
      document.execCommand('createLink', false, url);
    }
  };

  return (
    <div className="border-b border-gray-200 bg-white px-4 py-2">
      <div className="flex items-center gap-1 flex-wrap">
        {/* History */}
        <div className="flex items-center gap-0.5 pr-3 border-r border-gray-200">
          <ToolbarButton
            icon={Undo2}
            label="Undo (Ctrl+Z)"
            onClick={handleUndo}
            disabled={!canUndo}
          />
          <ToolbarButton
            icon={Redo2}
            label="Redo (Ctrl+Y)"
            onClick={handleRedo}
            disabled={!canRedo}
          />
        </div>

        {/* Text formatting */}
        <div className="flex items-center gap-0.5 px-3 border-r border-gray-200">
          <ToolbarButton
            icon={Bold}
            label="Bold (Ctrl+B)"
            onClick={() => {
              handleFormat('bold');
            }}
          />
          <ToolbarButton
            icon={Italic}
            label="Italic (Ctrl+I)"
            onClick={() => {
              handleFormat('italic');
            }}
          />
          <ToolbarButton
            icon={Underline}
            label="Underline (Ctrl+U)"
            onClick={() => {
              handleFormat('underline');
            }}
          />
          <ToolbarButton icon={Link} label="Insert Link (Ctrl+K)" onClick={handleLink} />
        </div>

        {/* Block types */}
        <div className="flex items-center gap-0.5 px-3 border-r border-gray-200">
          <ToolbarButton icon={Type} label="Paragraph" onClick={onInsertBlock} />
          <ToolbarButton icon={Heading1} label="Heading 1" onClick={onInsertBlock} />
          <ToolbarButton icon={Heading2} label="Heading 2" onClick={onInsertBlock} />
        </div>

        {/* Media */}
        <div className="flex items-center gap-0.5 px-3 border-r border-gray-200">
          <ToolbarButton icon={Image} label="Image" onClick={onInsertBlock} />
          <ToolbarButton icon={Video} label="Video" onClick={onInsertBlock} />
          <ToolbarButton icon={Code} label="Code Block" onClick={onInsertBlock} />
        </div>

        {/* Lists & quotes */}
        <div className="flex items-center gap-0.5 px-3 border-r border-gray-200">
          <ToolbarButton icon={List} label="Bullet List" onClick={onInsertBlock} />
          <ToolbarButton icon={ListOrdered} label="Numbered List" onClick={onInsertBlock} />
          <ToolbarButton icon={Quote} label="Quote" onClick={onInsertBlock} />
        </div>

        {/* Interactive */}
        <div className="flex items-center gap-0.5 px-3 border-r border-gray-200">
          <ToolbarButton icon={HelpCircle} label="Quiz" onClick={onInsertBlock} />
          <ToolbarButton icon={Columns} label="Table" onClick={onInsertBlock} />
          <ToolbarButton icon={MessageSquare} label="Callout" onClick={onInsertBlock} />
        </div>

        {/* Other */}
        <div className="flex items-center gap-0.5 px-3">
          <ToolbarButton icon={Minus} label="Divider" onClick={onInsertBlock} />
          <ToolbarButton icon={Plus} label="Add Block" onClick={onInsertBlock} />
        </div>
      </div>
    </div>
  );
}

export default EditorToolbar;
