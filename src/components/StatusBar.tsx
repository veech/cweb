import { Plus } from 'lucide-react'

import type { Status } from '../lib/thread.ts'
import { cn } from '../lib/utils.ts'
import { Button } from './ui/button.tsx'

interface Props {
  cwd: string | null
  model: string | null
  permissionMode: string | null
  sessionId: string | null
  status: Status
  onReset: () => void
}

const STATUS_LABEL: Record<Status, string> = {
  idle: 'ready',
  thinking: 'thinking',
  streaming: 'streaming',
  error: 'error'
}

const DOT_CLASS: Record<Status, string> = {
  idle: 'bg-emerald-500',
  thinking: 'bg-primary animate-pulse',
  streaming: 'bg-primary animate-pulse',
  error: 'bg-destructive'
}

export function StatusBar(props: Props) {
  const { cwd, model, permissionMode, sessionId, status, onReset } = props
  const dir = cwd ? cwd.split('/').filter(Boolean).slice(-2).join('/') : '—'

  return (
    <header className="flex items-center gap-3 border-b border-border bg-background/80 px-4 py-2.5 backdrop-blur">
      <span className="flex items-center gap-2 text-sm font-semibold tracking-tight">
        <span className="text-primary">◆</span>
        cweb
      </span>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <Meta label="dir" value={dir} />
        {model && <Meta label="model" value={model} />}
        {permissionMode && <Meta label="perm" value={permissionMode} />}
        {sessionId && <Meta label="thread" value={sessionId.slice(0, 8)} />}
      </div>

      <div className="flex-1" />

      <span className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className={cn('inline-block size-2 rounded-full', DOT_CLASS[status])} />
        {STATUS_LABEL[status]}
      </span>

      <Button variant="ghost" size="sm" onClick={onReset} className="text-muted-foreground">
        <Plus className="size-4" />
        New thread
      </Button>
    </header>
  )
}

interface MetaProps {
  label: string
  value: string
}

function Meta(props: MetaProps) {
  const { label, value } = props
  return (
    <span className="flex items-center gap-1">
      <span className="text-muted-foreground/60">{label}</span>
      <span className="font-mono text-foreground/80">{value}</span>
    </span>
  )
}
