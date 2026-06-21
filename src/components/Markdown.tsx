import { isValidElement, memo, useState } from 'react'
import type { ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'
import { Check, Copy } from 'lucide-react'
import rehypeHighlight from 'rehype-highlight'
import remarkGfm from 'remark-gfm'

import { cn } from '../lib/utils.ts'

interface Props {
  text: string
  // While a turn streams, render a blinking caret inline at the end so the live
  // draft formats in real time instead of snapping from raw text to markdown.
  caret?: boolean
}

// Renders assistant markdown: GFM (tables, task lists, strikethrough, autolinks)
// plus syntax-highlighted code fences. Memoized on its props so settled messages
// don't re-parse on every streaming delta of the in-flight turn.
export const Markdown = memo(function Markdown(props: Props) {
  const { text, caret } = props
  return (
    <div className="break-words text-[15px] leading-7 text-foreground [&>:first-child]:mt-0 [&>:last-child]:mb-0">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[[rehypeHighlight, { detect: true, ignoreMissing: true }], rehypeCaret]} components={components}>
        {caret ? text + CARET : text}
      </ReactMarkdown>
    </div>
  )
})

// Fenced code block: a labelled, copyable panel matching the ToolBlock chrome.
interface CodeBlockProps {
  children: ReactNode
}

function CodeBlock(props: CodeBlockProps) {
  const { children } = props
  const [copied, setCopied] = useState(false)
  const lang = codeLang(children)

  const copy = () => {
    navigator.clipboard.writeText(childrenToText(children))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="my-4 overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">{lang || 'code'}</span>
        <button className="flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground" onClick={copy} type="button">
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
          {copied ? 'copied' : 'copy'}
        </button>
      </div>
      <pre className="max-h-[480px] overflow-auto p-3 font-mono text-[13px] leading-relaxed scrollbar-thin">{children}</pre>
    </div>
  )
}

// One `code` element handles both inline spans (a subtle pill) and the
// highlighted body of a fenced block (rehype-highlight tags the latter with a
// `language-*`/`hljs` className).
interface CodeProps {
  className?: string
  children: ReactNode
}

function Code(props: CodeProps) {
  const { className, children } = props
  if (!className) return <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-foreground">{children}</code>

  return <code className={cn(className, 'font-mono')}>{children}</code>
}

const components: Components = {
  pre: (props) => <CodeBlock>{props.children}</CodeBlock>,
  code: (props) => <Code className={props.className}>{props.children}</Code>,
  h1: (props) => <h1 className="mb-3 mt-6 text-xl font-semibold tracking-tight text-foreground">{props.children}</h1>,
  h2: (props) => <h2 className="mb-3 mt-6 text-lg font-semibold tracking-tight text-foreground">{props.children}</h2>,
  h3: (props) => <h3 className="mb-2 mt-5 text-base font-semibold text-foreground">{props.children}</h3>,
  h4: (props) => <h4 className="mb-2 mt-4 text-sm font-semibold text-foreground">{props.children}</h4>,
  p: (props) => <p className="my-4">{props.children}</p>,
  a: (props) => (
    <a className="font-medium text-primary underline underline-offset-2 transition-colors hover:text-primary/80" href={props.href} rel="noreferrer" target="_blank">
      {props.children}
    </a>
  ),
  ul: (props) => <ul className="my-4 list-disc space-y-1.5 pl-5 marker:text-muted-foreground">{props.children}</ul>,
  ol: (props) => <ol className="my-4 list-decimal space-y-1.5 pl-5 marker:text-muted-foreground">{props.children}</ol>,
  li: (props) => <li className="leading-7">{props.children}</li>,
  blockquote: (props) => <blockquote className="my-4 border-l-2 border-border pl-4 italic text-muted-foreground">{props.children}</blockquote>,
  strong: (props) => <strong className="font-semibold text-foreground">{props.children}</strong>,
  em: (props) => <em className="italic">{props.children}</em>,
  hr: () => <hr className="my-6 border-border" />,
  table: (props) => (
    <div className="my-4 overflow-x-auto scrollbar-thin">
      <table className="w-full border-collapse text-sm">{props.children}</table>
    </div>
  ),
  th: (props) => <th className="border border-border bg-muted/40 px-3 py-1.5 text-left font-medium text-foreground">{props.children}</th>,
  td: (props) => <td className="border border-border px-3 py-1.5 align-top">{props.children}</td>,
  img: (props) => <img className="my-4 max-w-full rounded-lg border border-border" alt={props.alt} src={props.src} />
}

function childrenToText(node: ReactNode): string {
  if (typeof node === 'string') return node
  if (Array.isArray(node)) return node.map(childrenToText).join('')
  if (isValidElement<{ children?: ReactNode }>(node)) return childrenToText(node.props.children)
  return ''
}

function codeLang(node: ReactNode): string {
  if (!isValidElement<{ className?: string }>(node)) return ''
  const match = /language-(\w+)/.exec(node.props.className ?? '')
  return match ? match[1] : ''
}

// Private-use sentinel appended to streaming text. It survives remark/rehype as
// an ordinary character, so rehypeCaret can find the single occurrence — wherever
// the stream currently ends — and swap it for a blinking caret element inline.
const CARET = '\uE000'

interface HastNode {
  type: string
  value?: string
  tagName?: string
  properties?: Record<string, unknown>
  children?: HastNode[]
}

function rehypeCaret() {
  return (tree: HastNode) => {
    insertCaret(tree)
  }
}

function insertCaret(node: HastNode): boolean {
  if (!node.children) return false
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i]
    if (child.type === 'text' && child.value?.includes(CARET)) {
      child.value = child.value.replace(CARET, '')
      node.children.splice(i + 1, 0, { type: 'element', tagName: 'span', properties: { className: ['stream-caret'] }, children: [] })
      return true
    }
    if (child.type === 'element' && insertCaret(child)) return true
  }
  return false
}
