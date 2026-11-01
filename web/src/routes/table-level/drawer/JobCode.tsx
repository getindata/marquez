// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { CopyButton } from './CopyButton'
import { DdlCode } from './DdlCode'
import { platformLabel } from './axisFacets'
import { useAxisTokens } from '../../../theme'
import MqCode from '../../../components/core/code/MqCode'
import React from 'react'

/**
 * A job's code in the job drawer, drawn as the table drawer draws a DDL: Prism SQL or PL/SQL in
 * VS Code Dark+ or Light+, with Copy and the large-DDL guard of `DdlCode`. The standard `sql`
 * facet uses its `dialect` (else SQL); a `sourceCode` facet in a SQL language too. Code in any
 * other language keeps the stock `MqCode`, since only the SQL grammars are bundled here.
 */

export interface JobCodeBlock {
  facet: 'sql' | 'sourceCode'
  label: string
  text: string
  /** The `DdlCode` dialect: `oracle` for PL/SQL, else SQL; null for a non-SQL language. */
  dialect: string | null
  language: string
}

const str = (v: unknown) => (typeof v === 'string' ? v : '')
const obj = (v: unknown): Record<string, unknown> =>
  typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : {}

const SQL_LANGUAGES: Record<string, string> = { sql: 'sql', plsql: 'oracle', 'pl/sql': 'oracle' }

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
    const dialect = SQL_LANGUAGES[language.toLowerCase()] ?? null
    blocks.push({
      facet: 'sourceCode',
      label: `Source code${language ? ` · ${language === 'plsql' ? 'PL/SQL' : language}` : ''}`,
      text: str(source.sourceCode),
      dialect,
      language,
    })
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
