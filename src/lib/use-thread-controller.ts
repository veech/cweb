import { useEffect, useRef, useState } from 'react'
import type { RefObject, UIEventHandler } from 'react'

import type { ServerEvent } from '../../shared/protocol.ts'
import { fetchHistory, fetchSession, resetThread, streamSend } from './api.ts'
import { EMPTY_LIVE, EMPTY_SESSION, isBusyStatus, newId, restoreThread, upsertAssistantMessage } from './thread.ts'
import type { LiveDraft, ResultMeta, Session, Status, ThreadMessage, ToolResult } from './thread.ts'

export type ThreadController = {
  messages: ThreadMessage[]
  toolResults: Record<string, ToolResult>
  live: LiveDraft
  status: Status
  session: Session
  lastResult: ResultMeta
  error: string | null
  busy: boolean
  scrollRef: RefObject<HTMLDivElement | null>
  handleScroll: UIEventHandler<HTMLDivElement>
  send: (text: string) => Promise<void>
  stop: () => void
  reset: () => Promise<void>
}

export function useThreadController(): ThreadController {
  const [messages, setMessages] = useState<ThreadMessage[]>([])
  const [toolResults, setToolResults] = useState<Record<string, ToolResult>>({})
  const [live, setLive] = useState<LiveDraft>(EMPTY_LIVE)
  const [status, setStatus] = useState<Status>('idle')
  const [session, setSession] = useState<Session>(EMPTY_SESSION)
  const [lastResult, setLastResult] = useState<ResultMeta>(null)
  const [error, setError] = useState<string | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)
  const pinnedRef = useRef(true)
  const abortRef = useRef<AbortController | null>(null)
  const busy = isBusyStatus(status)

  useEffect(() => {
    let cancelled = false

    async function loadThread() {
      const [sessionResponse, historyResponse] = await Promise.all([fetchSession(), fetchHistory()])
      if (cancelled) return

      setSession({
        sessionId: sessionResponse.sessionId,
        cwd: sessionResponse.cwd,
        permissionMode: sessionResponse.permissionMode,
        model: null
      })

      const restored = restoreThread(historyResponse.items)
      setMessages(restored.messages)
      setToolResults(restored.toolResults)
    }

    loadThread()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el || !pinnedRef.current) return
    el.scrollTop = el.scrollHeight
  }, [messages, live, status])

  const handleScroll: UIEventHandler<HTMLDivElement> = () => {
    const el = scrollRef.current
    if (!el) return
    pinnedRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 32
  }

  const handleEvent = (event: ServerEvent) => {
    if (event.kind === 'init') {
      setSession((current) => ({ ...current, sessionId: event.sessionId, model: event.model, cwd: event.cwd }))
      return
    }
    if (event.kind === 'text_delta') {
      setStatus('streaming')
      setLive((current) => ({ ...current, text: current.text + event.text }))
      return
    }
    if (event.kind === 'thinking_delta') {
      setLive((current) => ({ ...current, thinking: current.thinking + event.text }))
      return
    }
    if (event.kind === 'assistant') {
      setLive(EMPTY_LIVE)
      if (!event.blocks.length) return
      setMessages((current) => upsertAssistantMessage(current, event.id, event.blocks))
      return
    }
    if (event.kind === 'tool_result') {
      setToolResults((current) => ({
        ...current,
        [event.toolUseId]: { content: event.content, isError: event.isError }
      }))
      return
    }
    if (event.kind === 'result') {
      setLastResult({
        costUsd: event.costUsd,
        durationMs: event.durationMs,
        numTurns: event.numTurns
      })
      if (!event.isError) return
      setError(event.result || 'the turn ended with an error')
      setStatus('error')
      return
    }
    if (event.kind === 'error') {
      setError(event.message)
      setStatus('error')
      return
    }
    if (event.kind === 'done') {
      setLive(EMPTY_LIVE)
      setStatus((current) => (current === 'error' ? 'error' : 'idle'))
    }
  }

  const send = async (text: string) => {
    if (busy) return

    const controller = new AbortController()
    abortRef.current = controller

    setMessages((current) => [...current, { id: newId(), role: 'user', text }])
    setError(null)
    setLastResult(null)
    setLive(EMPTY_LIVE)
    setStatus('thinking')

    try {
      await streamSend(text, handleEvent, controller.signal)
    } catch (err) {
      if (controller.signal.aborted) return
      setError(err instanceof Error ? err.message : String(err))
      setStatus('error')
    } finally {
      abortRef.current = null
      setLive(EMPTY_LIVE)
      setStatus((current) => (current === 'error' ? 'error' : 'idle'))
    }
  }

  const stop = () => abortRef.current?.abort()

  const reset = async () => {
    stop()
    await resetThread()
    setMessages([])
    setToolResults({})
    setLastResult(null)
    setError(null)
    setLive(EMPTY_LIVE)
    setSession((current) => ({ ...current, sessionId: null, model: null }))
    setStatus('idle')
  }

  return {
    messages,
    toolResults,
    live,
    status,
    session,
    lastResult,
    error,
    busy,
    scrollRef,
    handleScroll,
    send,
    stop,
    reset
  }
}
