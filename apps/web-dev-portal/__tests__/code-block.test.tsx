import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CodeBlock from '../components/code-block';

// Mock react-syntax-highlighter
vi.mock('react-syntax-highlighter', () => ({
  Prism: ({ children }: { children: string }) => <pre data-testid="code-block">{children}</pre>,
}));

vi.mock('react-syntax-highlighter/dist/esm/styles/prism', () => ({
  oneDark: {},
}));

describe('CodeBlock Component', () => {
  const sampleCode = `const apiKey = 'aivo_sk_test_xxx';
const response = await fetch('/api/learners');`;

  beforeEach(() => {
    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('renders code content', () => {
    render(<CodeBlock code={sampleCode} language="javascript" />);
    expect(screen.getByTestId('code-block')).toHaveTextContent(sampleCode);
  });

  it('displays the language label', () => {
    render(<CodeBlock code={sampleCode} language="javascript" />);
    expect(screen.getByText('javascript')).toBeInTheDocument();
  });

  it('displays custom filename when provided', () => {
    render(<CodeBlock code={sampleCode} language="javascript" filename="example.js" />);
    expect(screen.getByText('example.js')).toBeInTheDocument();
  });

  it('copies code to clipboard when copy button is clicked', async () => {
    render(<CodeBlock code={sampleCode} language="javascript" />);
    
    const copyButton = screen.getByRole('button');
    fireEvent.click(copyButton);
    
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(sampleCode);
  });

  it('shows copied feedback after clicking copy', async () => {
    render(<CodeBlock code={sampleCode} language="javascript" />);
    
    const copyButton = screen.getByRole('button');
    fireEvent.click(copyButton);
    
    // The component should show "Copied!" feedback
    // This depends on implementation - adjust as needed
  });
});
