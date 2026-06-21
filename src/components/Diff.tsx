import type { DiffHunk, DiffLine } from "../lib/diff.ts";
import { cn } from "../lib/utils.ts";

// Renders one or more diff hunks as a GitHub-style unified diff: a +/- gutter
// and tinted rows. Long lines wrap; tall diffs scroll within a bounded box.
// `flush` drops the rounded border so the diff can fill its container edge to
// edge (used when the diff *is* the expanded tool panel).
export function DiffView({ hunks, flush = false }: { hunks: DiffHunk[]; flush?: boolean }) {
  return (
    <div
      className={cn(
        "max-h-96 overflow-auto bg-muted/40 py-1 font-mono text-xs leading-relaxed scrollbar-thin",
        flush
          ? "border-t border-border"
          : "rounded-md border border-border",
      )}
    >
      {hunks.map((hunk, hi) => (
        <div
          key={hi}
          className={cn(hi > 0 && "border-t border-dashed border-border/70")}
        >
          {hunk.lines.map((line, li) => (
            <DiffRow key={li} line={line} />
          ))}
        </div>
      ))}
    </div>
  );
}

function DiffRow({ line }: { line: DiffLine }) {
  const sign = line.type === "add" ? "+" : line.type === "del" ? "-" : "";
  return (
    <div
      className={cn(
        "flex",
        line.type === "add" && "bg-emerald-500/10",
        line.type === "del" && "bg-red-500/10",
      )}
    >
      <span
        className={cn(
          "w-6 shrink-0 select-none text-center",
          line.type === "add" && "text-emerald-400",
          line.type === "del" && "text-red-400",
          line.type === "context" && "text-muted-foreground/40",
        )}
      >
        {sign}
      </span>
      <span
        className={cn(
          "min-w-0 flex-1 whitespace-pre-wrap break-words pr-2",
          line.type === "add" && "text-emerald-200",
          line.type === "del" && "text-red-200",
          line.type === "context" && "text-foreground/70",
        )}
      >
        {line.text || " "}
      </span>
    </div>
  );
}
