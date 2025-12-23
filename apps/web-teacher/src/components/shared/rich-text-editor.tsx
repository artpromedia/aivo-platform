/* eslint-disable @typescript-eslint/no-deprecated */
/**
 * Rich Text Editor Component
 *
 * Simple rich text editor with basic formatting
 * (In production, would use a library like TipTap, Quill, or Slate)
 */

'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
  maxHeight?: number;
  disabled?: boolean;
  className?: string;
  error?: string;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Enter text...',
  minHeight = 120,
  maxHeight = 400,
  disabled = false,
  className,
  error,
}: RichTextEditorProps) {
  const editorRef = React.useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = React.useState(false);

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    updateValue();
  };

  const updateValue = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  // Initialize content
  React.useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const toolbarButtons = [
    { icon: 'B', command: 'bold', title: 'Bold' },
    { icon: 'I', command: 'italic', title: 'Italic' },
    { icon: 'U', command: 'underline', title: 'Underline' },
    { icon: '—', command: 'strikeThrough', title: 'Strikethrough' },
    { divider: true },
    { icon: '•', command: 'insertUnorderedList', title: 'Bullet List' },
    { icon: '1.', command: 'insertOrderedList', title: 'Numbered List' },
    { divider: true },
    { icon: '←', command: 'outdent', title: 'Decrease Indent' },
    { icon: '→', command: 'indent', title: 'Increase Indent' },
    { divider: true },
    { icon: '🔗', command: 'createLink', title: 'Insert Link', promptValue: true },
    { icon: '⊘', command: 'removeFormat', title: 'Clear Formatting' },
  ];

  return (
    <div
      className={cn('rounded-lg border', error ? 'border-red-500' : 'border-gray-300', className)}
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b bg-gray-50 p-1">
        {toolbarButtons.map((btn, index) => {
          if ('divider' in btn) {
            return <div key={index} className="mx-1 h-5 w-px bg-gray-300" />;
          }
          return (
            <button
              key={btn.command}
              type="button"
              title={btn.title}
              disabled={disabled}
              onClick={() => {
                if (btn.promptValue) {
                  const url = prompt('Enter URL:');
                  if (url) execCommand(btn.command, url);
                } else {
                  execCommand(btn.command);
                }
              }}
              className="rounded px-2 py-1 text-sm hover:bg-gray-200 disabled:opacity-50"
            >
              {btn.icon}
            </button>
          );
        })}
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable={!disabled}
        onInput={updateValue}
        onFocus={() => {
          setIsFocused(true);
        }}
        onBlur={() => {
          setIsFocused(false);
        }}
        data-placeholder={placeholder}
        className={cn(
          'prose prose-sm max-w-none overflow-auto p-3 focus:outline-none',
          disabled && 'cursor-not-allowed bg-gray-100 opacity-60',
          '[&:empty]:before:content-[attr(data-placeholder)] [&:empty]:before:text-gray-400',
          isFocused && 'ring-2 ring-primary-500/20'
        )}
        style={{
          minHeight: `${minHeight}px`,
          maxHeight: `${maxHeight}px`,
        }}
      />

      {error && <p className="border-t bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}

/**
 * Simple textarea alternative for when rich text isn't needed
 */
interface TextAreaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  disabled?: boolean;
  className?: string;
  error?: string;
}

export function TextArea({
  value,
  onChange,
  placeholder,
  rows = 4,
  maxLength,
  disabled = false,
  className,
  error,
}: TextAreaProps) {
  return (
    <div className={className}>
      <textarea
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        disabled={disabled}
        className={cn(
          'w-full resize-y rounded-lg border px-4 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20',
          disabled && 'cursor-not-allowed bg-gray-100 opacity-60',
          error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
        )}
      />
      {maxLength && (
        <p className="mt-1 text-right text-xs text-gray-500">
          {value.length}/{maxLength}
        </p>
      )}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
