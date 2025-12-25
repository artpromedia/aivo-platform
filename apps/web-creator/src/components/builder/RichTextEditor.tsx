/**
 * Rich Text Editor Component
 * Built with TipTap for extensible WYSIWYG editing
 */

import React, { useCallback, useEffect } from 'react';
import { useEditor, EditorContent, Editor, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/components/ui/toggle-group';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Link as LinkIcon,
  Image as ImageIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Highlighter,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Table as TableIcon,
  Minus,
  Plus,
  Trash2,
  Palette,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minimal?: boolean;
  className?: string;
  editable?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Start typing...',
  minimal = false,
  className,
  editable = true,
  onFocus,
  onBlur,
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: minimal ? false : { levels: [1, 2, 3, 4] },
        codeBlock: minimal ? false : undefined,
      }),
      Placeholder.configure({
        placeholder,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline cursor-pointer',
        },
      }),
      ...(minimal ? [] : [
        Image.configure({
          HTMLAttributes: {
            class: 'rounded-lg max-w-full',
          },
        }),
        TextAlign.configure({
          types: ['heading', 'paragraph'],
        }),
        Table.configure({
          resizable: true,
        }),
        TableRow,
        TableHeader,
        TableCell,
      ]),
      Underline,
      Highlight.configure({
        multicolor: true,
      }),
      TextStyle,
      Color,
      Subscript,
      Superscript,
    ],
    content: value,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    onFocus: () => onFocus?.(),
    onBlur: () => onBlur?.(),
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[100px] p-3',
          minimal && 'min-h-[60px]',
          className
        ),
      },
    },
  });

  // Sync external value changes
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, false);
    }
  }, [value, editor]);

  if (!editor) {
    return <div className="h-32 bg-muted animate-pulse rounded-lg" />;
  }

  return (
    <div className="border rounded-lg overflow-hidden bg-background">
      {/* Toolbar */}
      <Toolbar editor={editor} minimal={minimal} />

      {/* Bubble Menu for selections */}
      <BubbleMenu
        editor={editor}
        tippyOptions={{ duration: 100 }}
        className="bg-popover border rounded-lg shadow-lg p-1 flex items-center gap-1"
      >
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          icon={Bold}
          tooltip="Bold"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          icon={Italic}
          tooltip="Italic"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive('underline')}
          icon={UnderlineIcon}
          tooltip="Underline"
        />
        <LinkButton editor={editor} />
      </BubbleMenu>

      {/* Editor Content */}
      <EditorContent editor={editor} />
    </div>
  );
};

// Toolbar Component
interface ToolbarProps {
  editor: Editor;
  minimal?: boolean;
}

const Toolbar: React.FC<ToolbarProps> = ({ editor, minimal }) => {
  return (
    <div className="flex flex-wrap items-center gap-1 p-2 border-b bg-muted/30">
      {/* History */}
      <div className="flex items-center">
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          icon={Undo}
          tooltip="Undo"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          icon={Redo}
          tooltip="Redo"
        />
      </div>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Text Style */}
      {!minimal && (
        <>
          <Select
            value={getHeadingLevel(editor)}
            onValueChange={(value) => {
              if (value === 'paragraph') {
                editor.chain().focus().setParagraph().run();
              } else {
                editor.chain().focus().toggleHeading({ level: parseInt(value) as 1 | 2 | 3 | 4 }).run();
              }
            }}
          >
            <SelectTrigger className="w-32 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="paragraph">Paragraph</SelectItem>
              <SelectItem value="1">Heading 1</SelectItem>
              <SelectItem value="2">Heading 2</SelectItem>
              <SelectItem value="3">Heading 3</SelectItem>
              <SelectItem value="4">Heading 4</SelectItem>
            </SelectContent>
          </Select>

          <Separator orientation="vertical" className="h-6 mx-1" />
        </>
      )}

      {/* Basic Formatting */}
      <div className="flex items-center">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          icon={Bold}
          tooltip="Bold (Ctrl+B)"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          icon={Italic}
          tooltip="Italic (Ctrl+I)"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive('underline')}
          icon={UnderlineIcon}
          tooltip="Underline (Ctrl+U)"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive('strike')}
          icon={Strikethrough}
          tooltip="Strikethrough"
        />
        {!minimal && (
          <>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleCode().run()}
              active={editor.isActive('code')}
              icon={Code}
              tooltip="Inline Code"
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleSubscript().run()}
              active={editor.isActive('subscript')}
              icon={SubscriptIcon}
              tooltip="Subscript"
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleSuperscript().run()}
              active={editor.isActive('superscript')}
              icon={SuperscriptIcon}
              tooltip="Superscript"
            />
          </>
        )}
      </div>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Colors */}
      <ColorPicker editor={editor} />
      <HighlightPicker editor={editor} />

      {!minimal && (
        <>
          <Separator orientation="vertical" className="h-6 mx-1" />

          {/* Alignment */}
          <ToggleGroup type="single" size="sm" value={getTextAlign(editor)}>
            <ToggleGroupItem
              value="left"
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
            >
              <AlignLeft className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem
              value="center"
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
            >
              <AlignCenter className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem
              value="right"
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
            >
              <AlignRight className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem
              value="justify"
              onClick={() => editor.chain().focus().setTextAlign('justify').run()}
            >
              <AlignJustify className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>

          <Separator orientation="vertical" className="h-6 mx-1" />
        </>
      )}

      {/* Lists */}
      <div className="flex items-center">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          icon={List}
          tooltip="Bullet List"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          icon={ListOrdered}
          tooltip="Numbered List"
        />
        {!minimal && (
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            active={editor.isActive('blockquote')}
            icon={Quote}
            tooltip="Blockquote"
          />
        )}
      </div>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Insert */}
      <div className="flex items-center">
        <LinkButton editor={editor} />
        {!minimal && (
          <>
            <ImageButton editor={editor} />
            <TableButton editor={editor} />
          </>
        )}
      </div>
    </div>
  );
};

// Toolbar Button
interface ToolbarButtonProps {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  icon: React.ComponentType<{ className?: string }>;
  tooltip: string;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({
  onClick,
  active,
  disabled,
  icon: Icon,
  tooltip,
}) => (
  <Button
    type="button"
    variant="ghost"
    size="sm"
    onClick={onClick}
    disabled={disabled}
    className={cn(
      'h-8 w-8 p-0',
      active && 'bg-muted'
    )}
    title={tooltip}
  >
    <Icon className="h-4 w-4" />
  </Button>
);

// Link Button with Popover
const LinkButton: React.FC<{ editor: Editor }> = ({ editor }) => {
  const [url, setUrl] = React.useState('');
  const [open, setOpen] = React.useState(false);

  const setLink = useCallback(() => {
    if (url) {
      editor
        .chain()
        .focus()
        .extendMarkRange('link')
        .setLink({ href: url })
        .run();
    } else {
      editor.chain().focus().unsetLink().run();
    }
    setOpen(false);
    setUrl('');
  }, [editor, url]);

  const handleOpen = () => {
    const previousUrl = editor.getAttributes('link').href || '';
    setUrl(previousUrl);
    setOpen(true);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleOpen}
          className={cn(
            'h-8 w-8 p-0',
            editor.isActive('link') && 'bg-muted'
          )}
          title="Insert Link"
        >
          <LinkIcon className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-3">
          <div>
            <Label htmlFor="link-url">URL</Label>
            <Input
              id="link-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  setLink();
                }
              }}
            />
          </div>
          <div className="flex justify-between">
            {editor.isActive('link') && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  editor.chain().focus().unsetLink().run();
                  setOpen(false);
                }}
              >
                Remove Link
              </Button>
            )}
            <Button size="sm" onClick={setLink} className="ml-auto">
              {editor.isActive('link') ? 'Update' : 'Add'} Link
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

// Image Button
const ImageButton: React.FC<{ editor: Editor }> = ({ editor }) => {
  const [url, setUrl] = React.useState('');
  const [open, setOpen] = React.useState(false);

  const addImage = useCallback(() => {
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
    setOpen(false);
    setUrl('');
  }, [editor, url]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title="Insert Image"
        >
          <ImageIcon className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-3">
          <div>
            <Label htmlFor="image-url">Image URL</Label>
            <Input
              id="image-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addImage();
                }
              }}
            />
          </div>
          <Button size="sm" onClick={addImage} className="w-full">
            Insert Image
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

// Table Button
const TableButton: React.FC<{ editor: Editor }> = ({ editor }) => {
  const [open, setOpen] = React.useState(false);

  const insertTable = useCallback((rows: number, cols: number) => {
    editor
      .chain()
      .focus()
      .insertTable({ rows, cols, withHeaderRow: true })
      .run();
    setOpen(false);
  }, [editor]);

  const isInTable = editor.isActive('table');

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            'h-8 w-8 p-0',
            isInTable && 'bg-muted'
          )}
          title="Insert Table"
        >
          <TableIcon className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48">
        {isInTable ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">Table Actions</p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => editor.chain().focus().addColumnBefore().run()}
              >
                <Plus className="h-3 w-3 mr-1" /> Col Before
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => editor.chain().focus().addColumnAfter().run()}
              >
                <Plus className="h-3 w-3 mr-1" /> Col After
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => editor.chain().focus().addRowBefore().run()}
              >
                <Plus className="h-3 w-3 mr-1" /> Row Before
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => editor.chain().focus().addRowAfter().run()}
              >
                <Plus className="h-3 w-3 mr-1" /> Row After
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => editor.chain().focus().deleteColumn().run()}
              >
                <Minus className="h-3 w-3 mr-1" /> Del Col
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => editor.chain().focus().deleteRow().run()}
              >
                <Minus className="h-3 w-3 mr-1" /> Del Row
              </Button>
            </div>
            <Button
              size="sm"
              variant="destructive"
              className="w-full"
              onClick={() => editor.chain().focus().deleteTable().run()}
            >
              <Trash2 className="h-3 w-3 mr-1" /> Delete Table
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-medium">Insert Table</p>
            <div className="grid grid-cols-4 gap-1">
              {[2, 3, 4, 5].map((rows) =>
                [2, 3, 4, 5].map((cols) => (
                  <button
                    key={`${rows}-${cols}`}
                    className="w-6 h-6 border rounded hover:bg-primary hover:text-primary-foreground text-xs"
                    onClick={() => insertTable(rows, cols)}
                    title={`${rows}×${cols} table`}
                  >
                    {rows}×{cols}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

// Color Picker
const ColorPicker: React.FC<{ editor: Editor }> = ({ editor }) => {
  const colors = [
    '#000000', '#374151', '#6b7280', '#9ca3af',
    '#ef4444', '#f97316', '#eab308', '#22c55e',
    '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title="Text Color"
        >
          <Palette className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-40">
        <div className="grid grid-cols-4 gap-1">
          {colors.map((color) => (
            <button
              key={color}
              className="w-8 h-8 rounded border hover:scale-110 transition-transform"
              style={{ backgroundColor: color }}
              onClick={() => editor.chain().focus().setColor(color).run()}
            />
          ))}
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="w-full mt-2"
          onClick={() => editor.chain().focus().unsetColor().run()}
        >
          Reset Color
        </Button>
      </PopoverContent>
    </Popover>
  );
};

// Highlight Picker
const HighlightPicker: React.FC<{ editor: Editor }> = ({ editor }) => {
  const colors = [
    '#fef08a', '#bbf7d0', '#a5f3fc', '#c4b5fd',
    '#fbcfe8', '#fed7aa', '#fecaca', '#e5e7eb',
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            'h-8 w-8 p-0',
            editor.isActive('highlight') && 'bg-muted'
          )}
          title="Highlight"
        >
          <Highlighter className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-40">
        <div className="grid grid-cols-4 gap-1">
          {colors.map((color) => (
            <button
              key={color}
              className="w-8 h-8 rounded border hover:scale-110 transition-transform"
              style={{ backgroundColor: color }}
              onClick={() => editor.chain().focus().setHighlight({ color }).run()}
            />
          ))}
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="w-full mt-2"
          onClick={() => editor.chain().focus().unsetHighlight().run()}
        >
          Remove Highlight
        </Button>
      </PopoverContent>
    </Popover>
  );
};

// Helper functions
function getHeadingLevel(editor: Editor): string {
  for (let level = 1; level <= 4; level++) {
    if (editor.isActive('heading', { level })) {
      return String(level);
    }
  }
  return 'paragraph';
}

function getTextAlign(editor: Editor): string {
  if (editor.isActive({ textAlign: 'center' })) return 'center';
  if (editor.isActive({ textAlign: 'right' })) return 'right';
  if (editor.isActive({ textAlign: 'justify' })) return 'justify';
  return 'left';
}
