#!/usr/bin/env bun
import { basename, resolve } from "node:path";
import { homedir } from "node:os";
import { start, type StartResult } from "./server.ts";

const args = process.argv.slice(2);
if (args[0] === "-h" || args[0] === "--help") {
  printHelp();
  process.exit(0);
}

const target = args.find((a) => !a.startsWith("-"));
const cwd = target ? resolve(process.cwd(), target) : process.cwd();

const info = start({ cwd });
printBanner(info);

if (!args.includes("--no-open") && process.env.THREAD_NO_OPEN !== "1") openBrowser(info.url);

// ---------------------------------------------------------------------------
// Terminal presentation — warm phosphor theme to match the browser UI.
// ---------------------------------------------------------------------------
// Function declarations (not const arrows) so they're hoisted above the
// top-level banner call.
function AMBER(s: string) {
  return `\x1b[38;2;240;160;75m${s}\x1b[0m`;
}
function SAGE(s: string) {
  return `\x1b[38;2;159;176;138m${s}\x1b[0m`;
}
function CREAM(s: string) {
  return `\x1b[38;2;236;227;210m${s}\x1b[0m`;
}
function DIM(s: string) {
  return `\x1b[38;2;111;104;90m${s}\x1b[0m`;
}
function BOLD(s: string) {
  return `\x1b[1m${s}\x1b[0m`;
}
function UNDER(s: string) {
  return `\x1b[4m${s}\x1b[0m`;
}

function printBanner(i: StartResult): void {
  const home = homedir();
  const prettyCwd = i.cwd.startsWith(home) ? `~${i.cwd.slice(home.length)}` : i.cwd;
  const mode = i.autoApprove ? `${i.permissionMode} ${DIM("·")} auto-approve` : i.permissionMode;

  const out = [
    "",
    `  ${AMBER("◆")}  ${BOLD(AMBER("cweb"))}  ${DIM("claude code · browser thread")}`,
    `  ${DIM("─".repeat(46))}`,
    "",
    `  ${SAGE("➜")}  ${BOLD("Local")}    ${BOLD(AMBER(UNDER(i.url)))}`,
    "",
    `  ${DIM("dir")}      ${CREAM(prettyCwd)}`,
    `  ${DIM("mode")}     ${CREAM(mode)}`,
    `  ${DIM("model")}    ${CREAM(i.model ?? "default")}`,
    "",
    `  ${SAGE("⌁")}  ${DIM("thread starts on your first message · ")}${DIM("ctrl-c to stop")}`,
    "",
  ];
  console.log(out.join("\n"));
}

function openBrowser(url: string): void {
  const cmd =
    process.platform === "darwin"
      ? ["open", url]
      : process.platform === "win32"
        ? ["cmd", "/c", "start", "", url]
        : ["xdg-open", url];
  try {
    Bun.spawn(cmd, { stdout: "ignore", stderr: "ignore" });
  } catch {
    // Non-fatal: the URL is printed above.
  }
}

function printHelp(): void {
  console.log(
    [
      "",
      `  ${BOLD(AMBER("cweb"))} — a browser UI for a Claude Code thread, scoped to a directory`,
      "",
      `  ${BOLD("Usage")}`,
      `    cweb [dir] [options]`,
      "",
      `  ${BOLD("Arguments")}`,
      `    dir                  directory to give the agent as context (default: cwd)`,
      "",
      `  ${BOLD("Options")}`,
      `    --no-open            don't open the browser automatically`,
      `    -h, --help           show this help`,
      "",
      `  ${BOLD("Environment")}`,
      `    PORT                     preferred port (default 4242, falls back if busy)`,
      `    THREAD_MODEL             model id (default: account default)`,
      `    THREAD_PERMISSION_MODE   default | acceptEdits | bypassPermissions | plan | dontAsk | auto`,
      `    THREAD_AUTO_APPROVE      set to "false" to deny tools instead of auto-approving`,
      "",
    ].join("\n"),
  );
}
