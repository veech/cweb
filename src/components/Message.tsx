import type { Block } from '../../shared/protocol.ts'
import type { ThreadMessage, ToolResult } from '../lib/thread.ts'
import { Markdown } from './Markdown.tsx'
import { ToolBlock } from './ToolBlock.tsx'

interface Props {
  message: ThreadMessage
  toolResults: Record<string, ToolResult>
}

// Raw streaming text — used by the live draft in Thread.tsx for a typewriter
// caret feel while a turn is in flight. Settled assistant text renders through
// <Markdown> instead (see BlockView), so the turn formats once it lands.
export const proseClass = 'whitespace-pre-wrap break-words text-[15px] leading-7 text-foreground'

// Assistant prose with an optional blinking caret — used for the live draft and
// the pending-turn placeholder while a turn is in flight.
interface ProseLiveProps {
  text: string
  caret?: boolean
}

export function ProseLive(props: ProseLiveProps) {
  const { text, caret } = props
  return (
    <div className={proseClass}>
      {text}
      {caret && <span className="ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[2px] animate-caret bg-foreground align-text-bottom" />}
    </div>
  )
}

interface ThinkingBlockProps {
  text: string
}

export function ThinkingBlock(props: ThinkingBlockProps) {
  const { text } = props
  return (
    <div className="whitespace-pre-wrap break-words border-l-2 border-dashed border-border pl-3 text-xs leading-relaxed text-muted-foreground">
      <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">thinking</div>
      {text}
    </div>
  )
}

export function Message(props: Props) {
  const { message, toolResults } = props
  if (message.role === 'user')
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl bg-secondary px-4 py-2.5 text-[15px] leading-7 text-secondary-foreground">{message.text}</div>
      </div>
    )

  return (
    <div className="flex flex-col gap-3">
      {message.blocks.map((block, idx) => (
        <BlockView key={idx} block={block} toolResults={toolResults} />
      ))}
    </div>
  )
}

interface BlockViewProps {
  block: Block
  toolResults: Record<string, ToolResult>
}

function BlockView(props: BlockViewProps) {
  const { block, toolResults } = props
  if (block.type === 'text') return <Markdown text={block.text} />

  if (block.type === 'thinking') return <ThinkingBlock text={block.text} />

  return <ToolBlock name={block.name} input={block.input} result={toolResults[block.id]} />
}
