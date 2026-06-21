// Line-level diffing for file-editing tool calls (Edit / MultiEdit / Write).
// The Agent SDK hands us the raw old/new strings, so we can reconstruct a
// readable diff client-side without any extra wire data.

export type DiffLine = { type: 'add' | 'del' | 'context'; text: string }

export type DiffHunk = { lines: DiffLine[]; replaceAll: boolean }

export type ToolDiff = { filePath: string; hunks: DiffHunk[] }

// A standard longest-common-subsequence line diff. Hunks fed in here are edit
// snippets (a few lines, occasionally a whole file on Write), so the O(n*m)
// table is comfortably small.
export function diffLines(oldText: string, newText: string): DiffLine[] {
  const a = oldText.split('\n')
  const b = newText.split('\n')
  const n = a.length
  const m = b.length

  // lcs[i][j] = length of the LCS of a[i..] and b[j..].
  const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1])
    }
  }

  const out: DiffLine[] = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push({ type: 'context', text: a[i] })
      i++
      j++
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      out.push({ type: 'del', text: a[i] })
      i++
    } else {
      out.push({ type: 'add', text: b[j] })
      j++
    }
  }
  while (i < n) out.push({ type: 'del', text: a[i++] })
  while (j < m) out.push({ type: 'add', text: b[j++] })
  return out
}

// Pull a renderable diff out of a tool call's input, or null if the tool isn't
// a file edit. Tool inputs are untyped over the wire, so we probe defensively.
export function toolDiff(name: string, input: unknown): ToolDiff | null {
  const i = (input ?? {}) as Record<string, unknown>
  const filePath = typeof i.file_path === 'string' ? i.file_path : ''

  if (name === 'Edit' && typeof i.old_string === 'string' && typeof i.new_string === 'string') {
    return {
      filePath,
      hunks: [{ lines: diffLines(i.old_string, i.new_string), replaceAll: i.replace_all === true }]
    }
  }

  if (name === 'MultiEdit' && Array.isArray(i.edits)) {
    const hunks: DiffHunk[] = []
    for (const raw of i.edits) {
      const e = (raw ?? {}) as Record<string, unknown>
      if (typeof e.old_string !== 'string' || typeof e.new_string !== 'string') continue
      hunks.push({ lines: diffLines(e.old_string, e.new_string), replaceAll: e.replace_all === true })
    }
    return hunks.length ? { filePath, hunks } : null
  }

  // A Write is a wholesale create/overwrite: every line is an addition.
  if (name === 'Write' && typeof i.content === 'string') {
    const lines: DiffLine[] = i.content.split('\n').map((text) => ({ type: 'add', text }))
    return { filePath, hunks: [{ lines, replaceAll: false }] }
  }

  return null
}

// Total added / deleted line counts across all hunks, for the collapsed header.
export function diffStat(hunks: DiffHunk[]): { added: number; deleted: number } {
  let added = 0
  let deleted = 0
  for (const h of hunks) {
    for (const l of h.lines) {
      if (l.type === 'add') added++
      else if (l.type === 'del') deleted++
    }
  }
  return { added, deleted }
}
