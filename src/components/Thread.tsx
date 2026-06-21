import type { Ref, UIEventHandler } from "react";
import type { Status, ThreadMessage, ToolResult } from "../lib/thread.ts";
import { formatCost, formatDuration } from "../lib/thread.ts";
import { Message, ProseLive, RoleLabel, ThinkingBlock } from "./Message.tsx";

type LiveDraft = { text: string; thinking: string };
type ResultMeta = { costUsd: number; durationMs: number; numTurns: number } | null;

interface Props {
  scrollRef: Ref<HTMLDivElement>;
  onScroll: UIEventHandler<HTMLDivElement>;
  messages: ThreadMessage[];
  toolResults: Record<string, ToolResult>;
  live: LiveDraft;
  status: Status;
  lastResult: ResultMeta;
  error: string | null;
}

export function Thread(props: Props) {
  const { scrollRef, onScroll, messages, toolResults, live, status, lastResult, error } = props;
  const busy = status === "thinking" || status === "streaming";
  const hasLive = busy && (live.text.length > 0 || live.thinking.length > 0);
  const empty = messages.length === 0 && !hasLive && !error;

  return (
    <div ref={scrollRef} onScroll={onScroll} className="overflow-y-auto scrollbar-thin">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 pb-24 pt-10">
        {empty && (
          <div className="m-auto py-20 text-center">
            <div className="text-2xl text-primary/80">◆</div>
            <div className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
              A thread, scoped to this directory.
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              ask anything · claude has the full context
            </div>
          </div>
        )}

        {messages.map((m) => (
          <Message key={m.id} message={m} toolResults={toolResults} />
        ))}

        {hasLive && (
          <div className="flex flex-col gap-2">
            <RoleLabel>claude</RoleLabel>
            <div className="flex flex-col gap-3">
              {live.thinking && <ThinkingBlock text={live.thinking} />}
              <ProseLive text={live.text} caret />
            </div>
          </div>
        )}

        {busy && !hasLive && (
          <div className="flex flex-col gap-2">
            <RoleLabel>claude</RoleLabel>
            <ProseLive text="" caret />
          </div>
        )}

        {!busy && lastResult && (
          <div className="flex gap-4 pt-1 font-mono text-[11px] text-muted-foreground">
            <span>
              <b className="font-medium text-foreground/80">{formatCost(lastResult.costUsd)}</b>
            </span>
            <span>
              <b className="font-medium text-foreground/80">
                {formatDuration(lastResult.durationMs)}
              </b>
            </span>
            <span>
              <b className="font-medium text-foreground/80">{lastResult.numTurns}</b> turns
            </span>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
