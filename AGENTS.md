# AGENTS.md

Guidelines for AI agents working on this codebase.

## Project Overview

cweb is a browser UI for a [Claude Code](https://code.claude.com) thread, scoped to a
directory. Running `cweb` in a folder boots a local Bun server that drives one Claude Code
session for that directory (via `@anthropic-ai/claude-agent-sdk`), normalizes the SDK
message stream into a small wire protocol, and streams it to a React UI in the browser over
SSE. Each directory has its own resumable thread.

## Tech Stack

- **Runtime / Server**: Bun (fullstack server, SSE streaming)
- **Frontend**: React 19, Tailwind CSS v4, shadcn/ui (Radix primitives), lucide-react
- **Agent**: `@anthropic-ai/claude-agent-sdk`
- **Language**: TypeScript

## Project Structure

```
cli.ts                # `cweb` bin: resolves the target dir, starts the server, opens the browser
server.ts             # Bun fullstack server: drives the Claude Code session, streams over SSE
shared/
  protocol.ts         # wire protocol types shared by the server and the client
src/
  App.tsx             # root component
  main.tsx            # client entry
  index.html          # HTML entry (bundled by Bun)
  index.css           # Tailwind styles
  components/         # React components (Thread, Message, Composer, ToolBlock, Diff, StatusBar)
    ui/               # shadcn/ui primitives
  lib/                # client helpers (api, thread, diff, utils)
~/.cweb/threads.json  # maps each directory to its resumable session id
```

## Development Commands

```bash
bun run dev        # bun --hot cli.ts — server reload + client HMR
bun run start      # bun cli.ts — start without hot reload
bun run typecheck  # tsc --noEmit
bun link           # register the `cweb` command on your PATH (~/.bun/bin)
```

## Code Style

- Prefer functional components
- Use named exports
- Avoid using else if possible
- Short circuit functions when possible
- Short circuit loops when possible
- Avoid nested ifs
- Entry point functions should come first, followed by helper functions used by them below

## Git

Use [Conventional Commits](https://www.conventionalcommits.org/) for all commit messages.

### Format

```
<type>: <description>
```

Keep commits to a single line (no body or footer). Ignore adding co-authors to commits.

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Formatting, missing semicolons, etc.
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `perf`: Performance improvement
- `test`: Adding or updating tests
- `chore`: Maintenance tasks, dependencies, etc.

### Commit Granularity

When committing changes, break work into logical, atomic commits. Each commit should represent a single coherent unit of change — don't bundle unrelated changes into one commit.

Split commits by feature and by backend vs frontend. For a given feature, commit the backend changes (server, protocol, etc.) first, then the frontend changes (components, UI, etc.) in a separate commit. If a task involves multiple features, repeat this pattern for each. Prefer committing as you go rather than squashing everything at the end.

### Examples

```
feat: add browser chat UI
fix: correct SSE reconnect handling
refactor: simplify the wire protocol
chore: bump @anthropic-ai/claude-agent-sdk
```

## Testing

No test suite yet.

## Common Patterns

### Wire protocol

The server collapses the rich Agent SDK message union into the few narrow shapes defined in
`shared/protocol.ts` so the UI never has to know about the full `SDKMessage` surface. When
adding a new server-to-client signal, extend the protocol types in `shared/protocol.ts`
first, then handle the new shape on both the server (`server.ts`) and the client.

### Permission gate

The single place that decides whether the agent may run a tool is `canUseTool` in
`server.ts`. Keep permission logic there rather than scattering it across the codebase.

## Important Notes
