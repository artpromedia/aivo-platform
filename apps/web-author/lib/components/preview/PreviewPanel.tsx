/**
 * PreviewPanel Component
 *
 * Live preview panel showing how content will appear to learners.
 * Supports different device viewports and accessibility modes.
 */

'use client';

import {
  Eye,
  Monitor,
  Moon,
  RotateCcw,
  Smartphone,
  Sun,
  Tablet,
  Type,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import Image from 'next/image';
import React, { useState, useMemo, useRef } from 'react';

import type { ContentBlock } from '../../api/content';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface PreviewPanelProps {
  readonly blocks: ContentBlock[];
  readonly title?: string;
  readonly onClose?: () => void;
  readonly isModal?: boolean;
}

type ViewportSize = 'desktop' | 'tablet' | 'mobile';
type ThemeMode = 'light' | 'dark';

interface ViewportConfig {
  width: number;
  label: string;
  icon: React.ElementType;
}

// ══════════════════════════════════════════════════════════════════════════════
// VIEWPORT CONFIGS
// ══════════════════════════════════════════════════════════════════════════════

const VIEWPORT_CONFIGS: Record<ViewportSize, ViewportConfig> = {
  desktop: { width: 1280, label: 'Desktop', icon: Monitor },
  tablet: { width: 768, label: 'Tablet', icon: Tablet },
  mobile: { width: 375, label: 'Mobile', icon: Smartphone },
};

// ══════════════════════════════════════════════════════════════════════════════
// BLOCK RENDERER
// ══════════════════════════════════════════════════════════════════════════════

function renderPreviewBlock(block: ContentBlock, _index: number): React.ReactNode {
  switch (block.type) {
    case 'heading': {
      const level = (block.content.level as number) || 1;
      const HeadingTag = `h${level}` as keyof React.JSX.IntrinsicElements;
      const headingSizes = {
        1: 'text-3xl font-bold mb-4',
        2: 'text-2xl font-semibold mb-3',
        3: 'text-xl font-semibold mb-3',
        4: 'text-lg font-medium mb-2',
        5: 'text-base font-medium mb-2',
        6: 'text-sm font-medium mb-2',
      };
      return (
        <HeadingTag
          key={block.id}
          className={headingSizes[level as keyof typeof headingSizes] || headingSizes[1]}
          dangerouslySetInnerHTML={{ __html: (block.content.content as string) || '' }}
        />
      );
    }

    case 'paragraph':
      return (
        <p
          key={block.id}
          className="text-base leading-relaxed mb-4"
          dangerouslySetInnerHTML={{ __html: (block.content.content as string) || '' }}
        />
      );

    case 'image':
      return (
        <figure key={block.id} className="mb-6">
          {block.content.url ? (
            <Image
              src={block.content.url as string}
              alt={(block.content.alt as string) || ''}
              width={800}
              height={600}
              className="max-w-full h-auto rounded-lg shadow-md"
            />
          ) : (
            <div className="bg-gray-200 rounded-lg h-48 flex items-center justify-center text-gray-500">
              Image placeholder
            </div>
          )}
          {block.content.caption ? (
            <figcaption className="text-sm text-gray-600 text-center mt-2">
              {block.content.caption as string}
            </figcaption>
          ) : null}
        </figure>
      );

    case 'video':
      return (
        <div key={block.id} className="mb-6 aspect-video bg-gray-900 rounded-lg overflow-hidden">
          {block.content.url ? (
            <video
              src={block.content.url as string}
              controls
              className="w-full h-full"
              poster={block.content.thumbnail as string | undefined}
            >
              <track kind="captions" />
            </video>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-500">
              Video placeholder
            </div>
          )}
        </div>
      );

    case 'code':
      return (
        <div key={block.id} className="mb-6 bg-gray-900 text-gray-100 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-gray-800 text-sm">
            <span className="text-gray-400">{(block.content.language as string) || 'code'}</span>
          </div>
          <pre className="p-4 overflow-x-auto">
            <code className="font-mono text-sm">{(block.content.content as string) || ''}</code>
          </pre>
        </div>
      );

    case 'list': {
      const isOrdered = block.content.ordered as boolean;
      const ListTag = isOrdered ? 'ol' : 'ul';
      const items = (block.content.items as string[] | undefined) || [];
      return (
        <ListTag
          key={block.id}
          className={`${isOrdered ? 'list-decimal' : 'list-disc'} pl-6 mb-4 space-y-1`}
        >
          {items.map((item) => (
            <li key={item}>{item}</li>
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
      return (
        <div
          key={block.id}
          className={`border-l-4 p-4 rounded-r-lg mb-6 ${variantStyles[variant as keyof typeof variantStyles] || variantStyles.info}`}
        >
          <p dangerouslySetInnerHTML={{ __html: (block.content.content as string) || '' }} />
          {block.content.citation ? (
            <cite className="block mt-2 text-sm text-gray-500 not-italic">
              — {block.content.citation as string}
            </cite>
          ) : null}
        </div>
      );
    }

    case 'divider':
      return <hr key={block.id} className="border-gray-300 my-8" />;

    case 'quiz':
      return (
        <div key={block.id} className="bg-purple-50 border-2 border-purple-200 rounded-lg p-6 mb-6">
          <div className="flex items-center gap-2 text-purple-700 mb-4">
            <Eye className="w-5 h-5" />
            <span className="font-semibold">Check Your Understanding</span>
          </div>
          <p
            className="text-lg mb-4"
            dangerouslySetInnerHTML={{ __html: (block.content.question as string) || 'Question' }}
          />
          <div className="space-y-2">
            {((block.content.options as string[] | undefined) || []).map((option) => (
              <label
                key={option}
                className="flex items-center gap-3 p-3 bg-white rounded-lg border border-purple-200 cursor-pointer hover:border-purple-400 transition-colors"
              >
                <input type="radio" name={`quiz-${block.id}`} className="text-purple-600" />
                <span>{option}</span>
              </label>
            ))}
          </div>
          <button className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
            Check Answer
          </button>
        </div>
      );

    case 'table': {
      const rows = (block.content.rows as string[][] | undefined) || [];
      return (
        <div key={block.id} className="overflow-x-auto mb-6">
          <table className="min-w-full border-collapse">
            <tbody>
              {rows.map((row, rowIdx) => (
                <tr
                  key={`row-${block.id}-${String(rowIdx)}`}
                  className={rowIdx === 0 ? 'bg-gray-100 font-semibold' : ''}
                >
                  {row.map((cell, cellIdx) => (
                    <td
                      key={`cell-${block.id}-${String(rowIdx)}-${String(cellIdx)}`}
                      className="border border-gray-300 px-4 py-2"
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

    case 'embed':
      return (
        <div key={block.id} className="mb-6 aspect-video bg-gray-100 rounded-lg overflow-hidden">
          {block.content.url ? (
            <iframe
              src={block.content.url as string}
              title={`Embedded content: ${block.id}`}
              className="w-full h-full"
              allowFullScreen
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-500">
              Embed placeholder
            </div>
          )}
        </div>
      );

    default:
      return (
        <div key={block.id} className="p-4 bg-gray-100 rounded-lg mb-4 text-gray-500">
          Unknown block type: {block.type}
        </div>
      );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export function PreviewPanel({ blocks, title, onClose, isModal = false }: PreviewPanelProps) {
  const [viewport, setViewport] = useState<ViewportSize>('desktop');
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [zoom, setZoom] = useState(100);
  const [fontSize, setFontSize] = useState(16);
  const previewRef = useRef<HTMLDivElement>(null);

  // Calculate preview container styles
  const previewStyles = useMemo(() => {
    const config = VIEWPORT_CONFIGS[viewport];
    return {
      width: `${config.width}px`,
      transform: `scale(${zoom / 100})`,
      transformOrigin: 'top center',
      fontSize: `${fontSize}px`,
    };
  }, [viewport, zoom, fontSize]);

  // Reset all settings
  const handleReset = () => {
    setViewport('desktop');
    setTheme('light');
    setZoom(100);
    setFontSize(16);
  };

  // Container classes based on modal state
  const containerClasses = isModal
    ? 'fixed inset-0 bg-black/50 flex items-center justify-center z-50'
    : 'h-full flex flex-col';

  const panelClasses = isModal
    ? 'bg-white rounded-xl shadow-2xl w-[90vw] h-[90vh] flex flex-col overflow-hidden'
    : 'flex-1 flex flex-col bg-gray-50';

  return (
    <div className={containerClasses}>
      <div className={panelClasses}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-4">
            <h3 className="font-semibold text-gray-900">
              {title ? `Preview: ${title}` : 'Content Preview'}
            </h3>
          </div>

          {/* Viewport switcher */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {Object.entries(VIEWPORT_CONFIGS).map(([key, config]) => {
              const Icon = config.icon;
              return (
                <button
                  key={key}
                  onClick={() => {
                    setViewport(key as ViewportSize);
                  }}
                  title={config.label}
                  className={`
                    p-2 rounded-md transition-colors
                    ${
                      viewport === key
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-900'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                </button>
              );
            })}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <button
              onClick={() => {
                setTheme(theme === 'light' ? 'dark' : 'light');
              }}
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            {/* Font size */}
            <div className="flex items-center gap-1 px-2 border-l border-gray-200">
              <button
                onClick={() => {
                  setFontSize((s) => Math.max(12, s - 2));
                }}
                title="Decrease font size"
                className="p-1 rounded hover:bg-gray-100 text-gray-500"
              >
                <Type className="w-3 h-3" />
              </button>
              <span className="text-xs text-gray-500 w-8 text-center">{fontSize}px</span>
              <button
                onClick={() => {
                  setFontSize((s) => Math.min(24, s + 2));
                }}
                title="Increase font size"
                className="p-1 rounded hover:bg-gray-100 text-gray-500"
              >
                <Type className="w-4 h-4" />
              </button>
            </div>

            {/* Zoom */}
            <div className="flex items-center gap-1 px-2 border-l border-gray-200">
              <button
                onClick={() => {
                  setZoom((z) => Math.max(50, z - 10));
                }}
                title="Zoom out"
                className="p-1 rounded hover:bg-gray-100 text-gray-500"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs text-gray-500 w-10 text-center">{zoom}%</span>
              <button
                onClick={() => {
                  setZoom((z) => Math.min(150, z + 10));
                }}
                title="Zoom in"
                className="p-1 rounded hover:bg-gray-100 text-gray-500"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            {/* Reset */}
            <button
              onClick={handleReset}
              title="Reset settings"
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 border-l border-gray-200"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Close button */}
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 border-l border-gray-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Preview area */}
        <div className="flex-1 overflow-auto p-8 bg-gray-100">
          <div className="flex justify-center">
            <div
              ref={previewRef}
              style={previewStyles}
              className={`
                bg-white shadow-lg rounded-lg overflow-hidden transition-all
                ${theme === 'dark' ? 'bg-gray-900 text-gray-100' : 'bg-white text-gray-900'}
              `}
            >
              <div className="p-8">
                {blocks.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Eye className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No content to preview</p>
                  </div>
                ) : (
                  blocks.map((block, index) => renderPreviewBlock(block, index))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer with device info */}
        <div className="px-4 py-2 border-t border-gray-200 bg-white text-xs text-gray-500 flex items-center justify-between">
          <span>
            {VIEWPORT_CONFIGS[viewport].label} • {VIEWPORT_CONFIGS[viewport].width}px
          </span>
          <span>
            {blocks.length} block{blocks.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default PreviewPanel;
