# cweb

A browser UI for a [Claude Code](https://code.claude.com) thread, scoped to a
directory. Run `cweb` inside any folder — the agent gets that folder as its
context (its `CLAUDE.md`, files, git), exactly like the `claude` CLI — but you
chat with it in a browser instead of the terminal.

```
cweb              # start a thread for the current directory
cweb ~/code/api   # ...or for a specific directory
```

It boots a local server, pretty-prints the URL, and opens your browser. Each
directory has its own resumable thread.

## How it works

- **`cli.ts`** — the `cweb` bin: resolves the target directory, starts the
  server, prints the banner, opens the browser.
- **`server.ts`** — a [Bun](https://bun.sh) fullstack server. It drives one
  Claude Code session per directory via `@anthropic-ai/claude-agent-sdk`
  (`query({ resume })`), normalizes the SDK message stream into a small wire
  protocol, and streams it to the browser over SSE.
- **`src/`** — a React UI (single-process, bundled by Bun with HMR): a thread
  view that renders streamed text, thinking, and collapsible tool calls.
- **`~/.cweb/threads.json`** — maps each directory to its session id, so a
  thread resumes the next time you run `cweb` there. Full transcripts live in
  Claude Code's own session storage.

## Install (global)

Requires [Bun](https://bun.sh) and a working Claude Code login.

```bash
bun install
bun link        # registers the `cweb` command on your PATH (~/.bun/bin)
```

Now `cweb` works from any directory.

## Develop

```bash
bun run dev     # bun --hot cli.ts — server reload + client HMR
```

## Configuration

| Env                      | Default       | Description                                                            |
| ------------------------ | ------------- | --------------------------------------------------------------------- |
| `PORT`                   | `4242`        | Preferred port; falls back to a free port if busy.                    |
| `THREAD_MODEL`           | account default | Model id to use.                                                     |
| `THREAD_PERMISSION_MODE` | `default`     | `default` · `acceptEdits` · `bypassPermissions` · `plan` · `dontAsk` · `auto` |
| `THREAD_AUTO_APPROVE`    | `true`        | Set `false` to deny tools instead of auto-approving.                  |
| `THREAD_NO_OPEN`         | unset         | Set `1` to not open the browser.                                      |

## Security note

This is a **local, single-user** tool. By default it auto-approves every tool
call the agent makes (reads, edits, shell commands) in the target directory —
the same trust model as running `claude` yourself. The permission gate lives in
one place (`canUseTool` in `server.ts`); tighten it, or set
`THREAD_AUTO_APPROVE=false`, if you want a stricter posture. Don't expose the
server beyond localhost.
