import React from 'react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  onAIAnalysisClick?: () => void;
  onActionClick?: (action: string, label: string) => void;
}

// Custom components for better formatting
const createMarkdownComponents = (onAIAnalysisClick?: () => void, onActionClick?: (action: string, label: string) => void) => ({
  // Headings with proper spacing
  h1: ({ children, ...props }: any) => (
    <h1 className="text-lg font-semibold text-foreground mb-3 mt-4 first:mt-0" {...props}>
      {children}
    </h1>
  ),
  h2: ({ children, ...props }: any) => (
    <h2 className="text-base font-semibold text-foreground mb-2 mt-3 first:mt-0" {...props}>
      {children}
    </h2>
  ),
  h3: ({ children, ...props }: any) => (
    <h3 className="text-sm font-semibold text-foreground mb-2 mt-2 first:mt-0" {...props}>
      {children}
    </h3>
  ),
  
  // Paragraphs with proper spacing and UK English formatting
  p: ({ children, ...props }: any) => (
    <p className="text-sm text-foreground leading-relaxed mb-3 last:mb-0" {...props}>
      {children}
    </p>
  ),
  
  // Lists with proper spacing
  ul: ({ children, ...props }: any) => (
    <ul className="text-sm text-foreground mb-3 space-y-1 list-disc list-outside ml-4" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }: any) => (
    <ol className="text-sm text-foreground mb-3 space-y-1 list-decimal list-outside ml-4" {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }: any) => (
    <li className="text-sm text-foreground leading-relaxed pl-1" {...props}>
      {children}
    </li>
  ),
  
  // Strong/bold text
  strong: ({ children, ...props }: any) => (
    <strong className="font-semibold text-foreground" {...props}>
      {children}
    </strong>
  ),
  
  // Emphasis/italic text
  em: ({ children, ...props }: any) => (
    <em className="italic text-foreground" {...props}>
      {children}
    </em>
  ),
  
  // Code blocks
  code: ({ children, className, ...props }: any) => {
    const isInline = !className;
    if (isInline) {
      return (
        <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-foreground" {...props}>
          {children}
        </code>
      );
    }
    return (
      <code className="block bg-muted p-3 rounded text-xs font-mono text-foreground overflow-x-auto" {...props}>
        {children}
      </code>
    );
  },
  
  // Blockquotes
  blockquote: ({ children, ...props }: any) => (
    <blockquote className="border-l-4 border-primary/20 pl-4 py-2 my-3 bg-muted/30 rounded-r" {...props}>
      {children}
    </blockquote>
  ),
  
  // Links with special handling for action links
  a: ({ children, href, ...props }: any) => {
    if (href === 'ai-analysis' && onAIAnalysisClick) {
      return (
        <button
          onClick={onAIAnalysisClick}
          className="text-primary hover:text-primary/80 underline underline-offset-2 transition-colors font-medium cursor-pointer"
          type="button"
          {...props}
        >
          {children}
        </button>
      );
    }
    
    if (href && href.startsWith('action:') && onActionClick) {
      const action = href.replace('action:', '');
      return (
        <button
          onClick={() => onActionClick(action, String(children))}
          className="text-primary hover:text-primary/80 underline underline-offset-2 transition-colors font-medium cursor-pointer"
          type="button"
          {...props}
        >
          {children}
        </button>
      );
    }
    
    return (
      <a 
        href={href} 
        className="text-primary hover:text-primary/80 underline underline-offset-2 transition-colors" 
        target="_blank" 
        rel="noopener noreferrer"
        {...props}
      >
        {children}
      </a>
    );
  },
  
  // Horizontal rules
  hr: ({ ...props }: any) => (
    <hr className="border-border my-4" {...props} />
  ),
});

export function MarkdownRenderer({ content, className, onAIAnalysisClick, onActionClick }: MarkdownRendererProps) {
  const components = createMarkdownComponents(onAIAnalysisClick, onActionClick);
  
  return (
    <div className={cn("prose prose-sm dark:prose-invert max-w-none", className)}>
      <ReactMarkdown components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
