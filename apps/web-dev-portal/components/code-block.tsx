'use client';

import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useState } from 'react';

interface CodeBlockProps {
  language: string;
  code: string;
  filename?: string;
  showLineNumbers?: boolean;
}

export function CodeBlock({ 
  language, 
  code, 
  filename,
  showLineNumbers = false,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="code-block my-4 rounded-lg overflow-hidden border border-gray-200">
      {filename && (
        <div className="flex items-center justify-between px-4 py-2 bg-gray-800 text-gray-300 text-sm">
          <span className="font-mono">{filename}</span>
          <button
            onClick={handleCopy}
            className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded transition-colors"
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
      )}
      <SyntaxHighlighter
        language={language}
        style={oneDark}
        showLineNumbers={showLineNumbers}
        customStyle={{
          margin: 0,
          padding: '1rem',
          fontSize: '0.875rem',
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

// Tab-based code examples for multiple languages
interface CodeTabsProps {
  examples: {
    language: string;
    label: string;
    code: string;
  }[];
}

export function CodeTabs({ examples }: CodeTabsProps) {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="code-block my-4 rounded-lg overflow-hidden border border-gray-200">
      <div className="flex bg-gray-800 border-b border-gray-700">
        {examples.map((example, index) => (
          <button
            key={example.label}
            onClick={() => setActiveTab(index)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === index
                ? 'bg-gray-900 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {example.label}
          </button>
        ))}
      </div>
      <SyntaxHighlighter
        language={examples[activeTab].language}
        style={oneDark}
        customStyle={{
          margin: 0,
          padding: '1rem',
          fontSize: '0.875rem',
        }}
      >
        {examples[activeTab].code}
      </SyntaxHighlighter>
    </div>
  );
}
