import type { Ref } from "react";
import type { Status, ThreadMessage, ToolResult } from "../lib/thread.ts";
import { formatCost, formatDuration } from "../lib/thread.ts";
import { Message } from "./Message.tsx";

type LiveDraft = { text: string; thinking: string };
type ResultMeta = { costUsd: number; durationMs: number; numTurns: number } | null;

type Props = {
  scrollRef: Ref<HTMLDivElement>;
  messages: ThreadMessage[];
  toolResults: Record<string, ToolResult>;
  live: LiveDraft;
  status: Status;
  lastResult: ResultMeta;
  error: string | null;
};

export function Thread({ scrollRef, messages, toolResults, live, status, lastResult, error }: Props) {
  const busy = status === "thinking" || status === "streaming";
  const hasLive = busy && (live.text.length > 0 || live.thinking.length > 0);
  const empty = messages.length === 0 && !hasLive && !error;

  return (
    <div className="thread" ref={scrollRef}>
      <div className="thread__inner">
        {empty && (
          <div className="hero">
            <div className="hero__glyph">◆</div>
            <div className="hero__title">A thread, scoped to this directory.</div>
            <div className="hero__sub">ask anything · claude has the full context</div>
          </div>
        )}

        {messages.map((m) => (
          <Message key={m.id} message={m} toolResults={toolResults} />
        ))}

        {hasLive && (
          <article className="turn turn--assistant">
            <div className="turn__gutter">claude</div>
            <div className="turn__body">
              {live.thinking && (
                <div className="thinking">
                  <span className="thinking__label">thinking</span>
                  {live.thinking}
                </div>
              )}
              <div className="prose">
                {live.text}
                <span className="caret" />
              </div>
            </div>
          </article>
        )}

        {busy && !hasLive && (
          <article className="turn turn--assistant">
            <div className="turn__gutter">claude</div>
            <div className="turn__body">
              <div className="prose">
                <span className="caret" />
              </div>
            </div>
          </article>
        )}

        {!busy && lastResult && (
          <div className="result-line">
            <span>
              <b>{formatCost(lastResult.costUsd)}</b>
            </span>
            <span>
              <b>{formatDuration(lastResult.durationMs)}</b>
            </span>
            <span>
              <b>{lastResult.numTurns}</b> turns
            </span>
          </div>
        )}

        {error && <div className="error-banner">{error}</div>}
      </div>
    </div>
  );
}
