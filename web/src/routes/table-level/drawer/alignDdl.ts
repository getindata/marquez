// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

/**
 * Row-aligns a source and a target DDL for Side by side: each line gets a key (the CREATE line,
 * a column by its name, a clause by its keyword, the closing line, else its text), and a longest
 * common subsequence over the keys pairs the lines. A line with no counterpart gets a blank cell
 * opposite it, so one extra line (Oracle's lone `(`) or a moved column shifts nothing after it.
 */

export interface SideLine {
  /** 1-based line number in that side's text. */
  n: number
  text: string
}

export interface AlignedRow {
  key: string | null
  source?: SideLine
  target?: SideLine
  /** For a paired column: whether its type text differs between the sides. */
  changed?: boolean
}

/** Keywords that start a clause rather than a column. */
const CLAUSES = new Set(
  (
    'AS CACHE CHECK CLUSTER COMMENT COMPRESS CONSTRAINT DISABLE DISTKEY DISTRIBUTE ENABLE ' +
    'EXCEPT FOREIGN FROM GROUP HAVING INDEX INNER INTERSECT JOIN LEFT LIFECYCLE LOB LOCATION ' +
    'LOGGING NOCACHE NOCOMPRESS NOLOGGING NOPARALLEL ON OPTIONS ORDER ORGANIZATION OUTER ' +
    'PARALLEL PARTITION PCTFREE PRIMARY RIGHT ROW SEGMENT SELECT SORTKEY STORAGE STORED ' +
    'SUBPARTITION TABLESPACE TBLPROPERTIES UNION UNIQUE USING WHERE WITH'
  ).split(' ')
)

/** The name and the rest of a column line, or null when the line is not one. */
const columnOf = (line: string): { name: string; rest: string } | null => {
  const m = /^(?:"([^"]+)"|`([^`]+)`|\[([^\]]+)\]|([A-Za-z_][\w$#]*))\s+(\S.*)$/.exec(line)
  if (!m) return null
  const quoted = m[1] ?? m[2] ?? m[3]
  const name = quoted ?? m[4]
  if (!quoted && CLAUSES.has(name.toUpperCase())) return null
  return { name: name.toLowerCase(), rest: m[5] }
}

const bare = (line: string) => line.trim().replace(/[,;\s]+$/, '')

/** A line's alignment key; null for a blank line, which never pairs. */
export const lineKey = (line: string): string | null => {
  const u = bare(line)
  if (!u) return null
  if (/^\)/.test(u)) return 'close'
  if (u === '(') return 'open'
  if (/^CREATE\b/i.test(u)) return 'create'
  const word = /^([A-Za-z_]+)/.exec(u)?.[1]?.toUpperCase()
  if (word && CLAUSES.has(word)) return `clause:${word}`
  const column = columnOf(u)
  if (column) return `col:${column.name}`
  return `text:${u.replace(/\s+/g, ' ').toLowerCase()}`
}

const typeOf = (line: string) =>
  (columnOf(bare(line))?.rest ?? '').replace(/\s+/g, '').toUpperCase()

/** A DDL's lines as Side by side shows them: trailing blank space dropped. */
export const ddlLines = (text: string) => text.replace(/\s+$/, '').split('\n')

/** Above this many LCS cells (source lines × target lines) the sides are not aligned. */
export const ALIGN_MAX_CELLS = 4_000_000

/** The aligned rows, or null when the pair is too large to align (see ALIGN_MAX_CELLS). */
export const alignDdl = (source: string, target: string): AlignedRow[] | null => {
  const a = ddlLines(source)
  const b = ddlLines(target)
  if (a.length * b.length > ALIGN_MAX_CELLS) return null
  const ka = a.map(lineKey)
  const kb = b.map(lineKey)
  const n = a.length
  const m = b.length
  // lcs[i][j]: the longest common key subsequence of a[i..] and b[j..]
  const lcs: Uint32Array[] = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] =
        ka[i] !== null && ka[i] === kb[j]
          ? lcs[i + 1][j + 1] + 1
          : Math.max(lcs[i + 1][j], lcs[i][j + 1])
    }
  }
  const rows: AlignedRow[] = []
  const src = (i: number): SideLine => ({ n: i + 1, text: a[i] })
  const tgt = (j: number): SideLine => ({ n: j + 1, text: b[j] })
  let i = 0
  let j = 0
  // unpaired lines between two pairs: the source's first, then the target's
  const pendingTarget: number[] = []
  const flush = () => {
    pendingTarget.forEach((k) => rows.push({ key: kb[k], target: tgt(k) }))
    pendingTarget.length = 0
  }
  while (i < n && j < m) {
    if (ka[i] !== null && ka[i] === kb[j]) {
      flush()
      const key = ka[i] as string
      rows.push({
        key,
        source: src(i),
        target: tgt(j),
        ...(key.startsWith('col:') ? { changed: typeOf(a[i]) !== typeOf(b[j]) } : {}),
      })
      i++
      j++
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      rows.push({ key: ka[i], source: src(i) })
      i++
    } else {
      pendingTarget.push(j)
      j++
    }
  }
  for (; i < n; i++) rows.push({ key: ka[i], source: src(i) })
  for (; j < m; j++) pendingTarget.push(j)
  flush()
  return rows
}
