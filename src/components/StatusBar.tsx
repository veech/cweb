import type { Status } from "../lib/thread.ts";

type Props = {
  cwd: string | null;
  model: string | null;
  permissionMode: string | null;
  sessionId: string | null;
  status: Status;
  onReset: () => void;
};

const STATUS_LABEL: Record<Status, string> = {
  idle: "ready",
  thinking: "thinking",
  streaming: "streaming",
  error: "error",
};

export function StatusBar({ cwd, model, permissionMode, sessionId, status, onReset }: Props) {
  const dotClass =
    status === "error" ? "dot dot--error" : status === "idle" ? "dot dot--idle" : "dot dot--busy";
  const dir = cwd ? cwd.split("/").filter(Boolean).slice(-2).join("/") : "—";

  return (
    <header className="statusbar">
      <span className="statusbar__mark">
        <span className="statusbar__diamond">◆</span>
        cweb
      </span>

      <span className="statusbar__meta">
        <span>
          <b>dir</b> {dir}
        </span>
        {model && (
          <span>
            <b>model</b> {model}
          </span>
        )}
        {permissionMode && (
          <span>
            <b>perm</b> {permissionMode}
          </span>
        )}
        {sessionId && (
          <span>
            <b>thread</b> {sessionId.slice(0, 8)}
          </span>
        )}
      </span>

      <span className="statusbar__spacer" />

      <span className="statusbar__status">
        <span className={dotClass} />
        {STATUS_LABEL[status]}
      </span>

      <button className="statusbar__reset" onClick={onReset} type="button">
        new thread
      </button>
    </header>
  );
}
