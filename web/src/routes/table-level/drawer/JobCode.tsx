// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { CopyButton } from './CopyButton'
import { DdlCode } from './DdlCode'
import { nativeQueries } from '../powerbi'
import { platformLabel } from './axisFacets'
import { useAxisTokens } from '../../../theme'
import MqCode from '../../../components/core/code/MqCode'
import React from 'react'

/**
 * A job's code in the job drawer, drawn as the table drawer draws a DDL: Prism SQL, PL/SQL, DAX
 * or Power Query M in VS Code Dark+ or Light+, with Copy and the large-DDL guard of `DdlCode`.
 * The standard `sql` facet uses its `dialect` (else SQL); a `sourceCode` facet in one of those
 * languages too, and each native query (`Query="…"`) of Power Query M follows it as SQL in its
 * connector's dialect. Code in any other language keeps the stock `MqCode`, since only those
 * grammars are bundled here.
 */

export interface JobCodeBlock {
  /** The block's key: `sql`, `sourceCode`, or `nativeQuery-<n>` for the M's native queries. */
  facet: string
  label: string
  text: string
  /** The `DdlCode` dialect (`oracle` for PL/SQL, `dax`, `powerquery`); null for another language. */
  dialect: string | null
  language: string
}

const str = (v: unknown) => (typeof v === 'string' ? v : '')
const obj = (v: unknown): Record<string, unknown> =>
  typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : {}

/** The `sourceCode` languages `DdlCode` highlights: their dialect, and a label of their own. */
const LANGUAGES: Record<string, { dialect: string; label?: string }> = {
  sql: { dialect: 'sql' },
  plsql: { dialect: 'oracle' },
  'pl/sql': { dialect: 'oracle' },
  dax: { dialect: 'dax', label: 'DAX' },
  powerquery: { dialect: 'powerquery', label: 'Power Query M' },
  m: { dialect: 'powerquery', label: 'Power Query M' },
  pq: { dialect: 'powerquery', label: 'Power Query M' },
}

/**
 * The code blocks of a job's facets: the `sql` query, then the `sourceCode` source. The query
 * is left out when it is empty or the source code contains it (after trimming).
 */
export const jobCodeBlocks = (facets: unknown): JobCodeBlock[] => {
  const f = obj(facets)
  const blocks: JobCodeBlock[] = []
  const sql = obj(f.sql)
  const query = str(sql.query).trim()
  // the Oracle producer sends the unit's first line as the query: a query the source code
  // already holds adds nothing
  if (query && !str(obj(f.sourceCode).sourceCode).includes(query)) {
    const dialect = str(sql.dialect)
    blocks.push({
      facet: 'sql',
      label: dialect ? `SQL · ${platformLabel(dialect)}` : 'SQL',
      text: str(sql.query),
      dialect: dialect || 'sql',
      language: 'sql',
    })
  }
  const source = obj(f.sourceCode)
  if (str(source.sourceCode).trim()) {
    const language = str(source.language)
    const known = LANGUAGES[language.toLowerCase()]
    blocks.push({
      facet: 'sourceCode',
      label:
        known?.label ??
        `Source code${language ? ` · ${language === 'plsql' ? 'PL/SQL' : language}` : ''}`,
      text: str(source.sourceCode),
      dialect: known?.dialect ?? null,
      language,
    })
    if (known?.dialect === 'powerquery') {
      nativeQueries(str(source.sourceCode)).forEach((q, i) =>
        blocks.push({
          facet: `nativeQuery-${i}`,
          label: `Native query · ${q.dialect ? `SQL · ${platformLabel(q.dialect)}` : 'SQL'}`,
          text: q.sql,
          dialect: q.dialect || 'sql',
          language: 'sql',
        })
      )
    }
  }
  return blocks
}

export const JobCode = ({ facets }: { facets: unknown }) => {
  const t = useAxisTokens()
  return (
    <>
      {jobCodeBlocks(facets).map((block) => (
        <section
          key={block.facet}
          data-testid={`job-code-${block.facet}`}
          style={{ marginBottom: 16 }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 8,
              fontSize: 13,
              color: t.text,
              fontFamily: t.font,
            }}
          >
            <b>{block.label}</b>
            <CopyButton text={block.text} />
          </div>
          {block.dialect !== null ? (
            <DdlCode text={block.text} dialect={block.dialect} />
          ) : (
            <MqCode code={block.text} language={block.language} />
          )}
        </section>
      ))}
    </>
  )
}
