// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

/** A line that is only a dash comment, such as `-----…`: shown code leaves it out. */
const SEPARATOR = /^\s*-{2,}\s*$/

const blank = (line: string) => !line.trim()

/**
 * The code the drawers show: lines that are only dashes dropped, then the blank lines left at the
 * start and the end. `numbers` holds each shown line's 1-based number in the original text, for
 * a gutter. Copy uses the original text, never this.
 */
export const stripSeparators = (text: string): { text: string; numbers: number[] } => {
  const kept = text
    .split('\n')
    .map((line, i) => ({ line, n: i + 1 }))
    .filter(({ line }) => !SEPARATOR.test(line))
  let start = 0
  let end = kept.length
  while (start < end && blank(kept[start].line)) start++
  while (end > start && blank(kept[end - 1].line)) end--
  const shown = kept.slice(start, end)
  return {
    text: shown
      .map(({ line }) => line)
      .join('\n')
      .replace(/\s+$/, ''),
    numbers: shown.map(({ n }) => n),
  }
}
