'use client'

import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { Highlight, themes } from 'prism-react-renderer'
import { memo, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'

// Import KaTeX CSS for math rendering
import 'katex/dist/katex.min.css'

interface MarkdownMessageProps {
  content: string
  className?: string
}

/**
 * Copy button for code blocks
 */
function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="absolute top-2 right-2 p-1.5 rounded-md bg-background/80 hover:bg-background text-muted-foreground hover:text-foreground transition-all opacity-0 group-hover:opacity-100"
      title="Copy code"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-green-500" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </button>
  )
}

/**
 * Custom components for rendering markdown elements
 */
const markdownComponents: Components = {
  // Code blocks and inline code
  code({ node, className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || '')
    const language = match ? match[1] : ''
    const codeString = String(children).replace(/\n$/, '')
    
    // Check if this is a code block (has language) or inline code
    const isCodeBlock = match || (codeString.includes('\n'))
    
    if (isCodeBlock) {
      return (
        <div className="group relative my-3 first:mt-0 last:mb-0">
          {/* Language badge */}
          {language && (
            <div className="absolute top-0 left-0 px-2 py-0.5 text-[10px] font-medium text-muted-foreground bg-muted/50 rounded-tl-lg rounded-br-md uppercase tracking-wide">
              {language}
            </div>
          )}
          <CopyButton code={codeString} />
          <Highlight
            theme={themes.oneDark}
            code={codeString}
            language={language || 'text'}
          >
            {({ className: hlClassName, style, tokens, getLineProps, getTokenProps }) => (
              <pre 
                className={cn(
                  "rounded-lg overflow-x-auto p-4 text-sm font-mono",
                  language && "pt-7", // Extra padding for language badge
                  hlClassName
                )} 
                style={style}
              >
                {tokens.map((line, i) => (
                  <div key={i} {...getLineProps({ line })}>
                    {line.map((token, key) => (
                      <span key={key} {...getTokenProps({ token })} />
                    ))}
                  </div>
                ))}
              </pre>
            )}
          </Highlight>
        </div>
      )
    }
    
    // Inline code
    return (
      <code 
        className="bg-muted/70 text-foreground px-1.5 py-0.5 rounded text-[0.9em] font-mono before:content-none after:content-none" 
        {...props}
      >
        {children}
      </code>
    )
  },

  // Pre wrapper (just pass through, we handle styling in code)
  pre({ children }) {
    return <>{children}</>
  },

  // Paragraphs
  p({ children }) {
    return <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>
  },

  // Headings
  h1({ children }) {
    return <h1 className="text-xl font-bold mt-4 mb-2 first:mt-0">{children}</h1>
  },
  h2({ children }) {
    return <h2 className="text-lg font-semibold mt-4 mb-2 first:mt-0">{children}</h2>
  },
  h3({ children }) {
    return <h3 className="text-base font-semibold mt-3 mb-1.5 first:mt-0">{children}</h3>
  },
  h4({ children }) {
    return <h4 className="text-sm font-semibold mt-3 mb-1 first:mt-0">{children}</h4>
  },

  // Lists
  ul({ children }) {
    return <ul className="list-disc pl-5 mb-3 last:mb-0 space-y-1">{children}</ul>
  },
  ol({ children }) {
    return <ol className="list-decimal pl-5 mb-3 last:mb-0 space-y-1">{children}</ol>
  },
  li({ children }) {
    return <li className="leading-relaxed">{children}</li>
  },

  // Links
  a({ href, children }) {
    return (
      <a 
        href={href} 
        className="text-primary hover:underline underline-offset-2" 
        target="_blank" 
        rel="noopener noreferrer"
      >
        {children}
      </a>
    )
  },

  // Blockquotes
  blockquote({ children }) {
    return (
      <blockquote className="border-l-2 border-primary/40 pl-4 my-3 first:mt-0 last:mb-0 italic text-muted-foreground">
        {children}
      </blockquote>
    )
  },

  // Tables
  table({ children }) {
    return (
      <div className="overflow-x-auto my-3 first:mt-0 last:mb-0">
        <table className="min-w-full border-collapse text-sm">
          {children}
        </table>
      </div>
    )
  },
  thead({ children }) {
    return <thead className="border-b border-border">{children}</thead>
  },
  tbody({ children }) {
    return <tbody className="divide-y divide-border/50">{children}</tbody>
  },
  tr({ children }) {
    return <tr className="hover:bg-muted/30 transition-colors">{children}</tr>
  },
  th({ children }) {
    return <th className="px-3 py-2 text-left font-semibold text-foreground">{children}</th>
  },
  td({ children }) {
    return <td className="px-3 py-2 text-muted-foreground">{children}</td>
  },

  // Horizontal rule
  hr() {
    return <hr className="my-4 border-border/50" />
  },

  // Strong and emphasis
  strong({ children }) {
    return <strong className="font-semibold text-foreground">{children}</strong>
  },
  em({ children }) {
    return <em className="italic">{children}</em>
  },

  // Strikethrough (from GFM)
  del({ children }) {
    return <del className="line-through text-muted-foreground">{children}</del>
  },
}

/**
 * Renders markdown content with support for:
 * - GitHub Flavored Markdown (tables, strikethrough, task lists)
 * - Syntax-highlighted code blocks
 * - LaTeX/math equations (inline $...$ and block $$...$$)
 * - All standard markdown formatting
 * 
 * Handles mixed content gracefully - plain text, markdown, code, and math
 * can all appear in the same response and will render correctly.
 * 
 * Memoized for performance during streaming.
 */
function MarkdownMessageComponent({ content, className }: MarkdownMessageProps) {
  if (!content) return null

  return (
    <div className={cn("markdown-message", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

// Memoize to prevent re-parsing during streaming for completed messages
export const MarkdownMessage = memo(MarkdownMessageComponent)
