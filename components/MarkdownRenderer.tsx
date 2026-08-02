import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check, Table, ChevronRight, CheckCircle2 } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  assistantTitle?: string;
}

const CodeBlock: React.FC<{ language?: string; value: string }> = ({ value }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-4 rounded-2xl overflow-hidden border border-gray-800 bg-gray-900 text-gray-100 shadow-md">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-950 border-b border-gray-800 text-[11px] font-mono text-gray-400">
        <span className="font-bold uppercase tracking-wider">Clinical Data / Routine</span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 hover:text-white transition-colors"
        >
          {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-xs font-mono leading-relaxed text-blue-200">
        <code>{value}</code>
      </pre>
    </div>
  );
};

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  return (
    <div className="prose dark:prose-invert max-w-none space-y-3 text-sm leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Styled HTML Table with mobile horizontal scrolling and stacked styling
          table: ({ children }) => (
            <div className="my-4 my-2-mobile w-full overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
              <div className="p-2.5 bg-blue-50/80 dark:bg-blue-950/40 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                  <Table size={13} /> Structured Clinical Guidance Table
                </span>
                <span className="text-[9px] text-gray-400 dark:text-gray-500 font-bold hidden sm:inline">
                  Scroll horizontally on mobile
                </span>
              </div>
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left text-xs border-collapse min-w-[480px] sm:min-w-full">
                  {children}
                </table>
              </div>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-gray-100 dark:bg-gray-900/80 border-b border-gray-200 dark:border-gray-700 font-black text-gray-700 dark:text-gray-300 text-[11px] uppercase tracking-wider">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50 text-gray-800 dark:text-gray-200">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-colors">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="p-3 font-extrabold text-gray-900 dark:text-gray-100">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="p-3 text-xs font-medium leading-normal">
              {children}
            </td>
          ),
          // Headings
          h1: ({ children }) => (
            <h1 className="text-lg font-black text-gray-900 dark:text-white mt-4 mb-2 tracking-tight border-b border-gray-100 dark:border-gray-800 pb-1.5 flex items-center gap-2">
              <span className="w-2 h-5 bg-blue-600 rounded-full inline-block" />
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-base font-black text-gray-900 dark:text-white mt-3 mb-2 tracking-tight flex items-center gap-2">
              <span className="w-2 h-4 bg-indigo-500 rounded-full inline-block" />
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mt-3 mb-1.5 flex items-center gap-1.5">
              <ChevronRight size={14} className="text-blue-500 shrink-0" />
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200 mt-2 mb-1">
              {children}
            </h4>
          ),
          // Lists
          ul: ({ children }) => (
            <ul className="space-y-2 my-3 pl-1">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="space-y-2 my-3 list-decimal pl-5 font-bold text-gray-800 dark:text-gray-200">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="flex items-start gap-2 text-xs md:text-sm font-medium text-gray-800 dark:text-gray-200">
              <CheckCircle2 size={15} className="text-emerald-500 shrink-0 mt-0.5" />
              <div className="flex-1">{children}</div>
            </li>
          ),
          // Code Blocks
          code: ({ className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || '');
            const isInline = !match && typeof children === 'string' && !children.includes('\n');
            if (isInline) {
              return (
                <code className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 rounded-md font-mono text-[11px] font-bold border border-blue-100 dark:border-blue-900/50" {...props}>
                  {children}
                </code>
              );
            }
            return <CodeBlock value={String(children).replace(/\n$/, '')} language={match ? match[1] : undefined} />;
          },
          // Blockquotes
          blockquote: ({ children }) => (
            <blockquote className="my-3 p-4 bg-blue-50/60 dark:bg-blue-950/30 border-l-4 border-blue-600 rounded-r-2xl text-xs font-medium text-blue-950 dark:text-blue-200 italic shadow-xs">
              {children}
            </blockquote>
          ),
          // Links
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-bold text-blue-600 dark:text-blue-400 hover:underline"
            >
              {children}
            </a>
          ),
          // Strong
          strong: ({ children }) => (
            <strong className="font-extrabold text-gray-900 dark:text-white bg-blue-50/50 dark:bg-blue-900/20 px-1 py-0.5 rounded">
              {children}
            </strong>
          ),
          p: ({ children }) => (
            <p className="text-gray-800 dark:text-gray-200 text-xs md:text-sm leading-relaxed mb-2 font-medium">
              {children}
            </p>
          )
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
