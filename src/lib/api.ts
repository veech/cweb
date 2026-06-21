import type { HistoryResponse, ServerEvent, SessionResponse } from '../../shared/protocol.ts'

export async function fetchSession(): Promise<SessionResponse> {
  const res = await fetch('/api/session')
  return res.json()
}

export async function fetchHistory(): Promise<HistoryResponse> {
  const res = await fetch('/api/history')
  return res.json()
}

export async function resetThread(): Promise<void> {
  await fetch('/api/reset', { method: 'POST' })
}

// POST a prompt and stream normalized ServerEvents back over SSE.
export async function streamSend(prompt: string, onEvent: (event: ServerEvent) => void, signal: AbortSignal): Promise<void> {
  const res = await fetch('/api/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
    signal
  })

  if (!res.ok || !res.body) {
    onEvent({ kind: 'error', message: `server responded ${res.status}` })
    return
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    let sep: number
    while ((sep = buffer.indexOf('\n\n')) !== -1) {
      const frame = buffer.slice(0, sep)
      buffer = buffer.slice(sep + 2)
      const line = frame.split('\n').find((l) => l.startsWith('data:'))
      if (!line) continue
      try {
        onEvent(JSON.parse(line.slice(5).trim()) as ServerEvent)
      } catch {
        // ignore malformed frame
      }
    }
  }
}
