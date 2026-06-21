import { useState } from "react";
import { Check, ChevronRight, LoaderCircle, X } from "lucide-react";
import type { ToolResult } from "../lib/thread.ts";
import { cn } from "../lib/utils.ts";
import { formatInput, toolSummary } from "../lib/thread.ts";

type Props = {
  name: string;
  input: unknown;
  result: ToolResult | undefined;
};

const codeBase =
  "max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-md border border-border bg-muted/40 p-2.5 font-mono text-xs leading-relaxed scrollbar-thin";

export function ToolBlock({ name, input, result }: Props) {
  const [open, setOpen] = useState(false);
  const running = !result;
  const error = result?.isError ?? false;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border bg-card shadow-sm",
        error ? "border-destructive/40" : "border-border",
      )}
    >
      <button
        className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs transition-colors hover:bg-accent"
        onClick={() => setOpen((o) => !o)}
        type="button"
      >
        {running ? (
          <LoaderCircle className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
        ) : error ? (
          <X className="size-3.5 shrink-0 text-destructive" />
        ) : (
          <Check className="size-3.5 shrink-0 text-muted-foreground" />
        )}
        <span className="font-medium text-foreground">{name}</span>
        <span className="min-w-0 flex-1 truncate font-mono text-muted-foreground">
          {toolSummary(name, input)}
        </span>
        <ChevronRight
          className={cn(
            "size-3.5 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-90",
          )}
        />
      </button>

      {open && (
        <div className="flex flex-col gap-3 border-t border-border px-3 py-3 duration-200 animate-in fade-in slide-in-from-top-1">
          <div>
            <SectionLabel>input</SectionLabel>
            <pre className={cn(codeBase, "text-muted-foreground")}>{formatInput(input)}</pre>
          </div>
          {result && (
            <div>
              <SectionLabel>{error ? "error" : "result"}</SectionLabel>
              <pre
                className={cn(
                  codeBase,
                  error
                    ? "border-destructive/30 bg-destructive/10 text-destructive"
                    : "text-foreground/80",
                )}
              >
                {result.content || "(empty)"}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
      {children}
    </div>
  );
}
