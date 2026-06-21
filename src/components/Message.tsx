import type { ReactNode } from "react";
import type { Block } from "../../shared/protocol.ts";
import type { ThreadMessage, ToolResult } from "../lib/thread.ts";
import { ToolBlock } from "./ToolBlock.tsx";

interface Props {
  message: ThreadMessage;
  toolResults: Record<string, ToolResult>;
}

// Shared atoms — reused by the live streaming draft in Thread.tsx so the
// in-flight turn renders identically to a settled one.
export const proseClass = "whitespace-pre-wrap break-words text-[15px] leading-7 text-foreground";

interface RoleLabelProps {
  children: ReactNode;
}

export function RoleLabel(props: RoleLabelProps) {
  const { children } = props;
  return <div className="text-xs font-medium text-muted-foreground">{children}</div>;
}

// Assistant prose with an optional blinking caret — used for the live draft and
// the pending-turn placeholder while a turn is in flight.
interface ProseLiveProps {
  text: string;
  caret?: boolean;
}

export function ProseLive(props: ProseLiveProps) {
  const { text, caret } = props;
  return (
    <div className={proseClass}>
      {text}
      {caret && (
        <span className="ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[2px] animate-caret bg-foreground align-text-bottom" />
      )}
    </div>
  );
}

interface ThinkingBlockProps {
  text: string;
}

export function ThinkingBlock(props: ThinkingBlockProps) {
  const { text } = props;
  return (
    <div className="whitespace-pre-wrap break-words border-l-2 border-dashed border-border pl-3 text-xs leading-relaxed text-muted-foreground">
      <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
        thinking
      </div>
      {text}
    </div>
  );
}

export function Message(props: Props) {
  const { message, toolResults } = props;
  if (message.role === "user")
    return (
      <div className="flex flex-col gap-1.5">
        <RoleLabel>you</RoleLabel>
        <div className="whitespace-pre-wrap break-words border-l-2 border-border pl-3 text-sm text-muted-foreground">
          {message.text}
        </div>
      </div>
    );

  return (
    <div className="flex flex-col gap-2">
      <RoleLabel>claude</RoleLabel>
      <div className="flex flex-col gap-3">
        {message.blocks.map((block, idx) => (
          <BlockView key={idx} block={block} toolResults={toolResults} />
        ))}
      </div>
    </div>
  );
}

interface BlockViewProps {
  block: Block;
  toolResults: Record<string, ToolResult>;
}

function BlockView(props: BlockViewProps) {
  const { block, toolResults } = props;
  if (block.type === "text") return <div className={proseClass}>{block.text}</div>;

  if (block.type === "thinking") return <ThinkingBlock text={block.text} />;

  return <ToolBlock name={block.name} input={block.input} result={toolResults[block.id]} />;
}
