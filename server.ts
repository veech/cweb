import { homedir } from "node:os";
import { join } from "node:path";
import index from "./src/index.html";
import {
  query,
  getSessionInfo,
  getSessionMessages,
  type SDKMessage,
  type Options,
  type PermissionResult,
} from "@anthropic-ai/claude-agent-sdk";
import type {
  Block,
  HistoryItem,
  HistoryResponse,
  ServerEvent,
  SessionResponse,
} from "./shared/protocol.ts";

// ---------------------------------------------------------------------------
// Config. Resolved once per `start()`; `cwd` is the directory cweb was run in,
// which is what gives the agent its context (CLAUDE.md, files, git) — just like
// the `claude` CLI.
// ---------------------------------------------------------------------------
export type StartOptions = {
  cwd?: string;
  port?: number;
  permissionMode?: NonNullable<Options["permissionMode"]>;
  model?: string;
  autoApprove?: boolean;
};

type Config = Required<Omit<StartOptions, "model">> & { model?: string };

let config: Config;

// Threads are stored centrally and keyed by absolute cwd, so every directory
// gets its own resumable thread.
const THREADS_FILE = join(homedir(), ".cweb", "threads.json");

// ---------------------------------------------------------------------------
// Per-directory session ("thread") persistence.
// ---------------------------------------------------------------------------
async function readThreads(): Promise<Record<string, string>> {
  const file = Bun.file(THREADS_FILE);
  if (!(await file.exists())) return {};
  try {
    return (await file.json()) ?? {};
  } catch {
    return {};
  }
}

async function readSessionId(): Promise<string | null> {
  return (await readThreads())[config.cwd] ?? null;
}

async function writeSessionId(sessionId: string | null): Promise<void> {
  const threads = await readThreads();
  if (sessionId) threads[config.cwd] = sessionId;
  else delete threads[config.cwd];
  await Bun.write(THREADS_FILE, JSON.stringify(threads, null, 2));
}

// ---------------------------------------------------------------------------
// Permission gate. Local single-user trust: tools are auto-approved. Set
// THREAD_AUTO_APPROVE=false to deny, or replace this with an interactive
// round-trip if you want per-tool prompts surfaced in the UI.
// ---------------------------------------------------------------------------
const canUseTool: NonNullable<Options["canUseTool"]> = (_toolName, input) =>
  Promise.resolve<PermissionResult>(
    config.autoApprove
      ? { behavior: "allow", updatedInput: input }
      : { behavior: "deny", message: "Auto-approval disabled (THREAD_AUTO_APPROVE=false)." },
  );

// ---------------------------------------------------------------------------
// SDKMessage -> ServerEvent[] normalization.
// ---------------------------------------------------------------------------
function normalize(msg: SDKMessage): ServerEvent[] {
  if (msg.type === "system" && msg.subtype === "init")
    return [
      { kind: "init", sessionId: msg.session_id, model: msg.model, cwd: msg.cwd, tools: msg.tools },
    ];

  if (msg.type === "stream_event") {
    const event = msg.event as { type?: string; delta?: Record<string, unknown> };
    if (event.type !== "content_block_delta" || !event.delta) return [];
    if (event.delta.type === "text_delta")
      return [{ kind: "text_delta", text: String(event.delta.text ?? "") }];
    if (event.delta.type === "thinking_delta")
      return [{ kind: "thinking_delta", text: String(event.delta.thinking ?? "") }];
    return [];
  }

  if (msg.type === "assistant") {
    const message = msg.message as { id: string; content: unknown };
    return [{ kind: "assistant", id: message.id, blocks: blocksFromContent(message.content) }];
  }

  if (msg.type === "user") return toolResultEvents((msg.message as { content: unknown }).content);

  if (msg.type === "result")
    return [
      {
        kind: "result",
        isError: msg.is_error,
        result: msg.subtype === "success" ? msg.result : msg.subtype,
        costUsd: msg.total_cost_usd ?? 0,
        durationMs: msg.duration_ms ?? 0,
        numTurns: msg.num_turns ?? 0,
      },
    ];

  return [];
}

function blocksFromContent(content: unknown): Block[] {
  if (typeof content === "string") return content ? [{ type: "text", text: content }] : [];
  if (!Array.isArray(content)) return [];
  const blocks: Block[] = [];
  for (const raw of content) {
    const b = raw as Record<string, unknown>;
    if (b.type === "text") blocks.push({ type: "text", text: String(b.text ?? "") });
    else if (b.type === "thinking") blocks.push({ type: "thinking", text: String(b.thinking ?? "") });
    else if (b.type === "tool_use")
      blocks.push({ type: "tool_use", id: String(b.id), name: String(b.name), input: b.input });
  }
  return blocks;
}

function toolResultEvents(content: unknown): ServerEvent[] {
  if (!Array.isArray(content)) return [];
  const events: ServerEvent[] = [];
  for (const raw of content) {
    const b = raw as Record<string, unknown>;
    if (b.type !== "tool_result") continue;
    events.push({
      kind: "tool_result",
      toolUseId: String(b.tool_use_id),
      content: stringifyToolContent(b.content),
      isError: Boolean(b.is_error),
    });
  }
  return events;
}

function stringifyToolContent(content: unknown): string {
  if (content == null) return "";
  if (typeof content === "string") return content;
  if (Array.isArray(content))
    return content
      .map((c: Record<string, unknown>) =>
        c.type === "text" ? String(c.text ?? "") : c.type === "image" ? "[image]" : JSON.stringify(c),
      )
      .join("\n");
  return JSON.stringify(content, null, 2);
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
async function handleSend(req: Request): Promise<Response> {
  const body = (await req.json().catch(() => ({}))) as { prompt?: string };
  const prompt = body.prompt?.trim();
  if (!prompt) return new Response("empty prompt", { status: 400 });

  const resume = (await readSessionId()) ?? undefined;
  const abortController = new AbortController();
  req.signal.addEventListener("abort", () => abortController.abort());

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: ServerEvent) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));

      let latest = resume ?? null;
      try {
        const turn = query({
          prompt,
          options: {
            resume,
            includePartialMessages: true,
            permissionMode: config.permissionMode,
            cwd: config.cwd,
            canUseTool,
            abortController,
            ...(config.model ? { model: config.model } : {}),
            ...(config.permissionMode === "bypassPermissions"
              ? { allowDangerouslySkipPermissions: true }
              : {}),
          },
        });

        for await (const msg of turn) {
          for (const event of normalize(msg)) send(event);
          const sid = (msg as { session_id?: string }).session_id;
          if (sid && sid !== latest) {
            latest = sid;
            await writeSessionId(sid);
          }
        }
        send({ kind: "done" });
      } catch (err) {
        if (!abortController.signal.aborted)
          send({ kind: "error", message: err instanceof Error ? err.message : String(err) });
      } finally {
        controller.close();
      }
    },
    cancel() {
      abortController.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

async function handleHistory(): Promise<Response> {
  const sessionId = await readSessionId();
  if (!sessionId) return Response.json({ sessionId: null, items: [] } satisfies HistoryResponse);

  let raw: Awaited<ReturnType<typeof getSessionMessages>>;
  try {
    raw = await getSessionMessages(sessionId, { dir: config.cwd });
  } catch {
    return Response.json({ sessionId, items: [] } satisfies HistoryResponse);
  }

  const items: HistoryItem[] = [];
  for (const entry of raw) {
    const content = (entry.message as { content?: unknown })?.content;
    if (entry.type === "assistant") {
      items.push({ role: "assistant", blocks: blocksFromContent(content) });
      continue;
    }
    if (entry.type !== "user") continue;

    const toolResults = toolResultEvents(content);
    if (toolResults.length) {
      for (const tr of toolResults)
        if (tr.kind === "tool_result")
          items.push({
            role: "tool_result",
            toolUseId: tr.toolUseId,
            content: tr.content,
            isError: tr.isError,
          });
      continue;
    }

    const text =
      typeof content === "string"
        ? content
        : blocksFromContent(content)
            .filter((b): b is Extract<Block, { type: "text" }> => b.type === "text")
            .map((b) => b.text)
            .join("");
    if (text.trim()) items.push({ role: "user", text });
  }

  return Response.json({ sessionId, items } satisfies HistoryResponse);
}

async function handleSession(): Promise<Response> {
  const sessionId = await readSessionId();
  let summary: string | null = null;
  if (sessionId) {
    try {
      summary = (await getSessionInfo(sessionId, { dir: config.cwd }))?.summary ?? null;
    } catch {
      summary = null;
    }
  }
  return Response.json({
    sessionId,
    cwd: config.cwd,
    permissionMode: config.permissionMode,
    summary,
  } satisfies SessionResponse);
}

async function handleReset(): Promise<Response> {
  await writeSessionId(null);
  return Response.json({ ok: true });
}

// ---------------------------------------------------------------------------
// Server bootstrap with port fallback (so cweb can run in several dirs at once).
// ---------------------------------------------------------------------------
export type StartResult = {
  url: string;
  port: number;
  cwd: string;
  permissionMode: string;
  model?: string;
  autoApprove: boolean;
};

export function start(options: StartOptions = {}): StartResult {
  config = {
    cwd: options.cwd ?? process.env.THREAD_CWD ?? process.cwd(),
    port: options.port ?? Number(process.env.PORT ?? 4242),
    permissionMode:
      options.permissionMode ??
      (process.env.THREAD_PERMISSION_MODE as Config["permissionMode"]) ??
      "default",
    model: options.model ?? (process.env.THREAD_MODEL || undefined),
    autoApprove: options.autoApprove ?? process.env.THREAD_AUTO_APPROVE !== "false",
  };

  const serveOptions = {
    development: { hmr: true, console: true },
    routes: {
      "/": index,
      "/api/session": { GET: handleSession },
      "/api/history": { GET: handleHistory },
      "/api/send": { POST: handleSend },
      "/api/reset": { POST: handleReset },
    },
    fetch() {
      return new Response("Not found", { status: 404 });
    },
  } as const;

  let server: ReturnType<typeof Bun.serve>;
  try {
    server = Bun.serve({ port: config.port, ...serveOptions });
  } catch {
    // Preferred port busy (another cweb, etc.) — grab any free port.
    server = Bun.serve({ port: 0, ...serveOptions });
  }
  const port = server.port ?? config.port;
  config.port = port;

  return {
    url: `http://localhost:${port}`,
    port,
    cwd: config.cwd,
    permissionMode: config.permissionMode,
    model: config.model,
    autoApprove: config.autoApprove,
  };
}
