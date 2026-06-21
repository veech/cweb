import { useEffect, useRef, useState } from "react";
import type { ServerEvent } from "../shared/protocol.ts";
import { fetchHistory, fetchSession, resetThread, streamSend } from "./lib/api.ts";
import type { Status, ThreadMessage, ToolResult } from "./lib/thread.ts";
import { newId } from "./lib/thread.ts";
import { StatusBar } from "./components/StatusBar.tsx";
import { Thread } from "./components/Thread.tsx";
import { Composer } from "./components/Composer.tsx";

type Session = {
  sessionId: string | null;
  model: string | null;
  cwd: string | null;
  permissionMode: string | null;
};

type ResultMeta = { costUsd: number; durationMs: number; numTurns: number } | null;

export function App() {
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [toolResults, setToolResults] = useState<Record<string, ToolResult>>({});
  const [live, setLive] = useState({ text: "", thinking: "" });
  const [status, setStatus] = useState<Status>("idle");
  const [session, setSession] = useState<Session>({
    sessionId: null,
    model: null,
    cwd: null,
    permissionMode: null,
  });
  const [lastResult, setLastResult] = useState<ResultMeta>(null);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const busy = status === "thinking" || status === "streaming";

  // Initial load: session metadata + prior thread.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [s, h] = await Promise.all([fetchSession(), fetchHistory()]);
      if (cancelled) return;
      setSession({
        sessionId: s.sessionId,
        cwd: s.cwd,
        permissionMode: s.permissionMode,
        model: null,
      });

      const restored: ThreadMessage[] = [];
      const results: Record<string, ToolResult> = {};
      for (const item of h.items) {
        if (item.role === "user") restored.push({ id: newId(), role: "user", text: item.text });
        else if (item.role === "assistant")
          restored.push({ id: newId(), role: "assistant", blocks: item.blocks });
        else results[item.toolUseId] = { content: item.content, isError: item.isError };
      }
      setMessages(restored);
      setToolResults(results);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Keep pinned to the latest content.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, live, status]);

  const handleEvent = (event: ServerEvent) => {
    if (event.kind === "init") {
      setSession((s) => ({ ...s, sessionId: event.sessionId, model: event.model, cwd: event.cwd }));
      return;
    }
    if (event.kind === "text_delta") {
      setStatus("streaming");
      setLive((l) => ({ ...l, text: l.text + event.text }));
      return;
    }
    if (event.kind === "thinking_delta") {
      setLive((l) => ({ ...l, thinking: l.thinking + event.text }));
      return;
    }
    if (event.kind === "assistant") {
      if (event.blocks.length)
        setMessages((m) => [...m, { id: event.id || newId(), role: "assistant", blocks: event.blocks }]);
      setLive({ text: "", thinking: "" });
      return;
    }
    if (event.kind === "tool_result") {
      setToolResults((t) => ({
        ...t,
        [event.toolUseId]: { content: event.content, isError: event.isError },
      }));
      return;
    }
    if (event.kind === "result") {
      setLastResult({
        costUsd: event.costUsd,
        durationMs: event.durationMs,
        numTurns: event.numTurns,
      });
      if (event.isError) {
        setError(event.result || "the turn ended with an error");
        setStatus("error");
      }
      return;
    }
    if (event.kind === "error") {
      setError(event.message);
      setStatus("error");
      return;
    }
    if (event.kind === "done") {
      setLive({ text: "", thinking: "" });
      setStatus((s) => (s === "error" ? "error" : "idle"));
    }
  };

  const send = async (text: string) => {
    if (busy) return;
    const controller = new AbortController();
    abortRef.current = controller;

    setMessages((m) => [...m, { id: newId(), role: "user", text }]);
    setError(null);
    setLastResult(null);
    setLive({ text: "", thinking: "" });
    setStatus("thinking");

    try {
      await streamSend(text, handleEvent, controller.signal);
    } catch (err) {
      if (!controller.signal.aborted) {
        setError(err instanceof Error ? err.message : String(err));
        setStatus("error");
      }
    } finally {
      abortRef.current = null;
      setLive({ text: "", thinking: "" });
      setStatus((s) => (s === "error" ? "error" : "idle"));
    }
  };

  const stop = () => abortRef.current?.abort();

  const reset = async () => {
    stop();
    await resetThread();
    setMessages([]);
    setToolResults({});
    setLastResult(null);
    setError(null);
    setLive({ text: "", thinking: "" });
    setSession((s) => ({ ...s, sessionId: null, model: null }));
    setStatus("idle");
  };

  return (
    <div className="app">
      <StatusBar
        cwd={session.cwd}
        model={session.model}
        permissionMode={session.permissionMode}
        sessionId={session.sessionId}
        status={status}
        onReset={reset}
      />
      <Thread
        scrollRef={scrollRef}
        messages={messages}
        toolResults={toolResults}
        live={live}
        status={status}
        lastResult={lastResult}
        error={error}
      />
      <Composer busy={busy} onSend={send} onStop={stop} />
    </div>
  );
}
