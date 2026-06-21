import { useEffect, useRef, useState, type KeyboardEvent } from "react";

type Props = {
  busy: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
};

export function Composer({ busy, onSend, onStop }: Props) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  // Auto-grow the textarea to fit its content.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  const submit = () => {
    const text = value.trim();
    if (!text || busy) return;
    onSend(text);
    setValue("");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="composer">
      <div className="composer__inner">
        <textarea
          ref={ref}
          value={value}
          rows={1}
          placeholder="Ask Claude about this directory…"
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          autoFocus
        />
        {busy ? (
          <button className="composer__send composer__send--stop" onClick={onStop} type="button" title="Stop">
            ■
          </button>
        ) : (
          <button
            className="composer__send"
            onClick={submit}
            disabled={!value.trim()}
            type="button"
            title="Send"
          >
            ↑
          </button>
        )}
      </div>
      <div className="composer__hint">
        <span>
          <kbd>Enter</kbd> send · <kbd>Shift</kbd>+<kbd>Enter</kbd> newline
        </span>
        <span>{busy ? "working…" : ""}</span>
      </div>
    </div>
  );
}
