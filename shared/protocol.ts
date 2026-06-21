// Normalized wire protocol shared by the Bun server and the browser client.
// The server collapses the rich Agent SDK message union into these few shapes
// so the UI never has to know about the full SDKMessage surface.

export type Block =
  | { type: "text"; text: string }
  | { type: "thinking"; text: string }
  | { type: "tool_use"; id: string; name: string; input: unknown };

// Server -> client, one per SSE `data:` frame during a turn.
export type ServerEvent =
  | { kind: "init"; sessionId: string; model: string; cwd: string; tools: string[] }
  | { kind: "text_delta"; text: string }
  | { kind: "thinking_delta"; text: string }
  | { kind: "assistant"; id: string; blocks: Block[] }
  | { kind: "tool_result"; toolUseId: string; content: string; isError: boolean }
  | {
      kind: "result";
      isError: boolean;
      result: string;
      costUsd: number;
      durationMs: number;
      numTurns: number;
    }
  | { kind: "error"; message: string }
  | { kind: "done" };

// GET /api/history payload, used to rehydrate the thread on load.
export type HistoryItem =
  | { role: "user"; text: string }
  | { role: "assistant"; blocks: Block[] }
  | { role: "tool_result"; toolUseId: string; content: string; isError: boolean };

export type HistoryResponse = {
  sessionId: string | null;
  items: HistoryItem[];
};

// GET /api/session payload.
export type SessionResponse = {
  sessionId: string | null;
  cwd: string;
  permissionMode: string;
  summary: string | null;
};
