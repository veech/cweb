import type { Block } from "../../shared/protocol.ts";
import type { ThreadMessage, ToolResult } from "../lib/thread.ts";
import { ToolBlock } from "./ToolBlock.tsx";

type Props = {
  message: ThreadMessage;
  toolResults: Record<string, ToolResult>;
};

export function Message({ message, toolResults }: Props) {
  if (message.role === "user")
    return (
      <article className="turn turn--user">
        <div className="turn__gutter">you</div>
        <div className="turn__body">
          <div className="user-text">{message.text}</div>
        </div>
      </article>
    );

  return (
    <article className="turn turn--assistant">
      <div className="turn__gutter">claude</div>
      <div className="turn__body">
        {message.blocks.map((block, idx) => (
          <BlockView key={idx} block={block} toolResults={toolResults} />
        ))}
      </div>
    </article>
  );
}

function BlockView({
  block,
  toolResults,
}: {
  block: Block;
  toolResults: Record<string, ToolResult>;
}) {
  if (block.type === "text") return <div className="prose">{block.text}</div>;

  if (block.type === "thinking")
    return (
      <div className="thinking">
        <span className="thinking__label">thinking</span>
        {block.text}
      </div>
    );

  return <ToolBlock name={block.name} input={block.input} result={toolResults[block.id]} />;
}
