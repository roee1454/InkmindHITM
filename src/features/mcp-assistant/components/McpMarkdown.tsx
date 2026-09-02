import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface McpMarkdownProps {
  text: string
}

/** Renders MCP assistant answers as markdown. No `rehype-raw` — raw HTML in the model's
 *  output is never executed, which is the correct default for LLM-generated content. Code/pre
 *  reuse `McpToolCallCard`'s `dir="ltr"` + `bg-muted` visual language so fenced snippets read
 *  the same way tool-call JSON dumps already do elsewhere in this feature. */
export function McpMarkdown({ text }: McpMarkdownProps) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none font-assistant text-foreground prose-p:leading-relaxed prose-pre:p-0">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ children, ...props }) => (
            <a {...props} target="_blank" rel="noreferrer">
              {children}
            </a>
          ),
          code: ({ className, children, ...props }) => {
            const isBlock = Boolean(className)
            if (!isBlock) {
              return (
                <code dir="ltr" className="rounded-md bg-muted px-1 py-0.5 font-mono text-[0.85em]" {...props}>
                  {children}
                </code>
              )
            }
            return (
              <code className={className} {...props}>
                {children}
              </code>
            )
          },
          pre: ({ children, ...props }) => (
            <pre
              dir="ltr"
              className="overflow-auto rounded-xl bg-muted p-2.5 text-right font-mono text-[11px] leading-relaxed"
              {...props}
            >
              {children}
            </pre>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  )
}
