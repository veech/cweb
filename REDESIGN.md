# cweb redesign — handoff

## Project context
- **Stack:** React 19 + TypeScript, bundled/served by **Bun's own bundler** (no Vite/webpack/PostCSS). `server.ts` does `import index from "./src/index.html"` and `Bun.serve({ routes: { "/": index } })`; Bun transpiles the HTML's `<script>` and CSS imports.
- **Run:** `bun --hot cli.ts` (dev) / `bun cli.ts` (start). Default port 4242. Use `PORT=xxxx THREAD_NO_OPEN=1 bun cli.ts --no-open` for a throwaway test server.
- Path root: `/home/ale/Workspace/cweb`

## Decisions locked in
- **Tailwind v4** compiled by Bun via `bun-plugin-tailwind` (not Vite). **shadcn** added manually (CLI has no Bun preset; `bunx shadcn@latest add <c>` works for new components now that config exists).
- **Keep the default shadcn neutral theme** — do NOT customize to warm/stone for now.
- **Dark mode** wanted: add `class="dark"` to `<html>` in `src/index.html` (not done yet).

## DONE + verified (foundation)
- Installed: `tailwindcss`, `bun-plugin-tailwind`, `tw-animate-css` (dev); `clsx`, `tailwind-merge`, `class-variance-authority`, `lucide-react`, `@radix-ui/react-slot`.
- `bunfig.toml` → registers Tailwind plugin under `[serve.static]`.
- `src/index.css` → `@import "tailwindcss"` + full shadcn neutral theme (`:root`/`.dark` tokens, `@theme inline`, base layer).
- `src/lib/utils.ts` → `cn()`. `components.json` → new-york, neutral, `@/` aliases.
- `src/components/ui/button.tsx` → first shadcn component.
- `tsconfig.json` → `paths: { "@/*": ["./src/*"] }` (no `baseUrl` — it's deprecated in TS6 and errors).
- `src/main.tsx` → imports `./index.css` **before** `./styles.css`.
- **Verified against live bundler:** Tailwind compiles (preflight + utilities + tokens in served CSS), source-scanning works, `@/` alias resolves in both `tsc` and `bun build`. Typecheck clean.

## DONE + verified — the UI migration
Rebuilt every browser component on Tailwind + shadcn (default neutral, **dark mode**, clean/minimal aesthetic, sans-serif throughout — no grain/glow). Behavior preserved; only styling changed. Legacy `src/styles.css` removed (import dropped from `main.tsx`, file deleted).

**Design choices (locked with the user):**
- **Clean shadcn** structure — flat, Inter (sans) + JetBrains Mono (code/chrome). No serif, no grain, no ember.
- **One subtle accent**: green (`emerald-500`) = ready dot, **indigo** pulsing dot = busy, `destructive` (red) = error, `foreground` caret.
- `<html class="dark">` set in `src/index.html`; fonts swapped to Inter + JetBrains Mono.
- `src/index.css`: added `@theme` font tokens (`--font-sans`/`--font-mono`), `caret-blink` keyframe + `.animate-caret`, and a `.scrollbar-thin` utility (neutral webkit/firefox scrollbars).

**Linear-feel pass (on top of the above):**
- Retuned the `.dark` tokens in `src/index.css` to a **Linear palette**: cool near-black canvas (`--background: #08090a`), elevated surfaces (`--card: #141517`), **indigo brand accent** (`--primary`/`--ring: #5e6ad2`), cool-gray secondary text (`--muted-foreground: #8a8f98`), crisp low-contrast borders (`rgba(255,255,255,0.09)`), Linear red (`--destructive: #eb5757`). Light `:root` left untouched (app is force-dark).
- Body `letter-spacing: -0.011em` + indigo `::selection`. Brand ◆ and hero glyph use the indigo accent; headings/brand get `tracking-tight`.
- Indigo send button with **depth** (inset top-highlight + soft drop shadow), `rounded-lg`; composer `rounded-xl` with indigo focus ring; refined `kbd` keys (`bg-secondary`, subtle shadow); tool cards get `shadow-sm` for subtle elevation.
- Accent usage is deliberately sparing (interactive elements + brand) — palette/typography/borders carry the rest.

**Components (all rewritten with Tailwind utilities):**
- `src/App.tsx` — shell is now `grid h-full grid-rows-[auto_1fr_auto]`. Scroll-pin logic untouched (`scrollRef`/`pinnedRef`/`onScroll`); the `scrollRef` div now lives in `Thread.tsx`.
- `StatusBar.tsx` — ◆ mark, dir/model/perm/thread meta, status dot + label, ghost **New thread** button (lucide `Plus`).
- `Composer.tsx` — native auto-grow textarea (kept), shadcn `Button` send (lucide `ArrowUp`) / stop (`Square` filled, destructive). Enter=send / Shift+Enter=newline preserved.
- `Thread.tsx` — owns the scroll div; hero/empty state, live streaming draft + caret, result line, error banner.
- `Message.tsx` — exports shared atoms reused by the live draft: `RoleLabel`, `ProseLive` (prose + blinking caret), `ThinkingBlock`, `proseClass`.
- `ToolBlock.tsx` — collapsible card; lucide status icon (`LoaderCircle` spin / `Check` / `X`), `ChevronRight` rotates open, `animate-in` reveal.
- Helpers in `src/lib/thread.ts` reused as-is.
- **No new shadcn components needed** — only the existing `Button`. Skipped `textarea`/`card`/`scroll-area`/`separator` (native textarea keeps the auto-grow ref; native scroll keeps the pin-to-bottom logic; utilities cover card/separator).

**Verified:** `tsc --noEmit` clean; live bundler compiles all new utilities into served CSS; rendered screenshots of the restored thread (statusbar / user / assistant prose / thinking / completed tool card / composer) and the empty/hero state — both correct in dark neutral.

## Possible follow-ups (not done)
- The **CLI terminal banner** in `cli.ts` is still the old warm-phosphor amber/sage theme — intentionally left (out of scope; it's terminal chrome, not the browser UI). Recolor to neutral later if cross-surface consistency is wanted.
- Live **streaming caret / running-tool spinner / error** states are code-complete but were not screenshot-driven (would require a live Claude turn). Static variants verified.

## Gotchas
- `src/App.tsx`, `Thread.tsx`, `server.ts`, `lib/thread.ts` showed as already-modified in git **before** this work (not mine) — don't blow them away.
- Thread history is cwd-scoped and persisted: a throwaway server pointed at the **same** dir restores the real thread; point it at an empty temp dir (`bun cli.ts /tmp/whatever --no-open`) to see the hero/empty state without touching real history.
