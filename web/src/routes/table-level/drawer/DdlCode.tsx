// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { AlignedRow, alignDdl, ddlLines } from './alignDdl'
import { AxisTokens, useAxisTokens } from '../../../theme'
import { CopyButton } from './CopyButton'
import PrismLight from 'react-syntax-highlighter/dist/cjs/prism-light'
import React, { CSSProperties, ReactNode } from 'react'
import plsql from 'react-syntax-highlighter/dist/cjs/languages/prism/plsql'
import refractor, { RefractorNode } from 'refractor/core'

/**
 * DDL highlighted by Prism's SQL and PL/SQL grammars (only those two are bundled), in the
 * colours of VS Code's Dark+ or Light+ editor themes, as the scheme's `editor` token says.
 */

/** Column types: Prism's SQL grammars leave most of them plain, editors colour them as types. */
const TYPES =
  /\b(?:BFILE|BIGINT|BINARY|BINARY_DOUBLE|BINARY_FLOAT|BLOB|BOOLEAN|CHAR|CLOB|DATE|DECIMAL|DOUBLE|FLOAT|INT|INTEGER|LONG|NCHAR|NCLOB|NUMBER|NUMERIC|NVARCHAR2|RAW|REAL|ROWID|SMALLINT|STRING|TIMESTAMP|TIMESTAMP_NTZ|TINYINT|UROWID|VARCHAR|VARCHAR2|XMLTYPE)\b/i
const WORD_OPERATORS = /\b(?:AND|BETWEEN|DIV|ILIKE|IN|IS|LIKE|NOT|OR|REGEXP|RLIKE|XOR)\b/i

// refractor registers a grammar function by its displayName
const oracleSql = Object.assign(
  (Prism: any) => {
    plsql(Prism)
    ;['sql', 'plsql'].forEach((lang) =>
      Prism.languages.insertBefore(lang, 'keyword', { 'class-name': TYPES })
    )
    // Prism's SQL grammar calls NOT, AND, IN… operators; editors colour them as keywords
    Prism.languages.insertBefore('sql', 'keyword', {
      'word-operator': { pattern: WORD_OPERATORS, alias: 'keyword' },
    })
  },
  { displayName: 'plsql', aliases: [] as string[] }
)
PrismLight.registerLanguage('plsql', oracleSql)

/** VS Code's token colours, per editor theme. */
export const EDITOR_COLORS = {
  'dark-plus': {
    background: '#1E1E1E',
    text: '#D4D4D4',
    keyword: '#569CD6',
    type: '#4EC9B0',
    function: '#DCDCAA',
    string: '#CE9178',
    number: '#B5CEA8',
    comment: '#6A9955',
    variable: '#9CDCFE',
    gutter: '#858585',
    changed: 'rgba(86, 156, 214, 0.12)',
    blank: 'rgba(128, 128, 128, 0.07)',
  },
  'light-plus': {
    background: '#FFFFFF',
    text: '#000000',
    keyword: '#0000FF',
    type: '#267F99',
    function: '#795E26',
    string: '#A31515',
    number: '#098658',
    comment: '#008000',
    variable: '#001080',
    gutter: '#237893',
    changed: 'rgba(0, 0, 255, 0.06)',
    blank: 'rgba(128, 128, 128, 0.07)',
  },
} as const

const prismStyle = (c: (typeof EDITOR_COLORS)[keyof typeof EDITOR_COLORS]) => ({
  'pre[class*="language-"]': { color: c.text, background: c.background },
  'code[class*="language-"]': { color: c.text },
  keyword: { color: c.keyword },
  boolean: { color: c.keyword },
  'class-name': { color: c.type },
  function: { color: c.function },
  string: { color: c.string },
  number: { color: c.number },
  comment: { color: c.comment, fontStyle: 'normal' },
  variable: { color: c.variable },
  operator: { color: c.text },
  punctuation: { color: c.text },
})

const STYLES = {
  'dark-plus': prismStyle(EDITOR_COLORS['dark-plus']),
  'light-plus': prismStyle(EDITOR_COLORS['light-plus']),
}

/** The grammar for a DDL: PL/SQL for Oracle, plain SQL otherwise. */
export const grammarFor = (dialect: string) =>
  ['oracle', 'plsql'].includes(dialect.toLowerCase()) ? 'plsql' : 'sql'

export const editorPre = (t: AxisTokens): CSSProperties => ({
  margin: 0,
  padding: '12px 14px',
  background: EDITOR_COLORS[t.editor].background,
  border: `1px solid ${t.line}`,
  borderRadius: 8,
  font: `12.5px/1.55 ${t.mono}`,
  overflow: 'auto',
})

/**
 * Prism tokenises the whole text synchronously, about 9 s and 20 MB of markup for 1 MB of DDL,
 * so a DDL over either limit is shown as plain text, cut to the limits; Copy still copies it all.
 * ponytail: plain text above the limits; a virtualised or worker-side highlighter if large DDL
 * needs colours.
 */
export const LARGE_DDL_CHARS = 200_000
export const LARGE_DDL_LINES = 5_000

const lineCount = (text: string) => {
  let n = 1
  for (let i = text.indexOf('\n'); i !== -1; i = text.indexOf('\n', i + 1)) n++
  return n
}

const LargeDdl = ({ text }: { text: string }) => {
  const t = useAxisTokens()
  const lines = lineCount(text)
  let shown = text.slice(0, LARGE_DDL_CHARS)
  const cut = shown.split('\n', LARGE_DDL_LINES).join('\n')
  shown = cut.length < shown.length ? cut : shown
  const shownLines = lineCount(shown)
  return (
    <div>
      <div data-testid='ddl-large-note' style={{ marginBottom: 6, fontSize: 12, color: t.muted }}>
        Highlighting is off for large DDL ({lines.toLocaleString('en-US')} lines,{' '}
        {Math.round(text.length / 1000).toLocaleString('en-US')} KB)
        {shown.length < text.length
          ? `: showing the first ${shownLines.toLocaleString(
              'en-US'
            )} lines. Copy copies all of it.`
          : '.'}
      </div>
      <pre
        data-testid='ddl-plain'
        style={{ ...editorPre(t), color: EDITOR_COLORS[t.editor].text, whiteSpace: 'pre' }}
      >
        {shown}
      </pre>
    </div>
  )
}

export const DdlCode = ({ text, dialect }: { text: string; dialect: string }) => {
  const t = useAxisTokens()
  if (text.length > LARGE_DDL_CHARS || lineCount(text) > LARGE_DDL_LINES) {
    return <LargeDdl text={text} />
  }
  return (
    <PrismLight
      language={grammarFor(dialect)}
      style={STYLES[t.editor]}
      customStyle={editorPre(t)}
      codeTagProps={{ style: { fontFamily: t.mono } }}
      data-testid='ddl-code'
      data-editor={t.editor}
    >
      {text.replace(/\s+$/, '')}
    </PrismLight>
  )
}

/** A highlighted run of text: its Prism token types, outermost first. */
interface Token {
  text: string
  types: string[]
}

/**
 * A text highlighted once by the same grammars as `DdlCode`, then split into lines of tokens, so
 * Side by side can put each line in its own cell without a Prism call per cell.
 */
export const highlightLines = (text: string, dialect: string): Token[][] => {
  const lines: Token[][] = [[]]
  const walk = (nodes: RefractorNode[], types: string[]) =>
    nodes.forEach((node) => {
      if (node.type === 'text') {
        node.value.split('\n').forEach((part, i) => {
          if (i > 0) lines.push([])
          if (part) lines[lines.length - 1].push({ text: part, types })
        })
      } else {
        walk(node.children, [...types, ...(node.properties.className ?? [])])
      }
    })
  walk(refractor.highlight(ddlLines(text).join('\n'), grammarFor(dialect)), [])
  return lines
}

const tokenStyle = (style: Record<string, CSSProperties>, types: string[]) =>
  Object.assign({}, ...types.filter((k) => k !== 'token').map((k) => style[k] ?? {}))

const isLarge = (text: string) => text.length > LARGE_DDL_CHARS || lineCount(text) > LARGE_DDL_LINES

export interface SidePane {
  label: string
  text: string
  dialect: string
}

const PaneHead = ({ pane }: { pane: SidePane }) => {
  const t = useAxisTokens()
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        marginBottom: 8,
        fontSize: 12,
        color: t.muted,
      }}
    >
      {pane.label}
      <CopyButton text={pane.text} />
    </div>
  )
}

/**
 * Side by side: one grid whose rows pair each source line with the target line it corresponds
 * to (see `alignDdl`), a blank cell opposite a line with no counterpart, line numbers in a muted
 * gutter, and a faint tint on a column whose type changed. A wrapped long line keeps both sides
 * level, and one scroll moves both. Over the large-DDL limits, or too large to align, it shows
 * the two panes as before.
 */
export const SideBySide = ({ source, target }: { source: SidePane; target: SidePane }) => {
  const t = useAxisTokens()
  const heads = (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      <PaneHead pane={source} />
      <PaneHead pane={target} />
    </div>
  )
  const rows: AlignedRow[] | null =
    isLarge(source.text) || isLarge(target.text) ? null : alignDdl(source.text, target.text)
  if (!rows) {
    return (
      <div data-testid='side-by-side' data-aligned='false'>
        {heads}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[source, target].map((pane) => (
            <div key={pane.label} style={{ minWidth: 0 }}>
              <DdlCode text={pane.text} dialect={pane.dialect} />
            </div>
          ))}
        </div>
      </div>
    )
  }
  const c = EDITOR_COLORS[t.editor]
  const style = STYLES[t.editor] as Record<string, CSSProperties>
  const lines = {
    source: highlightLines(source.text, source.dialect),
    target: highlightLines(target.text, target.dialect),
  }
  const gutter = (n: number | undefined, first: boolean): ReactNode => (
    <div
      aria-hidden='true'
      style={{
        padding: '0 10px 0 12px',
        textAlign: 'right',
        color: c.gutter,
        userSelect: 'none',
        borderLeft: first ? undefined : `1px solid ${t.line}`,
      }}
    >
      {n ?? ''}
    </div>
  )
  const cell = (side: 'source' | 'target', row: AlignedRow): ReactNode => {
    const line = row[side]
    return (
      <div
        data-side={side}
        style={{
          padding: '0 12px 0 0',
          whiteSpace: 'pre-wrap',
          overflowWrap: 'anywhere',
          minWidth: 0,
          background: !line ? c.blank : row.changed ? c.changed : undefined,
        }}
      >
        {line
          ? (lines[side][line.n - 1] ?? []).map((tok, i) =>
              tok.types.length ? (
                <span key={i} style={tokenStyle(style, tok.types)}>
                  {tok.text}
                </span>
              ) : (
                <React.Fragment key={i}>{tok.text}</React.Fragment>
              )
            )
          : ''}
      </div>
    )
  }
  return (
    <div data-testid='side-by-side' data-aligned='true'>
      {heads}
      <div
        role='table'
        style={{
          ...editorPre(t),
          padding: '12px 0',
          color: c.text,
          display: 'grid',
          gridTemplateColumns: 'max-content minmax(0, 1fr) max-content minmax(0, 1fr)',
        }}
      >
        {rows.map((row, i) => (
          <div
            key={i}
            role='row'
            data-testid='sbs-row'
            data-key={row.key ?? ''}
            data-changed={row.changed ? 'true' : undefined}
            style={{ display: 'contents' }}
          >
            {gutter(row.source?.n, true)}
            {cell('source', row)}
            {gutter(row.target?.n, false)}
            {cell('target', row)}
          </div>
        ))}
      </div>
    </div>
  )
}
