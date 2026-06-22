import type { Ref, UIEventHandler } from 'react'

import type { LiveDraft, ResultMeta, Status, ThreadMessage, ToolResult } from '../lib/thread.ts'
import { formatCost, formatDuration, isBusyStatus } from '../lib/thread.ts'
import { Message, ProseLive, ThinkingBlock } from './Message.tsx'

interface Props {
  scrollRef: Ref<HTMLDivElement>
  onScroll: UIEventHandler<HTMLDivElement>
  messages: ThreadMessage[]
  toolResults: Record<string, ToolResult>
  live: LiveDraft
  status: Status
  lastResult: ResultMeta
  error: string | null
}

export function Thread(props: Props) {
  const { scrollRef, onScroll, messages, toolResults, live, status, lastResult, error } = props
  const busy = isBusyStatus(status)
  const hasLive = hasLiveDraft(live, busy)
  const empty = messages.length === 0 && !hasLive && !error

  return (
    <div ref={scrollRef} onScroll={onScroll} className="overflow-y-auto scrollbar-thin">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 pb-24 pt-10">
        {empty && <EmptyThread />}
        <MessageList messages={messages} toolResults={toolResults} />
        <LiveResponse live={live} busy={busy} hasLive={hasLive} />
        {!busy && lastResult && <ResultSummary result={lastResult} />}
        {error && <ErrorNotice message={error} />}
      </div>
    </div>
  )
}

function hasLiveDraft(live: LiveDraft, busy: boolean): boolean {
  return busy && (live.text.length > 0 || live.thinking.length > 0)
}

function EmptyThread() {
  return (
    <div className="m-auto py-20 text-center">
      <div className="text-2xl text-primary/80">◆</div>
      <div className="mt-4 text-2xl font-semibold tracking-tight text-foreground">A thread, scoped to this directory.</div>
      <div className="mt-2 text-sm text-muted-foreground">ask anything · claude has the full context</div>
    </div>
  )
}

interface MessageListProps {
  messages: ThreadMessage[]
  toolResults: Record<string, ToolResult>
}

function MessageList(props: MessageListProps) {
  const { messages, toolResults } = props
  return messages.map((message) => <Message key={message.id} message={message} toolResults={toolResults} />)
}

interface LiveResponseProps {
  live: LiveDraft
  busy: boolean
  hasLive: boolean
}

function LiveResponse(props: LiveResponseProps) {
  const { live, busy, hasLive } = props
  if (!busy) return null
  if (!hasLive) return <ProseLive text="" caret />

  return (
    <div className="flex flex-col gap-3">
      {live.thinking && <ThinkingBlock text={live.thinking} />}
      <ProseLive text={live.text} caret />
    </div>
  )
}

interface ResultSummaryProps {
  result: NonNullable<ResultMeta>
}

function ResultSummary(props: ResultSummaryProps) {
  const { result } = props
  return (
    <div className="flex gap-4 pt-1 font-mono text-[11px] text-muted-foreground">
      <span>
        <b className="font-medium text-foreground/80">{formatCost(result.costUsd)}</b>
      </span>
      <span>
        <b className="font-medium text-foreground/80">{formatDuration(result.durationMs)}</b>
      </span>
      <span>
        <b className="font-medium text-foreground/80">{result.numTurns}</b> turns
      </span>
    </div>
  )
}

interface ErrorNoticeProps {
  message: string
}

function ErrorNotice(props: ErrorNoticeProps) {
  const { message } = props
  return <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">{message}</div>
}
