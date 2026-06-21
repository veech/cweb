import { useState } from "react";
import type { ToolResult } from "../lib/thread.ts";
import { formatInput, toolSummary } from "../lib/thread.ts";

type Props = {
  name: string;
  input: unknown;
  result: ToolResult | undefined;
};

export function ToolBlock({ name, input, result }: Props) {
  const [open, setOpen] = useState(false);
  const running = !result;
  const error = result?.isError ?? false;

  const cls = error ? "tool tool--error" : running ? "tool tool--running" : "tool";

  return (
    <div className={cls}>
      <button className="tool__head" onClick={() => setOpen((o) => !o)} type="button">
        <span className="tool__glyph">{error ? "✕" : running ? "◌" : "⛯"}</span>
        <span className="tool__name">{name}</span>
        <span className="tool__summary">{toolSummary(name, input)}</span>
        <span className={open ? "tool__chevron tool__chevron--open" : "tool__chevron"}>▸</span>
      </button>

      {open && (
        <div className="tool__body">
          <div>
            <div className="tool__section-label">input</div>
            <pre className="code">{formatInput(input)}</pre>
          </div>
          {result && (
            <div>
              <div className="tool__section-label">{error ? "error" : "result"}</div>
              <pre className={error ? "code code--error" : "code code--result"}>
                {result.content || "(empty)"}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
