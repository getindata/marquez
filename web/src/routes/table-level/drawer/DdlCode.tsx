// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { AxisTokens, useAxisTokens } from '../../../theme'
import PrismLight from 'react-syntax-highlighter/dist/cjs/prism-light'
import React, { CSSProperties } from 'react'
import plsql from 'react-syntax-highlighter/dist/cjs/languages/prism/plsql'

/**
 * DDL highlighted by Prism's SQL and PL/SQL grammars (only those two are bundled), in the
 * colours of VS Code's Dark+ or Light+ editor themes, as the scheme's `editor` token says.
 */

/** Column types: Prism's SQL grammars leave most of them plain, editors colour them as types. */
const TYPES =
  /\b(?:BFILE|BIGINT|BINARY|BINARY_DOUBLE|BINARY_FLOAT|BLOB|BOOLEAN|CHAR|CLOB|DATE|DECIMAL|DOUBLE|FLOAT|INT|INTEGER|LONG|NCHAR|NCLOB|NUMBER|NUMERIC|NVARCHAR2|RAW|REAL|ROWID|SMALLINT|STRING|TIMESTAMP|TIMESTAMP_NTZ|TINYINT|UROWID|VARCHAR|VARCHAR2|XMLTYPE)\b/i

// refractor registers a grammar function by its displayName
const oracleSql = Object.assign(
  (Prism: any) => {
    plsql(Prism)
    ;['sql', 'plsql'].forEach((lang) =>
      Prism.languages.insertBefore(lang, 'keyword', { 'class-name': TYPES })
    )
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
  dialect.toLowerCase() === 'oracle' ? 'plsql' : 'sql'

export const editorPre = (t: AxisTokens): CSSProperties => ({
  margin: 0,
  padding: '12px 14px',
  background: EDITOR_COLORS[t.editor].background,
  border: `1px solid ${t.line}`,
  borderRadius: 8,
  font: `12.5px/1.55 ${t.mono}`,
  overflow: 'auto',
})

export const DdlCode = ({ text, dialect }: { text: string; dialect: string }) => {
  const t = useAxisTokens()
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
