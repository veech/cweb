import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { ArrowUp, Square } from 'lucide-react'

import { Button } from './ui/button.tsx'

interface Props {
  busy: boolean
  onSend: (text: string) => void
  onStop: () => void
}

const kbd = 'inline-flex min-w-4 justify-center rounded border border-border bg-secondary px-1 py-0.5 font-mono text-[10px] text-muted-foreground shadow-[0_1px_0_rgba(0,0,0,0.35)]'

export function Composer(props: Props) {
  const { busy, onSend, onStop } = props
  const [value, setValue] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)

  // Auto-grow the textarea to fit its content.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])

  const submit = () => {
    const text = value.trim()
    if (!text || busy) return
    onSend(text)
    setValue('')
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div className="border-t border-border bg-background/80 px-4 pb-4 pt-3 backdrop-blur">
      <div className="mx-auto flex w-full max-w-3xl items-end gap-2 rounded-xl border border-input bg-card px-3 py-2 shadow-sm transition-colors focus-within:border-ring/70 focus-within:ring-2 focus-within:ring-ring/25">
        <textarea
          ref={ref}
          value={value}
          rows={1}
          placeholder="Ask Claude about this directory…"
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          autoFocus
          className="max-h-48 flex-1 resize-none bg-transparent py-1.5 text-[15px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground"
        />
        {busy ? (
          <Button variant="destructive" size="icon" onClick={onStop} className="size-9 shrink-0 rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.12)]" title="Stop">
            <Square className="size-4 fill-current" />
          </Button>
        ) : (
          <Button
            size="icon"
            onClick={submit}
            disabled={!value.trim()}
            className="size-9 shrink-0 rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.14)] hover:bg-[#6872e5]"
            title="Send"
          >
            <ArrowUp className="size-4" />
          </Button>
        )}
      </div>
      <div className="mx-auto mt-2 flex w-full max-w-3xl justify-between text-xs text-muted-foreground">
        <span>
          <kbd className={kbd}>Enter</kbd> send · <kbd className={kbd}>Shift</kbd>+<kbd className={kbd}>Enter</kbd> newline
        </span>
        <span>{busy ? 'working…' : ''}</span>
      </div>
    </div>
  )
}
