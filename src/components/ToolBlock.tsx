import { useState } from 'react'
import { Check, ChevronRight, LoaderCircle, X } from 'lucide-react'

import { diffStat, toolDiff } from '../lib/diff.ts'
import type { ToolDiff } from '../lib/diff.ts'
import type { ToolResult } from '../lib/thread.ts'
import { formatInput, toolSummary } from '../lib/thread.ts'
import { cn } from '../lib/utils.ts'
import { DiffView } from './Diff.tsx'

interface Props {
  name: string
  input: unknown
  result: ToolResult | undefined
}

const codeBase = 'max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-md border border-border bg-muted/40 p-2.5 font-mono text-xs leading-relaxed scrollbar-thin'

export function ToolBlock(props: Props) {
  const { name, input, result } = props
  const diff = toolDiff(name, input)
  const [open, setOpen] = useState(diff !== null)
  const error = result?.isError ?? false

  return (
    <div className={cn('overflow-hidden rounded-lg border bg-card shadow-sm', error ? 'border-destructive/40' : 'border-border')}>
      <ToolHeader name={name} input={input} result={result} diff={diff} open={open} onToggle={() => setOpen((current) => !current)} />
      {open && <ToolBody input={input} result={result} diff={diff} />}
    </div>
  )
}

interface ToolHeaderProps {
  name: string
  input: unknown
  result: ToolResult | undefined
  diff: ToolDiff | null
  open: boolean
  onToggle: () => void
}

function ToolHeader(props: ToolHeaderProps) {
  const { name, input, result, diff, open, onToggle } = props

  return (
    <button className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs transition-colors hover:bg-accent" onClick={onToggle} type="button">
      <ToolStatusIcon result={result} />
      <span className="font-medium text-foreground">{name}</span>
      <span className="min-w-0 flex-1 truncate font-mono text-muted-foreground">{toolSummary(name, input)}</span>
      <DiffStats diff={diff} />
      <ChevronRight className={cn('size-3.5 shrink-0 text-muted-foreground transition-transform', open && 'rotate-90')} />
    </button>
  )
}

interface ToolStatusIconProps {
  result: ToolResult | undefined
}

function ToolStatusIcon(props: ToolStatusIconProps) {
  const { result } = props
  if (!result) return <LoaderCircle className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
  if (result.isError) return <X className="size-3.5 shrink-0 text-destructive" />
  return <Check className="size-3.5 shrink-0 text-muted-foreground" />
}

interface DiffStatsProps {
  diff: ToolDiff | null
}

function DiffStats(props: DiffStatsProps) {
  const { diff } = props
  if (!diff) return null

  const stat = diffStat(diff.hunks)
  if (stat.added === 0 && stat.deleted === 0) return null

  return (
    <span className="shrink-0 font-mono text-[11px] tabular-nums">
      {stat.added > 0 && <span className="text-emerald-400">+{stat.added}</span>}
      {stat.added > 0 && stat.deleted > 0 && ' '}
      {stat.deleted > 0 && <span className="text-red-400">-{stat.deleted}</span>}
    </span>
  )
}

interface ToolBodyProps {
  input: unknown
  result: ToolResult | undefined
  diff: ToolDiff | null
}

function ToolBody(props: ToolBodyProps) {
  const { input, result, diff } = props
  const error = result?.isError ?? false

  if (diff && !error) {
    return (
      <div className="duration-200 animate-in fade-in slide-in-from-top-1">
        <DiffView hunks={diff.hunks} flush />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 border-t border-border px-3 py-3 duration-200 animate-in fade-in slide-in-from-top-1">
      <ToolInput input={input} diff={diff} />
      {result && <ToolResultView result={result} />}
    </div>
  )
}

interface ToolInputProps {
  input: unknown
  diff: ToolDiff | null
}

function ToolInput(props: ToolInputProps) {
  const { input, diff } = props
  if (diff) {
    return (
      <div>
        <SectionLabel>diff</SectionLabel>
        <DiffView hunks={diff.hunks} />
      </div>
    )
  }

  return (
    <div>
      <SectionLabel>input</SectionLabel>
      <pre className={cn(codeBase, 'text-muted-foreground')}>{formatInput(input)}</pre>
    </div>
  )
}

interface ToolResultViewProps {
  result: ToolResult
}

function ToolResultView(props: ToolResultViewProps) {
  const { result } = props
  const label = result.isError ? 'error' : 'result'
  const contentClass = result.isError ? 'border-destructive/30 bg-destructive/10 text-destructive' : 'text-foreground/80'

  return (
    <div>
      <SectionLabel>{label}</SectionLabel>
      <pre className={cn(codeBase, contentClass)}>{result.content || '(empty)'}</pre>
    </div>
  )
}

interface SectionLabelProps {
  children: string
}

function SectionLabel(props: SectionLabelProps) {
  const { children } = props
  return <div className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">{children}</div>
}
