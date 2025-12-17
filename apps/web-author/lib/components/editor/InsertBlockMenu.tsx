/**
 * InsertBlockMenu Component
 *
 * Menu for inserting new blocks with:
 * - Block type selection
 * - Quick search
 * - Keyboard navigation
 */

'use client';

import {
  Code,
  Columns,
  FileText,
  Heading1,
  Heading2,
  Heading3,
  HelpCircle,
  Image,
  List,
  ListOrdered,
  MessageSquare,
  Minus,
  Quote,
  Type,
  Video,
  X,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { ContentBlock } from '../../api/content';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface InsertBlockMenuProps {
  readonly onInsert: (block: ContentBlock) => void;
  readonly onClose: () => void;
}

interface BlockTypeOption {
  type: ContentBlock['type'];
  label: string;
  description: string;
  icon: React.ElementType;
  defaultData: Record<string, unknown>;
  category: 'text' | 'media' | 'interactive' | 'layout';
}

// ══════════════════════════════════════════════════════════════════════════════
// BLOCK TYPE OPTIONS
// ══════════════════════════════════════════════════════════════════════════════

const BLOCK_OPTIONS: BlockTypeOption[] = [
  {
    type: 'paragraph',
    label: 'Paragraph',
    description: 'Plain text paragraph',
    icon: Type,
    defaultData: { content: '' },
    category: 'text',
  },
  {
    type: 'heading',
    label: 'Heading 1',
    description: 'Large section heading',
    icon: Heading1,
    defaultData: { content: '', level: 1 },
    category: 'text',
  },
  {
    type: 'heading',
    label: 'Heading 2',
    description: 'Medium section heading',
    icon: Heading2,
    defaultData: { content: '', level: 2 },
    category: 'text',
  },
  {
    type: 'heading',
    label: 'Heading 3',
    description: 'Small section heading',
    icon: Heading3,
    defaultData: { content: '', level: 3 },
    category: 'text',
  },
  {
    type: 'list',
    label: 'Bullet List',
    description: 'Unordered list with bullets',
    icon: List,
    defaultData: { items: [''], ordered: false },
    category: 'text',
  },
  {
    type: 'list',
    label: 'Numbered List',
    description: 'Ordered list with numbers',
    icon: ListOrdered,
    defaultData: { items: [''], ordered: true },
    category: 'text',
  },
  {
    type: 'callout',
    label: 'Quote',
    description: 'Block quote with optional citation',
    icon: Quote,
    defaultData: { content: '', citation: '', variant: 'quote' },
    category: 'text',
  },
  {
    type: 'image',
    label: 'Image',
    description: 'Upload or embed an image',
    icon: Image,
    defaultData: { url: '', alt: '', caption: '' },
    category: 'media',
  },
  {
    type: 'video',
    label: 'Video',
    description: 'Embed a video',
    icon: Video,
    defaultData: { url: '', thumbnail: '' },
    category: 'media',
  },
  {
    type: 'code',
    label: 'Code Block',
    description: 'Code with syntax highlighting',
    icon: Code,
    defaultData: { content: '', language: 'javascript' },
    category: 'media',
  },
  {
    type: 'embed',
    label: 'Embed',
    description: 'Embed external content',
    icon: FileText,
    defaultData: { url: '', type: 'iframe' },
    category: 'media',
  },
  {
    type: 'quiz',
    label: 'Quiz Question',
    description: 'Interactive question block',
    icon: HelpCircle,
    defaultData: { question: '', type: 'multiple-choice', options: [] },
    category: 'interactive',
  },
  {
    type: 'callout',
    label: 'Callout',
    description: 'Highlighted information box',
    icon: MessageSquare,
    defaultData: { content: '', variant: 'info' },
    category: 'interactive',
  },
  {
    type: 'table',
    label: 'Table',
    description: 'Data table with rows and columns',
    icon: Columns,
    defaultData: {
      rows: [
        ['', ''],
        ['', ''],
      ],
    },
    category: 'layout',
  },
  {
    type: 'divider',
    label: 'Divider',
    description: 'Horizontal line separator',
    icon: Minus,
    defaultData: {},
    category: 'layout',
  },
];

const CATEGORY_LABELS: Record<string, string> = {
  text: 'Text',
  media: 'Media',
  interactive: 'Interactive',
  layout: 'Layout',
};

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export function InsertBlockMenu({ onInsert, onClose }: InsertBlockMenuProps) {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter options based on search
  const filteredOptions = useMemo(() => {
    if (!search.trim()) return BLOCK_OPTIONS;
    const query = search.toLowerCase();
    return BLOCK_OPTIONS.filter(
      (opt) =>
        opt.label.toLowerCase().includes(query) ||
        opt.description.toLowerCase().includes(query) ||
        opt.type.toLowerCase().includes(query)
    );
  }, [search]);

  // Group options by category
  const groupedOptions = useMemo(() => {
    const groups: Record<string, BlockTypeOption[]> = {};
    for (const opt of filteredOptions) {
      groups[opt.category] ??= [];
      groups[opt.category]?.push(opt);
    }
    return groups;
  }, [filteredOptions]);

  // Create a new block
  const createBlock = useCallback(
    (option: BlockTypeOption) => {
      const block: ContentBlock = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        type: option.type,
        content: { ...option.defaultData },
        orderIndex: 0, // Will be set by parent
      };
      onInsert(block);
    },
    [onInsert]
  );

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, filteredOptions.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredOptions[selectedIndex]) {
            createBlock(filteredOptions[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [filteredOptions, selectedIndex, createBlock, onClose]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Reset selection when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  let flatIndex = 0;

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
      <div
        ref={menuRef}
        className="bg-white rounded-xl shadow-2xl w-[480px] max-h-[600px] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Add Block</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200">
          <input
            ref={inputRef}
            type="text"
            placeholder="Search blocks..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Options */}
        <div className="flex-1 overflow-y-auto p-2">
          {filteredOptions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No blocks found matching &ldquo;{search}&rdquo;
            </div>
          ) : (
            Object.entries(groupedOptions).map(([category, options]) => (
              <div key={category} className="mb-4">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2">
                  {CATEGORY_LABELS[category] || category}
                </h4>
                <div className="space-y-1">
                  {options.map((option) => {
                    const currentFlatIndex = flatIndex++;
                    const isSelected = currentFlatIndex === selectedIndex;
                    const Icon = option.icon;

                    return (
                      <button
                        key={`${option.type}-${option.label}`}
                        onClick={() => {
                          createBlock(option);
                        }}
                        onMouseEnter={() => {
                          setSelectedIndex(currentFlatIndex);
                        }}
                        className={`
                          w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors
                          ${isSelected ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'}
                        `}
                      >
                        <div
                          className={`
                            p-2 rounded-lg
                            ${isSelected ? 'bg-blue-100' : 'bg-gray-100'}
                          `}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-medium text-sm">{option.label}</div>
                          <div className="text-xs text-gray-500">{option.description}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-200 text-xs text-gray-400 flex items-center justify-between">
          <span>↑↓ Navigate</span>
          <span>↵ Select</span>
          <span>Esc Close</span>
        </div>
      </div>
    </div>
  );
}

export default InsertBlockMenu;
