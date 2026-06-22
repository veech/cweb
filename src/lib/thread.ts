import type { Block, HistoryItem } from '../../shared/protocol.ts'

export type ToolResult = { content: string; isError: boolean }

export type UserMessage = { id: string; role: 'user'; text: string }
export type AssistantMessage = { id: string; role: 'assistant'; blocks: Block[] }
export type ThreadMessage = UserMessage | AssistantMessage

export type Status = 'idle' | 'thinking' | 'streaming' | 'error'

export type LiveDraft = { text: string; thinking: string }

export type ResultMeta = { costUsd: number; durationMs: number; numTurns: number } | null

export type Session = {
  sessionId: string | null
  model: string | null
  cwd: string | null
  permissionMode: string | null
}

export type RestoredThread = {
  messages: ThreadMessage[]
  toolResults: Record<string, ToolResult>
}

export const EMPTY_LIVE: LiveDraft = { text: '', thinking: '' }

export const EMPTY_SESSION: Session = {
  sessionId: null,
  model: null,
  cwd: null,
  permissionMode: null
}

export function isBusyStatus(status: Status): boolean {
  return status === 'thinking' || status === 'streaming'
}

export function restoreThread(items: HistoryItem[]): RestoredThread {
  const messages: ThreadMessage[] = []
  const toolResults: Record<string, ToolResult> = {}

  for (const item of items) {
    if (item.role === 'user') {
      messages.push({ id: newId(), role: 'user', text: item.text })
      continue
    }
    if (item.role === 'assistant') {
      messages.push({ id: newId(), role: 'assistant', blocks: item.blocks })
      continue
    }
    toolResults[item.toolUseId] = { content: item.content, isError: item.isError }
  }

  return { messages, toolResults }
}

export function upsertAssistantMessage(messages: ThreadMessage[], id: string | undefined, blocks: Block[]): ThreadMessage[] {
  const idx = id ? messages.findIndex((x) => x.id === id) : -1
  if (idx === -1) return [...messages, { id: id || newId(), role: 'assistant', blocks }]

  const existing = messages[idx] as AssistantMessage
  const seen = new Set(existing.blocks.map(blockSig))
  const nextBlocks = [...existing.blocks]
  for (const block of blocks) {
    const sig = blockSig(block)
    if (seen.has(sig)) continue
    seen.add(sig)
    nextBlocks.push(block)
  }

  const next = [...messages]
  next[idx] = { ...existing, blocks: nextBlocks }
  return next
}

export function newId(): string {
  // crypto.randomUUID exists only in secure contexts (https / localhost). When
  // the UI is served over a plain-http LAN IP — or in an older webview — it's
  // undefined. These are just local message ids, so a non-crypto fallback is
  // fine.
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

// A stable identity for a block, used to merge repeated assistant snapshots
// without duplicating or dropping blocks. Tool calls are identified by their id;
// text/thinking by their (final) content — partials never reach here, they go
// through the live draft.
export function blockSig(b: Block): string {
  if (b.type === 'tool_use') return `tool_use:${b.id}`
  return `${b.type}:${b.text}`
}

// A short, human-readable summary of a tool call for the collapsed header.
export function toolSummary(name: string, input: unknown): string {
  const i = (input ?? {}) as Record<string, unknown>
  const first = (...keys: string[]) => {
    for (const k of keys) if (typeof i[k] === 'string' && i[k]) return i[k] as string
    return ''
  }
  if (name === 'Bash') return first('command', 'description')
  if (name === 'Read' || name === 'Write' || name === 'Edit' || name === 'NotebookEdit') return first('file_path', 'notebook_path')
  if (name === 'Glob') return first('pattern')
  if (name === 'Grep') return first('pattern')
  if (name === 'WebFetch' || name === 'WebSearch') return first('url', 'query', 'prompt')
  if (name === 'Task') return first('description', 'prompt')
  const summary = first('path', 'file_path', 'pattern', 'query', 'command', 'description', 'url')
  return summary || JSON.stringify(i).slice(0, 120)
}

export function formatInput(input: unknown): string {
  if (input == null) return ''
  if (typeof input === 'string') return input
  try {
    return JSON.stringify(input, null, 2)
  } catch {
    return String(input)
  }
}

export function formatCost(usd: number): string {
  if (!usd) return '$0'
  if (usd < 0.01) return `$${usd.toFixed(4)}`
  return `$${usd.toFixed(2)}`
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}
