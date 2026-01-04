'use client';

/**
 * Block Palette Component
 *
 * Sidebar with draggable block types that can be added to the lesson
 * Features:
 * - Category grouping (Text, Media, Interactive, Activity, Layout)
 * - Search/filter blocks
 * - Block previews
 * - Drag to add or click to insert
 */

import React from 'react';
import {
  FileText,
  Heading,
  List,
  Quote,
  Image,
  Video,
  Music,
  Code,
  HelpCircle,
  BarChart3,
  Layers,
  Move,
  FileEdit,
  Clipboard,
  MessageSquare,
  Columns,
  Minus,
  AlertCircle,
  ChevronDown,
  Search,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

export type BlockType =
  | 'TEXT_PARAGRAPH'
  | 'TEXT_HEADING'
  | 'TEXT_LIST'
  | 'TEXT_QUOTE'
  | 'MEDIA_IMAGE'
  | 'MEDIA_VIDEO'
  | 'MEDIA_AUDIO'
  | 'MEDIA_EMBED'
  | 'QUIZ'
  | 'POLL'
  | 'FLASHCARD'
  | 'DRAG_DROP'
  | 'ACTIVITY_WORKSHEET'
  | 'ACTIVITY_ASSIGNMENT'
  | 'ACTIVITY_DISCUSSION'
  | 'LAYOUT_COLUMNS'
  | 'LAYOUT_DIVIDER'
  | 'LAYOUT_CALLOUT'
  | 'LAYOUT_ACCORDION';

interface BlockTypeItem {
  type: BlockType;
  label: string;
  description: string;
  icon: React.ElementType;
  category: 'text' | 'media' | 'interactive' | 'activity' | 'layout';
}

interface BlockPaletteProps {
  onAddBlock: (type: BlockType) => void;
}

// ════════════════════════════════════════════════════════════════════════════
// BLOCK TYPES DEFINITION
// ════════════════════════════════════════════════════════════════════════════

const BLOCK_TYPES: BlockTypeItem[] = [
  // Text Blocks
  {
    type: 'TEXT_PARAGRAPH',
    label: 'Paragraph',
    description: 'Rich text content',
    icon: FileText,
    category: 'text',
  },
  {
    type: 'TEXT_HEADING',
    label: 'Heading',
    description: 'Section heading',
    icon: Heading,
    category: 'text',
  },
  {
    type: 'TEXT_LIST',
    label: 'List',
    description: 'Bulleted or numbered',
    icon: List,
    category: 'text',
  },
  {
    type: 'TEXT_QUOTE',
    label: 'Quote',
    description: 'Highlighted quote',
    icon: Quote,
    category: 'text',
  },

  // Media Blocks
  {
    type: 'MEDIA_IMAGE',
    label: 'Image',
    description: 'Upload or link image',
    icon: Image,
    category: 'media',
  },
  {
    type: 'MEDIA_VIDEO',
    label: 'Video',
    description: 'Embed video content',
    icon: Video,
    category: 'media',
  },
  {
    type: 'MEDIA_AUDIO',
    label: 'Audio',
    description: 'Embed audio file',
    icon: Music,
    category: 'media',
  },
  {
    type: 'MEDIA_EMBED',
    label: 'Embed',
    description: 'External content',
    icon: Code,
    category: 'media',
  },

  // Interactive Blocks
  {
    type: 'QUIZ',
    label: 'Quiz',
    description: 'Question with answers',
    icon: HelpCircle,
    category: 'interactive',
  },
  {
    type: 'POLL',
    label: 'Poll',
    description: 'Student polling',
    icon: BarChart3,
    category: 'interactive',
  },
  {
    type: 'FLASHCARD',
    label: 'Flashcards',
    description: 'Study flashcards',
    icon: Layers,
    category: 'interactive',
  },
  {
    type: 'DRAG_DROP',
    label: 'Drag & Drop',
    description: 'Interactive activity',
    icon: Move,
    category: 'interactive',
  },

  // Activity Blocks
  {
    type: 'ACTIVITY_WORKSHEET',
    label: 'Worksheet',
    description: 'Practice exercises',
    icon: FileEdit,
    category: 'activity',
  },
  {
    type: 'ACTIVITY_ASSIGNMENT',
    label: 'Assignment',
    description: 'Graded assignment',
    icon: Clipboard,
    category: 'activity',
  },
  {
    type: 'ACTIVITY_DISCUSSION',
    label: 'Discussion',
    description: 'Discussion prompt',
    icon: MessageSquare,
    category: 'activity',
  },

  // Layout Blocks
  {
    type: 'LAYOUT_COLUMNS',
    label: 'Columns',
    description: 'Multi-column layout',
    icon: Columns,
    category: 'layout',
  },
  {
    type: 'LAYOUT_DIVIDER',
    label: 'Divider',
    description: 'Horizontal line',
    icon: Minus,
    category: 'layout',
  },
  {
    type: 'LAYOUT_CALLOUT',
    label: 'Callout',
    description: 'Highlighted box',
    icon: AlertCircle,
    category: 'layout',
  },
  {
    type: 'LAYOUT_ACCORDION',
    label: 'Accordion',
    description: 'Expandable sections',
    icon: ChevronDown,
    category: 'layout',
  },
];

const CATEGORIES = [
  { key: 'text', label: 'Text', icon: FileText },
  { key: 'media', label: 'Media', icon: Image },
  { key: 'interactive', label: 'Interactive', icon: HelpCircle },
  { key: 'activity', label: 'Activity', icon: Clipboard },
  { key: 'layout', label: 'Layout', icon: Columns },
] as const;

// ════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════

export function BlockPalette({ onAddBlock }: BlockPaletteProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [expandedCategories, setExpandedCategories] = React.useState<Set<string>>(
    new Set(['text', 'media', 'interactive'])
  );

  const filteredBlocks = React.useMemo(() => {
    if (!searchQuery) return BLOCK_TYPES;

    const query = searchQuery.toLowerCase();
    return BLOCK_TYPES.filter(
      (block) =>
        block.label.toLowerCase().includes(query) ||
        block.description.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const blocksByCategory = React.useMemo(() => {
    const grouped: Record<string, BlockTypeItem[]> = {};
    CATEGORIES.forEach((cat) => {
      grouped[cat.key] = filteredBlocks.filter((block) => block.category === cat.key);
    });
    return grouped;
  }, [filteredBlocks]);

  const toggleCategory = (categoryKey: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryKey)) {
        next.delete(categoryKey);
      } else {
        next.add(categoryKey);
      }
      return next;
    });
  };

  return (
    <div className="flex h-full w-80 flex-col border-r bg-white">
      {/* Header */}
      <div className="border-b px-4 py-3">
        <h2 className="mb-3 text-sm font-semibold">Add Block</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search blocks..."
            className="pl-9"
          />
        </div>
      </div>

      {/* Block Categories */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {CATEGORIES.map((category) => {
            const blocks = blocksByCategory[category.key];
            if (blocks.length === 0 && searchQuery) return null;

            const isExpanded = expandedCategories.has(category.key);
            const CategoryIcon = category.icon;

            return (
              <Collapsible
                key={category.key}
                open={isExpanded}
                onOpenChange={() => toggleCategory(category.key)}
                className="mb-4"
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="mb-2 flex w-full items-center justify-between px-2 py-1 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground"
                  >
                    <span className="flex items-center gap-2">
                      <CategoryIcon className="h-4 w-4" />
                      {category.label}
                      <span className="ml-1 text-xs">({blocks.length})</span>
                    </span>
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 transition-transform',
                        isExpanded && 'rotate-180'
                      )}
                    />
                  </Button>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="space-y-1">
                    {blocks.map((block) => (
                      <BlockTypeButton
                        key={block.type}
                        block={block}
                        onClick={() => onAddBlock(block.type)}
                      />
                    ))}
                  </div>
                </CollapsibleContent>

                <Separator className="mt-4" />
              </Collapsible>
            );
          })}

          {searchQuery && filteredBlocks.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No blocks found matching "{searchQuery}"
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer Help Text */}
      <div className="border-t bg-gray-50 px-4 py-3">
        <p className="text-xs text-muted-foreground">
          Click a block to add it to your lesson, or drag it to a specific position.
        </p>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// BLOCK TYPE BUTTON
// ════════════════════════════════════════════════════════════════════════════

interface BlockTypeButtonProps {
  block: BlockTypeItem;
  onClick: () => void;
}

function BlockTypeButton({ block, onClick }: BlockTypeButtonProps) {
  const Icon = block.icon;

  return (
    <Button
      variant="ghost"
      className="h-auto w-full justify-start py-3 hover:bg-gray-100"
      onClick={onClick}
    >
      <div className="flex w-full items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 text-left">
          <div className="mb-0.5 text-sm font-medium">{block.label}</div>
          <div className="text-xs text-muted-foreground">{block.description}</div>
        </div>
      </div>
    </Button>
  );
}
