'use client';

/**
 * Block Editor Component
 *
 * Provides editing interfaces for different block types:
 * - Rich text editor for text blocks
 * - Media uploader for image/video blocks
 * - Quiz builder for quiz blocks
 * - Activity configuration for activity blocks
 * - Block settings panel
 */

import React from 'react';
import { X, Save, Image as ImageIcon, Video, Music, HelpCircle, Settings as SettingsIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { RichTextEditor } from '@/components/shared/rich-text-editor';

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

export interface Block {
  id: string;
  type: string;
  position: number;
  content: Record<string, any>;
  settings?: Record<string, any>;
}

interface BlockEditorProps {
  block: Block | null;
  onClose: () => void;
  onSave: (block: Block) => void;
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════

export function BlockEditor({ block, onClose, onSave }: BlockEditorProps) {
  const [editedBlock, setEditedBlock] = React.useState<Block | null>(block);
  const [activeTab, setActiveTab] = React.useState<'content' | 'settings'>('content');

  React.useEffect(() => {
    setEditedBlock(block);
    setActiveTab('content');
  }, [block]);

  if (!editedBlock) {
    return null;
  }

  const handleContentChange = (updates: Partial<Block['content']>) => {
    setEditedBlock((prev) => prev ? {
      ...prev,
      content: { ...prev.content, ...updates },
    } : null);
  };

  const handleSettingsChange = (updates: Partial<Block['settings']>) => {
    setEditedBlock((prev) => prev ? {
      ...prev,
      settings: { ...prev.settings, ...updates },
    } : null);
  };

  const handleSave = () => {
    if (editedBlock) {
      onSave(editedBlock);
    }
  };

  return (
    <div className="flex h-full flex-col border-l bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h3 className="font-semibold">Edit {getBlockTypeName(editedBlock.type)}</h3>
          <p className="text-xs text-muted-foreground">Block ID: {editedBlock.id.slice(0, 8)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            Save
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Editor Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col">
        <TabsList className="mx-4 mt-4 grid w-auto grid-cols-2">
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          <div className="p-4">
            <TabsContent value="content" className="mt-0">
              <BlockContentEditor
                block={editedBlock}
                onChange={handleContentChange}
              />
            </TabsContent>

            <TabsContent value="settings" className="mt-0">
              <BlockSettingsEditor
                block={editedBlock}
                onChange={handleSettingsChange}
              />
            </TabsContent>
          </div>
        </ScrollArea>
      </Tabs>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// BLOCK CONTENT EDITOR
// ════════════════════════════════════════════════════════════════════════════

interface BlockContentEditorProps {
  block: Block;
  onChange: (updates: Partial<Block['content']>) => void;
}

function BlockContentEditor({ block, onChange }: BlockContentEditorProps) {
  const { type, content } = block;

  switch (type) {
    case 'TEXT_PARAGRAPH':
      return (
        <div className="space-y-4">
          <div>
            <Label>Paragraph Content</Label>
            <RichTextEditor
              value={content.text || ''}
              onChange={(text) => onChange({ text })}
              placeholder="Enter your text..."
              minHeight={200}
            />
          </div>
        </div>
      );

    case 'TEXT_HEADING':
      return (
        <div className="space-y-4">
          <div>
            <Label htmlFor="heading-text">Heading Text</Label>
            <Input
              id="heading-text"
              value={content.text || ''}
              onChange={(e) => onChange({ text: e.target.value })}
              placeholder="Enter heading..."
            />
          </div>
          <div>
            <Label htmlFor="heading-level">Heading Level</Label>
            <Select
              value={String(content.level || '2')}
              onValueChange={(level) => onChange({ level: parseInt(level) })}
            >
              <SelectTrigger id="heading-level">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">H1 - Main Title</SelectItem>
                <SelectItem value="2">H2 - Section</SelectItem>
                <SelectItem value="3">H3 - Subsection</SelectItem>
                <SelectItem value="4">H4 - Minor Heading</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      );

    case 'TEXT_LIST':
      return <ListEditor content={content} onChange={onChange} />;

    case 'TEXT_QUOTE':
      return (
        <div className="space-y-4">
          <div>
            <Label>Quote Text</Label>
            <RichTextEditor
              value={content.text || ''}
              onChange={(text) => onChange({ text })}
              placeholder="Enter quote..."
              minHeight={120}
            />
          </div>
          <div>
            <Label htmlFor="quote-author">Author (optional)</Label>
            <Input
              id="quote-author"
              value={content.author || ''}
              onChange={(e) => onChange({ author: e.target.value })}
              placeholder="Quote author..."
            />
          </div>
        </div>
      );

    case 'MEDIA_IMAGE':
      return <ImageEditor content={content} onChange={onChange} />;

    case 'MEDIA_VIDEO':
      return <VideoEditor content={content} onChange={onChange} />;

    case 'MEDIA_AUDIO':
      return <AudioEditor content={content} onChange={onChange} />;

    case 'QUIZ':
      return <QuizEditor content={content} onChange={onChange} />;

    case 'POLL':
      return <PollEditor content={content} onChange={onChange} />;

    case 'FLASHCARD':
      return <FlashcardEditor content={content} onChange={onChange} />;

    case 'ACTIVITY_WORKSHEET':
      return <WorksheetEditor content={content} onChange={onChange} />;

    case 'ACTIVITY_ASSIGNMENT':
      return <AssignmentEditor content={content} onChange={onChange} />;

    case 'ACTIVITY_DISCUSSION':
      return <DiscussionEditor content={content} onChange={onChange} />;

    case 'LAYOUT_CALLOUT':
      return <CalloutEditor content={content} onChange={onChange} />;

    default:
      return (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          <p>No editor available for this block type.</p>
          <p className="mt-2 text-sm">Type: {type}</p>
        </div>
      );
  }
}

// ════════════════════════════════════════════════════════════════════════════
// BLOCK SETTINGS EDITOR
// ════════════════════════════════════════════════════════════════════════════

interface BlockSettingsEditorProps {
  block: Block;
  onChange: (updates: Partial<Block['settings']>) => void;
}

function BlockSettingsEditor({ block, onChange }: BlockSettingsEditorProps) {
  const { type, settings = {} } = block;

  // Common settings for text blocks
  if (type.startsWith('TEXT_')) {
    return (
      <div className="space-y-4">
        <div>
          <Label htmlFor="alignment">Text Alignment</Label>
          <Select
            value={settings.alignment || 'left'}
            onValueChange={(alignment) => onChange({ alignment })}
          >
            <SelectTrigger id="alignment">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Left</SelectItem>
              <SelectItem value="center">Center</SelectItem>
              <SelectItem value="right">Right</SelectItem>
              <SelectItem value="justify">Justify</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {type === 'TEXT_PARAGRAPH' && (
          <div>
            <Label htmlFor="font-size">Font Size</Label>
            <Select
              value={settings.fontSize || 'medium'}
              onValueChange={(fontSize) => onChange({ fontSize })}
            >
              <SelectTrigger id="font-size">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Small</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="large">Large</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    );
  }

  // Media block settings
  if (type.startsWith('MEDIA_')) {
    return (
      <div className="space-y-4">
        <div>
          <Label htmlFor="media-size">Size</Label>
          <Select
            value={settings.size || 'medium'}
            onValueChange={(size) => onChange({ size })}
          >
            <SelectTrigger id="media-size">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="small">Small</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="large">Large</SelectItem>
              <SelectItem value="full">Full Width</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {(type === 'MEDIA_VIDEO' || type === 'MEDIA_AUDIO') && (
          <>
            <div className="flex items-center justify-between">
              <Label htmlFor="autoplay">Autoplay</Label>
              <Switch
                id="autoplay"
                checked={settings.autoplay || false}
                onCheckedChange={(autoplay) => onChange({ autoplay })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="controls">Show Controls</Label>
              <Switch
                id="controls"
                checked={settings.controls !== false}
                onCheckedChange={(controls) => onChange({ controls })}
              />
            </div>
          </>
        )}
      </div>
    );
  }

  // Quiz/Poll settings
  if (type === 'QUIZ' || type === 'POLL') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="show-feedback">Show Feedback</Label>
          <Switch
            id="show-feedback"
            checked={settings.showFeedback !== false}
            onCheckedChange={(showFeedback) => onChange({ showFeedback })}
          />
        </div>
        {type === 'QUIZ' && (
          <div className="flex items-center justify-between">
            <Label htmlFor="allow-retry">Allow Retry</Label>
            <Switch
              id="allow-retry"
              checked={settings.allowRetry !== false}
              onCheckedChange={(allowRetry) => onChange({ allowRetry })}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
      <SettingsIcon className="mx-auto mb-2 h-8 w-8" />
      <p>No settings available for this block type.</p>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// SPECIALIZED EDITORS
// ════════════════════════════════════════════════════════════════════════════

function ListEditor({ content, onChange }: { content: any; onChange: (updates: any) => void }) {
  const items = content.items || [''];

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="list-type">List Type</Label>
        <Select
          value={content.listType || 'unordered'}
          onValueChange={(listType) => onChange({ listType })}
        >
          <SelectTrigger id="list-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unordered">Bulleted List</SelectItem>
            <SelectItem value="ordered">Numbered List</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>List Items</Label>
        <div className="mt-2 space-y-2">
          {items.map((item: string, index: number) => (
            <div key={index} className="flex gap-2">
              <Input
                value={item}
                onChange={(e) => {
                  const newItems = [...items];
                  newItems[index] = e.target.value;
                  onChange({ items: newItems });
                }}
                placeholder={`Item ${index + 1}`}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const newItems = items.filter((_: any, i: number) => i !== index);
                  onChange({ items: newItems });
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onChange({ items: [...items, ''] });
            }}
          >
            Add Item
          </Button>
        </div>
      </div>
    </div>
  );
}

function ImageEditor({ content, onChange }: { content: any; onChange: (updates: any) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="image-url">Image URL</Label>
        <Input
          id="image-url"
          value={content.url || ''}
          onChange={(e) => onChange({ url: e.target.value })}
          placeholder="https://example.com/image.jpg"
        />
      </div>
      <div>
        <Label htmlFor="image-alt">Alt Text (for accessibility)</Label>
        <Input
          id="image-alt"
          value={content.alt || ''}
          onChange={(e) => onChange({ alt: e.target.value })}
          placeholder="Describe the image..."
        />
      </div>
      <div>
        <Label htmlFor="image-caption">Caption (optional)</Label>
        <Input
          id="image-caption"
          value={content.caption || ''}
          onChange={(e) => onChange({ caption: e.target.value })}
          placeholder="Image caption..."
        />
      </div>
      {content.url && (
        <div className="rounded border p-4">
          <p className="mb-2 text-sm font-medium">Preview:</p>
          <img src={content.url} alt={content.alt || 'Preview'} className="max-h-48 rounded" />
        </div>
      )}
    </div>
  );
}

function VideoEditor({ content, onChange }: { content: any; onChange: (updates: any) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="video-provider">Provider</Label>
        <Select
          value={content.provider || 'youtube'}
          onValueChange={(provider) => onChange({ provider })}
        >
          <SelectTrigger id="video-provider">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="youtube">YouTube</SelectItem>
            <SelectItem value="vimeo">Vimeo</SelectItem>
            <SelectItem value="custom">Custom URL</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="video-url">Video URL</Label>
        <Input
          id="video-url"
          value={content.url || ''}
          onChange={(e) => onChange({ url: e.target.value })}
          placeholder="https://youtube.com/watch?v=..."
        />
      </div>
      <div>
        <Label htmlFor="video-title">Title (optional)</Label>
        <Input
          id="video-title"
          value={content.title || ''}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="Video title..."
        />
      </div>
    </div>
  );
}

function AudioEditor({ content, onChange }: { content: any; onChange: (updates: any) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="audio-url">Audio URL</Label>
        <Input
          id="audio-url"
          value={content.url || ''}
          onChange={(e) => onChange({ url: e.target.value })}
          placeholder="https://example.com/audio.mp3"
        />
      </div>
      <div>
        <Label htmlFor="audio-title">Title (optional)</Label>
        <Input
          id="audio-title"
          value={content.title || ''}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="Audio title..."
        />
      </div>
    </div>
  );
}

function QuizEditor({ content, onChange }: { content: any; onChange: (updates: any) => void }) {
  const options = content.options || ['', '', '', ''];

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="quiz-question">Question</Label>
        <RichTextEditor
          value={content.question || ''}
          onChange={(question) => onChange({ question })}
          placeholder="Enter your question..."
          minHeight={100}
        />
      </div>

      <div>
        <Label htmlFor="quiz-type">Question Type</Label>
        <Select
          value={content.type || 'multiple_choice'}
          onValueChange={(type) => onChange({ type })}
        >
          <SelectTrigger id="quiz-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
            <SelectItem value="true_false">True/False</SelectItem>
            <SelectItem value="short_answer">Short Answer</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {content.type !== 'short_answer' && (
        <>
          <div>
            <Label>Answer Options</Label>
            <div className="mt-2 space-y-2">
              {options.map((option: string, index: number) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={option}
                    onChange={(e) => {
                      const newOptions = [...options];
                      newOptions[index] = e.target.value;
                      onChange({ options: newOptions });
                    }}
                    placeholder={`Option ${String.fromCharCode(65 + index)}`}
                  />
                  <Switch
                    checked={content.correctAnswer === index}
                    onCheckedChange={(checked) => {
                      if (checked) onChange({ correctAnswer: index });
                    }}
                    title="Correct answer"
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="quiz-explanation">Explanation (optional)</Label>
            <RichTextEditor
              value={content.explanation || ''}
              onChange={(explanation) => onChange({ explanation })}
              placeholder="Explain the correct answer..."
              minHeight={80}
            />
          </div>
        </>
      )}
    </div>
  );
}

function PollEditor({ content, onChange }: { content: any; onChange: (updates: any) => void }) {
  const options = content.options || ['', ''];

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="poll-question">Poll Question</Label>
        <Input
          id="poll-question"
          value={content.question || ''}
          onChange={(e) => onChange({ question: e.target.value })}
          placeholder="What do you think?"
        />
      </div>

      <div>
        <Label>Poll Options</Label>
        <div className="mt-2 space-y-2">
          {options.map((option: string, index: number) => (
            <div key={index} className="flex gap-2">
              <Input
                value={option}
                onChange={(e) => {
                  const newOptions = [...options];
                  newOptions[index] = e.target.value;
                  onChange({ options: newOptions });
                }}
                placeholder={`Option ${index + 1}`}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const newOptions = options.filter((_: any, i: number) => i !== index);
                  onChange({ options: newOptions });
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onChange({ options: [...options, ''] });
            }}
          >
            Add Option
          </Button>
        </div>
      </div>
    </div>
  );
}

function FlashcardEditor({ content, onChange }: { content: any; onChange: (updates: any) => void }) {
  const cards = content.cards || [{ front: '', back: '' }];

  return (
    <div className="space-y-4">
      <Label>Flashcards</Label>
      {cards.map((card: any, index: number) => (
        <div key={index} className="rounded border p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium">Card {index + 1}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const newCards = cards.filter((_: any, i: number) => i !== index);
                onChange({ cards: newCards });
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-2">
            <Input
              value={card.front || ''}
              onChange={(e) => {
                const newCards = [...cards];
                newCards[index] = { ...card, front: e.target.value };
                onChange({ cards: newCards });
              }}
              placeholder="Front (term)"
            />
            <Input
              value={card.back || ''}
              onChange={(e) => {
                const newCards = [...cards];
                newCards[index] = { ...card, back: e.target.value };
                onChange({ cards: newCards });
              }}
              placeholder="Back (definition)"
            />
          </div>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          onChange({ cards: [...cards, { front: '', back: '' }] });
        }}
      >
        Add Flashcard
      </Button>
    </div>
  );
}

function WorksheetEditor({ content, onChange }: { content: any; onChange: (updates: any) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="worksheet-title">Worksheet Title</Label>
        <Input
          id="worksheet-title"
          value={content.title || ''}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="Practice Worksheet"
        />
      </div>
      <div>
        <Label htmlFor="worksheet-instructions">Instructions</Label>
        <RichTextEditor
          value={content.instructions || ''}
          onChange={(instructions) => onChange({ instructions })}
          placeholder="Complete the following exercises..."
          minHeight={120}
        />
      </div>
    </div>
  );
}

function AssignmentEditor({ content, onChange }: { content: any; onChange: (updates: any) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="assignment-title">Assignment Title</Label>
        <Input
          id="assignment-title"
          value={content.title || ''}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="Assignment"
        />
      </div>
      <div>
        <Label htmlFor="assignment-instructions">Instructions</Label>
        <RichTextEditor
          value={content.instructions || ''}
          onChange={(instructions) => onChange({ instructions })}
          placeholder="Complete this assignment..."
          minHeight={120}
        />
      </div>
      <div>
        <Label htmlFor="assignment-points">Points Possible</Label>
        <Input
          id="assignment-points"
          type="number"
          value={content.points || 100}
          onChange={(e) => onChange({ points: parseInt(e.target.value) || 0 })}
          min={0}
        />
      </div>
    </div>
  );
}

function DiscussionEditor({ content, onChange }: { content: any; onChange: (updates: any) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="discussion-prompt">Discussion Prompt</Label>
        <RichTextEditor
          value={content.prompt || ''}
          onChange={(prompt) => onChange({ prompt })}
          placeholder="Discuss the following question..."
          minHeight={120}
        />
      </div>
      <div>
        <Label htmlFor="min-words">Minimum Words (0 = no minimum)</Label>
        <Input
          id="min-words"
          type="number"
          value={content.minimumWords || 0}
          onChange={(e) => onChange({ minimumWords: parseInt(e.target.value) || 0 })}
          min={0}
        />
      </div>
    </div>
  );
}

function CalloutEditor({ content, onChange }: { content: any; onChange: (updates: any) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="callout-title">Title (optional)</Label>
        <Input
          id="callout-title"
          value={content.title || ''}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="Important"
        />
      </div>
      <div>
        <Label htmlFor="callout-text">Callout Text</Label>
        <RichTextEditor
          value={content.text || ''}
          onChange={(text) => onChange({ text })}
          placeholder="Important information..."
          minHeight={100}
        />
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════

function getBlockTypeName(type: string): string {
  return type
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}
