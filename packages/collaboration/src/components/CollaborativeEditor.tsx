/**
 * CollaborativeEditor Component
 *
 * Rich text collaborative editor using Tiptap + Y.js:
 * - Real-time collaboration via CRDT
 * - Live cursors with user colors
 * - Rich text formatting
 * - Undo/redo support
 * - Comments on selection
 * - Offline support with sync
 */

'use client';

/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return */

import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import { EditorContent, useEditor } from '@tiptap/react';
import type { Editor, JSONContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import React, { useCallback, useState } from 'react';
import type { CSSProperties } from 'react';
import type * as Y from 'yjs';

import type { CursorData, RoomUser } from '../types';

import { CollaboratorAvatars } from './CollaboratorAvatars';

// Icons for toolbar
const icons = {
  bold: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <path d="M8 11h4.5a2.5 2.5 0 1 0 0-5H8v5Zm10 4.5a4.5 4.5 0 0 1-4.5 4.5H6V4h6.5a4.5 4.5 0 0 1 3.256 7.606A4.5 4.5 0 0 1 18 15.5ZM8 13v5h5.5a2.5 2.5 0 1 0 0-5H8Z" />
    </svg>
  ),
  italic: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <path d="M15 20H7v-2h2.927l2.116-12H9V4h8v2h-2.927l-2.116 12H15z" />
    </svg>
  ),
  underline: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <path d="M8 3v9a4 4 0 1 0 8 0V3h2v9a6 6 0 1 1-12 0V3h2ZM4 20h16v2H4v-2Z" />
    </svg>
  ),
  strikethrough: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <path d="M17.154 14c.23.516.346 1.09.346 1.72 0 1.342-.524 2.392-1.571 3.147C14.88 19.622 13.433 20 11.586 20c-1.64 0-3.263-.381-4.87-1.144V16.6c1.52.877 3.075 1.316 4.666 1.316 2.551 0 3.83-.732 3.839-2.197a2.21 2.21 0 0 0-.648-1.603l-.12-.117H3v-2h18v2h-3.846ZM7.556 11H5.6a5.56 5.56 0 0 1-.303-1.785c0-1.324.529-2.379 1.587-3.166C7.943 5.35 9.397 4.956 11.243 4.956c1.534 0 3.085.356 4.652 1.07l-.744 1.82c-1.363-.598-2.671-.897-3.926-.897-2.464 0-3.698.738-3.702 2.213 0 .476.072.893.216 1.25l.003.007.01.025.056.125.047.104.05.108.061.129.066.13.073.139.078.143.167.293.188.306z" />
    </svg>
  ),
  heading1: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <path d="M13 20h-2v-7H4v7H2V4h2v7h7V4h2v16zm8-12v12h-2v-9.796l-2 .536V8.67L19.5 8H21z" />
    </svg>
  ),
  heading2: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <path d="M4 4v7h7V4h2v16h-2v-7H4v7H2V4h2zm14.5 4c2.071 0 3.75 1.679 3.75 3.75 0 .857-.288 1.648-.772 2.28l-.148.18L18.034 18H22v2h-7v-1.556l4.82-5.546c.268-.307.43-.709.43-1.148 0-.966-.784-1.75-1.75-1.75-.918 0-1.671.707-1.744 1.606l-.006.144h-2C14.75 9.679 16.429 8 18.5 8z" />
    </svg>
  ),
  bulletList: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <path d="M8 4h13v2H8V4ZM4.5 6.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm0 7a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm0 6.9a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3ZM8 11h13v2H8v-2Zm0 7h13v2H8v-2Z" />
    </svg>
  ),
  orderedList: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <path d="M8 4h13v2H8V4ZM5 3v3h1v1H3V6h1V4H3V3h2Zm-2 7h3.5v1H4v1h1.5v1H3v-4h2Zm0 5h1v2H3v-1h1.5v-.5H3v-1h2v2h1v1H3v-2.5ZM8 11h13v2H8v-2Zm0 7h13v2H8v-2Z" />
    </svg>
  ),
  taskList: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <path d="M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm1 2v14h14V5H5zm6.003 11L6.76 11.757l1.414-1.414 2.829 2.829 5.656-5.657 1.415 1.414L11.003 16z" />
    </svg>
  ),
  quote: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 0 1-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 0 1-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179z" />
    </svg>
  ),
  code: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <path d="M24 12l-5.657 5.657-1.414-1.414L21.172 12l-4.243-4.243 1.414-1.414L24 12zM2.828 12l4.243 4.243-1.414 1.414L0 12l5.657-5.657L7.07 7.757 2.828 12zm6.96 9H7.66l6.552-18h2.128L9.788 21z" />
    </svg>
  ),
  link: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <path d="M18.364 15.536 16.95 14.12l1.414-1.414a5 5 0 1 0-7.071-7.071L9.879 7.05 8.464 5.636 9.88 4.222a7 7 0 0 1 9.9 9.9l-1.415 1.414zm-2.828 2.828-1.415 1.414a7 7 0 0 1-9.9-9.9l1.415-1.414L7.05 9.88l-1.414 1.414a5 5 0 1 0 7.071 7.071l1.414-1.414 1.415 1.414zm-.708-10.607 1.415 1.415-7.071 7.07-1.415-1.414 7.071-7.07z" />
    </svg>
  ),
  image: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <path d="M4.828 21l-.02.02-.021-.02H2.992A.993.993 0 0 1 2 20.007V3.993A1 1 0 0 1 2.992 3h18.016c.548 0 .992.445.992.993v16.014a1 1 0 0 1-.992.993H4.828zM20 15V5H4v14L14 9l6 6zm0 2.828l-6-6L6.828 19H20v-1.172zM8 11a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" />
    </svg>
  ),
  undo: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <path d="M5.828 7l2.536 2.536L6.95 10.95 2 6l4.95-4.95 1.414 1.414L5.828 5H13a8 8 0 1 1 0 16H4v-2h9a6 6 0 1 0 0-12H5.828z" />
    </svg>
  ),
  redo: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <path d="M18.172 7H11a6 6 0 1 0 0 12h9v2h-9a8 8 0 1 1 0-16h7.172l-2.536-2.536L17.05 1.05 22 6l-4.95 4.95-1.414-1.414L18.172 7z" />
    </svg>
  ),
  alignLeft: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <path d="M3 4h18v2H3V4zm0 15h14v2H3v-2zm0-5h18v2H3v-2zm0-5h14v2H3V9z" />
    </svg>
  ),
  alignCenter: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <path d="M3 4h18v2H3V4zm2 15h14v2H5v-2zm-2-5h18v2H3v-2zm2-5h14v2H5V9z" />
    </svg>
  ),
  alignRight: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <path d="M3 4h18v2H3V4zm4 15h14v2H7v-2zm-4-5h18v2H3v-2zm4-5h14v2H7V9z" />
    </svg>
  ),
  highlight: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <path d="M15.243 4.515l-6.738 6.737-.707 2.121-1.04 1.041 2.828 2.829 1.04-1.041 2.122-.707 6.737-6.738-4.242-4.242zm6.364 3.536a1 1 0 0 1 0 1.414l-7.778 7.778-2.122.707-1.414 1.414a1 1 0 0 1-1.414 0l-4.243-4.243a1 1 0 0 1 0-1.414l1.414-1.414.707-2.121 7.778-7.778a1 1 0 0 1 1.414 0l5.657 5.657zm-6.364-.707l1.414 1.414-4.95 4.95-1.414-1.414 4.95-4.95zM4.283 16.89l2.828 2.829-1.414 1.414-4.243-1.414 2.828-2.829z" />
    </svg>
  ),
};

interface CollaborativeEditorProps {
  documentId: string;
  roomId: string;
  currentUserId: string;
  currentUserName: string;
  currentUserColor?: string;
  ydoc: Y.Doc;
  users?: RoomUser[];
  cursors?: Map<string, CursorData>;
  placeholder?: string;
  readOnly?: boolean;
  autofocus?: boolean;
  onUpdate?: (content: JSONContent) => void;
  onSelectionChange?: (selection: { from: number; to: number } | null) => void;
  className?: string;
  style?: CSSProperties;
}

interface ToolbarButtonProps {
  icon: React.ReactNode;
  title: string;
  isActive?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({
  icon,
  title,
  isActive = false,
  disabled = false,
  onClick,
}) => {
  const buttonStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    border: 'none',
    borderRadius: 4,
    backgroundColor: isActive ? '#E5E7EB' : 'transparent',
    color: disabled ? '#D1D5DB' : '#374151',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'background-color 0.15s',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={buttonStyle}
      onMouseEnter={(e) => {
        if (!disabled && !isActive) {
          e.currentTarget.style.backgroundColor = '#F3F4F6';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && !isActive) {
          e.currentTarget.style.backgroundColor = 'transparent';
        }
      }}
    >
      {icon}
    </button>
  );
};

const ToolbarDivider: React.FC = () => (
  <div
    style={{
      width: 1,
      height: 24,
      backgroundColor: '#E5E7EB',
      margin: '0 8px',
    }}
  />
);

interface EditorToolbarProps {
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  editor: Editor | null;
}

const EditorToolbar: React.FC<EditorToolbarProps> = ({ editor }) => {
  const addLink = useCallback(() => {
    if (!editor) return;
    const url = globalThis.prompt('Enter URL');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  }, [editor]);

  const addImage = useCallback(() => {
    if (!editor) return;
    const url = globalThis.prompt('Enter image URL');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  if (!editor) return null;

  const toolbarStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 12px',
    borderBottom: '1px solid #E5E7EB',
    backgroundColor: '#FAFAFA',
    flexWrap: 'wrap',
    gap: 4,
  };

  return (
    <div style={toolbarStyle}>
      {/* History */}
      <ToolbarButton
        icon={icons.undo}
        title="Undo (Ctrl+Z)"
        disabled={!editor.can().undo()}
        onClick={() => editor.chain().focus().undo().run()}
      />
      <ToolbarButton
        icon={icons.redo}
        title="Redo (Ctrl+Y)"
        disabled={!editor.can().redo()}
        onClick={() => editor.chain().focus().redo().run()}
      />

      <ToolbarDivider />

      {/* Text formatting */}
      <ToolbarButton
        icon={icons.bold}
        title="Bold (Ctrl+B)"
        isActive={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
      />
      <ToolbarButton
        icon={icons.italic}
        title="Italic (Ctrl+I)"
        isActive={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      />
      <ToolbarButton
        icon={icons.underline}
        title="Underline (Ctrl+U)"
        isActive={editor.isActive('underline')}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      />
      <ToolbarButton
        icon={icons.strikethrough}
        title="Strikethrough"
        isActive={editor.isActive('strike')}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      />
      <ToolbarButton
        icon={icons.highlight}
        title="Highlight"
        isActive={editor.isActive('highlight')}
        onClick={() => editor.chain().focus().toggleHighlight().run()}
      />

      <ToolbarDivider />

      {/* Headings */}
      <ToolbarButton
        icon={icons.heading1}
        title="Heading 1"
        isActive={editor.isActive('heading', { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      />
      <ToolbarButton
        icon={icons.heading2}
        title="Heading 2"
        isActive={editor.isActive('heading', { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      />

      <ToolbarDivider />

      {/* Lists */}
      <ToolbarButton
        icon={icons.bulletList}
        title="Bullet List"
        isActive={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      />
      <ToolbarButton
        icon={icons.orderedList}
        title="Numbered List"
        isActive={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      />
      <ToolbarButton
        icon={icons.taskList}
        title="Task List"
        isActive={editor.isActive('taskList')}
        onClick={() => editor.chain().focus().toggleTaskList().run()}
      />

      <ToolbarDivider />

      {/* Alignment */}
      <ToolbarButton
        icon={icons.alignLeft}
        title="Align Left"
        isActive={editor.isActive({ textAlign: 'left' })}
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
      />
      <ToolbarButton
        icon={icons.alignCenter}
        title="Align Center"
        isActive={editor.isActive({ textAlign: 'center' })}
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
      />
      <ToolbarButton
        icon={icons.alignRight}
        title="Align Right"
        isActive={editor.isActive({ textAlign: 'right' })}
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
      />

      <ToolbarDivider />

      {/* Blocks */}
      <ToolbarButton
        icon={icons.quote}
        title="Quote"
        isActive={editor.isActive('blockquote')}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      />
      <ToolbarButton
        icon={icons.code}
        title="Code Block"
        isActive={editor.isActive('codeBlock')}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
      />

      <ToolbarDivider />

      {/* Media */}
      <ToolbarButton
        icon={icons.link}
        title="Add Link"
        isActive={editor.isActive('link')}
        onClick={addLink}
      />
      <ToolbarButton icon={icons.image} title="Add Image" onClick={addImage} />
    </div>
  );
};

export const CollaborativeEditor: React.FC<CollaborativeEditorProps> = ({
  documentId: _documentId,
  roomId: _roomId,
  currentUserId,
  currentUserName,
  currentUserColor = '#3B82F6',
  ydoc,
  users = [],
  cursors: _cursors,
  placeholder = 'Start typing...',
  readOnly = false,
  autofocus = false,
  onUpdate,
  onSelectionChange,
  className,
  style,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  // Create editor with collaborative extensions
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        history: false, // Disable default history, use Y.js undo manager
      }),
      Placeholder.configure({
        placeholder,
      }),
      Highlight.configure({
        multicolor: true,
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Link.configure({
        openOnClick: false,
      }),
      Image,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Underline,
      Collaboration.configure({
        document: ydoc,
      }),
      CollaborationCursor.configure({
        provider: null, // We handle cursors separately
        user: {
          name: currentUserName,
          color: currentUserColor,
        },
      }),
    ],
    editable: !readOnly,
    autofocus,
    onUpdate: ({ editor }) => {
      onUpdate?.(editor.getJSON());
    },
    onSelectionUpdate: ({ editor }) => {
      const { from, to } = editor.state.selection;
      onSelectionChange?.(from === to ? null : { from, to });
    },
    onFocus: () => {
      setIsFocused(true);
    },
    onBlur: () => {
      setIsFocused(false);
    },
  });

  // Container styles
  const containerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    border: `1px solid ${isFocused ? '#3B82F6' : '#E5E7EB'}`,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'white',
    transition: 'border-color 0.15s',
    ...style,
  };

  const headerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    borderBottom: '1px solid #E5E7EB',
    backgroundColor: '#FAFAFA',
  };

  const editorContentStyle: CSSProperties = {
    flex: 1,
    overflow: 'auto',
    padding: '16px 20px',
    minHeight: 300,
  };

  const footerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    borderTop: '1px solid #E5E7EB',
    backgroundColor: '#FAFAFA',
    fontSize: 12,
    color: '#6B7280',
  };

  return (
    <div style={containerStyle} className={className}>
      {/* Header with collaborators */}
      <div style={headerStyle}>
        <span style={{ fontWeight: 500, fontSize: 14 }}>Document</span>
        <CollaboratorAvatars users={users} currentUserId={currentUserId} size="sm" maxVisible={5} />
      </div>

      {/* Toolbar */}
      {!readOnly && <EditorToolbar editor={editor} />}

      {/* Editor Content */}
      <div style={editorContentStyle}>
        <EditorContent
          editor={editor}
          style={{
            minHeight: '100%',
          }}
        />
      </div>

      {/* Footer */}
      <div style={footerStyle}>
        <span>
          {users.length} collaborator{users.length === 1 ? '' : 's'} viewing
        </span>
        <span>{readOnly ? 'Read only' : 'Editing'}</span>
      </div>
    </div>
  );
};

// Export the editor for use outside of React
export function createCollaborativeEditor(
  element: HTMLElement,
  options: {
    ydoc: Y.Doc;
    userName: string;
    userColor: string;
    placeholder?: string;
    readOnly?: boolean;
  }
): Editor {
  const { ydoc, userName, userColor, placeholder, readOnly } = options;

  return new Editor({
    element,
    extensions: [
      StarterKit.configure({ history: false }),
      Placeholder.configure({ placeholder }),
      Highlight,
      TaskList,
      TaskItem.configure({ nested: true }),
      Link.configure({ openOnClick: false }),
      Image,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Underline,
      Collaboration.configure({ document: ydoc }),
      CollaborationCursor.configure({
        provider: null,
        user: { name: userName, color: userColor },
      }),
    ],
    editable: !readOnly,
  });
}

export default CollaborativeEditor;
