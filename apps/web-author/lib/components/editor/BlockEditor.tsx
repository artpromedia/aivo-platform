/**
 * BlockEditor Component
 *
 * Individual block editor with:
 * - Drag handle for reordering
 * - Block-type specific rendering
 * - Inline editing
 * - Selection and hover states
 * - Collaboration indicators
 */

'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Code,
  Columns,
  FileText,
  GripVertical,
  Heading1,
  HelpCircle,
  Image as ImageIcon,
  List,
  Lock,
  Plus,
  Quote,
  Trash2,
  Type,
  Video,
} from 'lucide-react';
import Image from 'next/image';
import React, { useCallback, useMemo } from 'react';

import type { Collaborator } from '../../api/collaboration';
import { getUserColor, getUserInitials } from '../../api/collaboration';
import type { ContentBlock } from '../../api/content';
import { selectBlockLock, useEditorStore } from '../../stores';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface BlockEditorProps {
  readonly block: ContentBlock;
  readonly index: number;
  readonly isSelected: boolean;
  readonly isReadOnly: boolean;
  readonly collaborators: Collaborator[];
  readonly onSelect: () => void;
  readonly onChange: (data: Partial<ContentBlock>) => void;
  readonly onDelete: () => void;
  readonly onAddAfter: () => void;
}

// ══════════════════════════════════════════════════════════════════════════════
// BLOCK TYPE ICONS
// ══════════════════════════════════════════════════════════════════════════════

const BLOCK_ICONS: Record<ContentBlock['type'], React.ElementType> = {
  paragraph: Type,
  heading: Heading1,
  image: ImageIcon,
  video: Video,
  audio: Video,
  code: Code,
  list: List,
  quiz: HelpCircle,
  interactive: HelpCircle,
  embed: FileText,
  divider: () => <div className="w-4 h-0.5 bg-gray-400" />,
  callout: Quote,
  table: Columns,
};

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export function BlockEditor({
  block,
  index: _index,
  isSelected,
  isReadOnly,
  collaborators,
  onSelect,
  onChange,
  onDelete,
  onAddAfter,
}: BlockEditorProps) {
  // Sortable setup
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
    disabled: isReadOnly,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Check for lock
  const blockLock = useEditorStore(selectBlockLock(block.id));
  const isLocked = blockLock?.isLocked ?? false;

  // Find collaborators editing this block
  const editingCollaborators = useMemo(
    () => collaborators.filter((c) => c.currentBlockId === block.id),
    [collaborators, block.id]
  );

  // Get block icon
  const BlockIcon = BLOCK_ICONS[block.type];

  // Handle content changes
  const handleContentChange = useCallback(
    (e: { currentTarget: { innerHTML: string } }) => {
      const newContent = e.currentTarget.innerHTML;
      onChange({ content: { ...block.content, content: newContent } });
    },
    [block.content, onChange]
  );

  // Render block content based on type
  const renderBlockContent = () => {
    switch (block.type) {
      case 'heading': {
        const level = (block.content.level as number) || 1;
        const HeadingTag = `h${level}` as keyof React.JSX.IntrinsicElements;
        const headingSizes = {
          1: 'text-3xl font-bold',
          2: 'text-2xl font-semibold',
          3: 'text-xl font-semibold',
          4: 'text-lg font-medium',
          5: 'text-base font-medium',
          6: 'text-sm font-medium',
        };
        return (
          <HeadingTag
            className={`${headingSizes[level as keyof typeof headingSizes] || headingSizes[1]} outline-none`}
            contentEditable={!isReadOnly && !isLocked}
            suppressContentEditableWarning
            onBlur={handleContentChange}
            dangerouslySetInnerHTML={{ __html: (block.content.content as string) || '' }}
          />
        );
      }

      case 'paragraph':
        return (
          <p
            className="text-base outline-none min-h-[1.5em]"
            contentEditable={!isReadOnly && !isLocked}
            suppressContentEditableWarning
            onBlur={handleContentChange}
            dangerouslySetInnerHTML={{ __html: (block.content.content as string) || '' }}
          />
        );

      case 'image': {
        const imageCaption = block.content.caption as string | undefined;
        const imageUrl = block.content.url as string | undefined;
        const imageAlt = (block.content.alt as string) || '';
        return (
          <figure className="space-y-2">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={imageAlt}
                width={800}
                height={600}
                className="max-w-full h-auto rounded-lg"
              />
            ) : (
              <div className="bg-gray-100 rounded-lg p-8 text-center text-gray-500">
                <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Click to add an image</p>
              </div>
            )}
            {imageCaption && (
              <figcaption className="text-sm text-gray-600 text-center">{imageCaption}</figcaption>
            )}
          </figure>
        );
      }

      case 'video':
        return (
          <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
            {block.content.url ? (
              <video src={block.content.url as string} controls className="w-full h-full">
                <track kind="captions" />
              </video>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-500">
                <Video className="w-12 h-12 opacity-50" />
              </div>
            )}
          </div>
        );

      case 'code':
        return (
          <div className="bg-gray-900 text-gray-100 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-gray-800 text-sm">
              <span className="text-gray-400">{(block.content.language as string) || 'code'}</span>
            </div>
            <pre className="p-4 overflow-x-auto">
              <code
                contentEditable={!isReadOnly && !isLocked}
                suppressContentEditableWarning
                onBlur={handleContentChange}
                className="outline-none font-mono text-sm"
              >
                {(block.content.content as string) || ''}
              </code>
            </pre>
          </div>
        );

      case 'list': {
        const isOrdered = block.content.ordered as boolean;
        const ListTag = isOrdered ? 'ol' : 'ul';
        const items = block.content.items as string[];
        return (
          <ListTag className={`${isOrdered ? 'list-decimal' : 'list-disc'} pl-6 space-y-1`}>
            {items.map((item, i) => (
              <li
                key={`list-item-${block.id}-${String(i)}`}
                contentEditable={!isReadOnly && !isLocked}
                suppressContentEditableWarning
                className="outline-none"
              >
                {item}
              </li>
            ))}
          </ListTag>
        );
      }

      case 'callout': {
        const variant = (block.content.variant as string) || 'info';
        const variantStyles = {
          info: 'bg-blue-50 border-blue-500 text-blue-900',
          warning: 'bg-amber-50 border-amber-500 text-amber-900',
          success: 'bg-green-50 border-green-500 text-green-900',
          error: 'bg-red-50 border-red-500 text-red-900',
          quote: 'bg-gray-50 border-gray-400 text-gray-900 italic',
        };
        const isQuoteStyle = variant === 'quote';
        const citation = block.content.citation as string | undefined;
        return (
          <div
            className={`border-l-4 p-4 rounded-r-lg ${variantStyles[variant as keyof typeof variantStyles] || variantStyles.info}`}
          >
            {isQuoteStyle ? (
              <blockquote>
                <p
                  contentEditable={!isReadOnly && !isLocked}
                  suppressContentEditableWarning
                  onBlur={handleContentChange}
                  className="outline-none"
                  dangerouslySetInnerHTML={{ __html: (block.content.content as string) || '' }}
                />
                {citation && (
                  <cite className="block mt-2 text-sm text-gray-500 not-italic">— {citation}</cite>
                )}
              </blockquote>
            ) : (
              <p
                contentEditable={!isReadOnly && !isLocked}
                suppressContentEditableWarning
                onBlur={handleContentChange}
                className="outline-none"
                dangerouslySetInnerHTML={{ __html: (block.content.content as string) || '' }}
              />
            )}
          </div>
        );
      }

      case 'divider':
        return <hr className="border-gray-300 my-4" />;

      case 'quiz':
        return (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-purple-700 mb-2">
              <HelpCircle className="w-5 h-5" />
              <span className="font-medium">Quiz Question</span>
            </div>
            <p
              contentEditable={!isReadOnly && !isLocked}
              suppressContentEditableWarning
              onBlur={handleContentChange}
              className="outline-none"
              dangerouslySetInnerHTML={{
                __html: (block.content.question as string) || 'Enter question...',
              }}
            />
          </div>
        );

      case 'embed': {
        const embedUrl = block.content.url as string | undefined;
        return (
          <div className="bg-gray-100 rounded-lg p-4 text-center">
            <FileText className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm text-gray-600">
              {embedUrl ? `Embedded: ${embedUrl}` : 'Add embed URL'}
            </p>
          </div>
        );
      }

      case 'table': {
        const rows = block.content.rows as string[][];
        return (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border border-gray-300">
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr key={`table-${block.id}-row-${String(rowIndex)}`}>
                    {row.map((cell, cellIndex) => (
                      <td
                        key={`table-${block.id}-cell-${String(rowIndex)}-${String(cellIndex)}`}
                        contentEditable={!isReadOnly && !isLocked}
                        suppressContentEditableWarning
                        className="border border-gray-300 px-3 py-2 outline-none"
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }

      default:
        return <p className="text-gray-500 italic">Unknown block type: {block.type}</p>;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        group relative rounded-lg transition-all
        ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50/50' : 'hover:bg-gray-50'}
        ${isDragging ? 'shadow-lg' : ''}
        ${isLocked ? 'opacity-75' : ''}
      `}
    >
      {/* Collaboration indicators */}
      {editingCollaborators.length > 0 && (
        <div className="absolute -top-3 left-4 flex -space-x-1">
          {editingCollaborators.map((collaborator) => (
            <div
              key={collaborator.userId}
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs text-white font-medium ring-2 ring-white"
              style={{ backgroundColor: getUserColor(collaborator.userId) }}
              title={collaborator.userName}
            >
              {getUserInitials(collaborator.userName)}
            </div>
          ))}
        </div>
      )}

      {/* Lock indicator */}
      {isLocked && (
        <div className="absolute -top-2 -right-2 bg-amber-500 text-white rounded-full p-1">
          <Lock className="w-3 h-3" />
        </div>
      )}

      {/* Block controls (visible on hover) */}
      {!isReadOnly && (
        <div className="absolute -left-10 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Drag handle */}
          <button
            {...attributes}
            {...listeners}
            className="p-1 rounded hover:bg-gray-200 cursor-grab active:cursor-grabbing"
            title="Drag to reorder"
          >
            <GripVertical className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      )}

      {/* Block content */}
      <button
        type="button"
        onClick={onSelect}
        className="w-full p-4 text-left focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-inset rounded-lg"
      >
        {/* Block type indicator */}
        <div className="flex items-center gap-2 mb-2">
          <BlockIcon className="w-4 h-4 text-gray-400" />
          <span className="text-xs text-gray-400 uppercase tracking-wide">{block.type}</span>
        </div>

        {/* Rendered content */}
        {renderBlockContent()}
      </button>

      {/* Block actions (visible on hover) */}
      {!isReadOnly && (
        <div className="absolute -right-10 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddAfter();
            }}
            className="p-1 rounded hover:bg-blue-100 text-blue-600"
            title="Add block after"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 rounded hover:bg-red-100 text-red-600"
            title="Delete block"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export default BlockEditor;
