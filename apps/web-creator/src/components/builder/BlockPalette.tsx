/**
 * Block Palette Component
 * Draggable block types that can be added to the lesson
 */

import React, { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Type,
  Heading1,
  Image,
  Video,
  AudioLines,
  CircleDot,
  ToggleLeft,
  PenLine,
  FileText,
  ArrowUpDown,
  Layers,
  CreditCard,
  Code,
  Minus,
  AlertCircle,
  ChevronDown,
  Table2,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Block type definitions
export interface BlockType {
  type: string;
  label: string;
  description: string;
  icon: React.ElementType;
  category: 'content' | 'question' | 'interactive' | 'layout';
  defaultContent: Record<string, unknown>;
}

const BLOCK_TYPES: BlockType[] = [
  // Content blocks
  {
    type: 'text',
    label: 'Text',
    description: 'Rich text content with formatting',
    icon: Type,
    category: 'content',
    defaultContent: { html: '' },
  },
  {
    type: 'heading',
    label: 'Heading',
    description: 'Section heading (H1-H3)',
    icon: Heading1,
    category: 'content',
    defaultContent: { text: '', level: 2 },
  },
  {
    type: 'image',
    label: 'Image',
    description: 'Image with caption and alt text',
    icon: Image,
    category: 'content',
    defaultContent: { src: '', alt: '', caption: '' },
  },
  {
    type: 'video',
    label: 'Video',
    description: 'Embedded video content',
    icon: Video,
    category: 'content',
    defaultContent: { src: '', type: 'youtube', autoplay: false },
  },
  {
    type: 'audio',
    label: 'Audio',
    description: 'Audio clip or narration',
    icon: AudioLines,
    category: 'content',
    defaultContent: { src: '', transcript: '' },
  },
  
  // Question blocks
  {
    type: 'multiple-choice',
    label: 'Multiple Choice',
    description: 'Single or multiple answer selection',
    icon: CircleDot,
    category: 'question',
    defaultContent: {
      question: '',
      options: [
        { id: crypto.randomUUID(), text: '' },
        { id: crypto.randomUUID(), text: '' },
      ],
      correctOptionId: null,
      allowMultiple: false,
      feedback: { correct: '', incorrect: '' },
    },
  },
  {
    type: 'true-false',
    label: 'True/False',
    description: 'Binary choice question',
    icon: ToggleLeft,
    category: 'question',
    defaultContent: {
      question: '',
      correctAnswer: true,
      feedback: { correct: '', incorrect: '' },
    },
  },
  {
    type: 'fill-blank',
    label: 'Fill in the Blank',
    description: 'Text with missing words',
    icon: PenLine,
    category: 'question',
    defaultContent: {
      template: '',
      blanks: [],
      caseSensitive: false,
    },
  },
  {
    type: 'short-answer',
    label: 'Short Answer',
    description: 'Free text response',
    icon: FileText,
    category: 'question',
    defaultContent: {
      question: '',
      expectedKeywords: [],
      maxLength: 500,
    },
  },
  {
    type: 'matching',
    label: 'Matching',
    description: 'Match items between columns',
    icon: ArrowUpDown,
    category: 'question',
    defaultContent: {
      question: '',
      pairs: [],
    },
  },
  {
    type: 'ordering',
    label: 'Ordering',
    description: 'Put items in correct order',
    icon: Layers,
    category: 'question',
    defaultContent: {
      question: '',
      items: [],
      correctOrder: [],
    },
  },
  
  // Interactive blocks
  {
    type: 'flashcard',
    label: 'Flashcard',
    description: 'Flip card with front/back',
    icon: CreditCard,
    category: 'interactive',
    defaultContent: {
      front: '',
      back: '',
      hint: '',
    },
  },
  {
    type: 'flashcard-set',
    label: 'Flashcard Set',
    description: 'Collection of flashcards',
    icon: Layers,
    category: 'interactive',
    defaultContent: {
      cards: [],
      shuffleOnStart: true,
    },
  },
  {
    type: 'embed',
    label: 'Embed',
    description: 'External content embed (iframe)',
    icon: Code,
    category: 'interactive',
    defaultContent: {
      url: '',
      height: 400,
    },
  },
  
  // Layout blocks
  {
    type: 'divider',
    label: 'Divider',
    description: 'Visual separator',
    icon: Minus,
    category: 'layout',
    defaultContent: { style: 'line' },
  },
  {
    type: 'callout',
    label: 'Callout',
    description: 'Highlighted information box',
    icon: AlertCircle,
    category: 'layout',
    defaultContent: {
      type: 'info',
      title: '',
      content: '',
    },
  },
  {
    type: 'accordion',
    label: 'Accordion',
    description: 'Collapsible content sections',
    icon: ChevronDown,
    category: 'layout',
    defaultContent: {
      sections: [{ title: '', content: '' }],
      allowMultiple: false,
    },
  },
  {
    type: 'table',
    label: 'Table',
    description: 'Data table with rows and columns',
    icon: Table2,
    category: 'layout',
    defaultContent: {
      headers: ['Column 1', 'Column 2'],
      rows: [['', '']],
      hasHeader: true,
    },
  },
];

interface BlockPaletteProps {
  onAddBlock: (blockType: BlockType) => void;
}

export const BlockPalette: React.FC<BlockPaletteProps> = ({ onAddBlock }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<string>('all');

  const filteredBlocks = BLOCK_TYPES.filter((block) => {
    const matchesSearch =
      searchQuery === '' ||
      block.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      block.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = activeTab === 'all' || block.category === activeTab;

    return matchesSearch && matchesCategory;
  });

  const categories = [
    { id: 'all', label: 'All' },
    { id: 'content', label: 'Content' },
    { id: 'question', label: 'Questions' },
    { id: 'interactive', label: 'Interactive' },
    { id: 'layout', label: 'Layout' },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Search */}
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search blocks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="mx-3 mt-2 grid grid-cols-5">
          {categories.map((cat) => (
            <TabsTrigger key={cat.id} value={cat.id} className="text-xs">
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="flex-1 m-0 mt-2">
          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="p-3 grid grid-cols-2 gap-2">
              {filteredBlocks.map((block) => (
                <DraggableBlock
                  key={block.type}
                  block={block}
                  onAdd={() => onAddBlock(block)}
                />
              ))}

              {filteredBlocks.length === 0 && (
                <div className="col-span-2 text-center py-8 text-muted-foreground">
                  No blocks found
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Draggable block item
interface DraggableBlockProps {
  block: BlockType;
  onAdd: () => void;
}

const DraggableBlock: React.FC<DraggableBlockProps> = ({ block, onAdd }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${block.type}`,
    data: { blockType: block },
  });

  const Icon = block.icon;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          ref={setNodeRef}
          {...attributes}
          {...listeners}
          onClick={onAdd}
          className={cn(
            'flex flex-col items-center justify-center p-3 rounded-lg border bg-card',
            'hover:border-primary hover:bg-accent transition-colors',
            'cursor-grab active:cursor-grabbing',
            isDragging && 'opacity-50'
          )}
        >
          <Icon className="h-6 w-6 mb-1 text-muted-foreground" />
          <span className="text-xs font-medium text-center">{block.label}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">
        <p className="font-medium">{block.label}</p>
        <p className="text-xs text-muted-foreground">{block.description}</p>
      </TooltipContent>
    </Tooltip>
  );
};

// Export block types for use in other components
export { BLOCK_TYPES };
