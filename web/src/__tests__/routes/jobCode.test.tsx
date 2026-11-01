// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react'
import { JobCode, jobCodeBlocks } from '../../routes/table-level/drawer/JobCode'
import { Provider } from 'react-redux'
import { SCHEMES, SchemeContext, SchemeName } from '../../theme'
import { createStore } from 'redux'
import { fireEvent, render, screen, within } from '@testing-library/react'
import RunInfo from '../../components/jobs/RunInfo'

/** A synthetic PL/SQL procedure, as an Oracle job's facets carry it. */
const QUERY = `MERGE INTO dw.fact_sales t USING stg.sales_raw s ON (t.sale_id = s.sale_id)
WHEN NOT MATCHED THEN INSERT (sale_id, amount) VALUES (s.sale_id, s.amount)`
const SOURCE = `PROCEDURE load_sales IS
BEGIN
  DELETE FROM stg.sales_raw WHERE amount IS NULL;
END;`

const FACETS = {
  sql: { query: QUERY, dialect: 'oracle' },
  sourceCode: { language: 'plsql', sourceCode: SOURCE },
}

const withScheme = (scheme: SchemeName, ui: React.ReactElement) => (
  <SchemeContext.Provider value={{ scheme, tokens: SCHEMES[scheme], setScheme: () => undefined }}>
    {ui}
  </SchemeContext.Provider>
)

const renderRunInfo = (scheme: SchemeName, facets: object = FACETS) => {
  const store = createStore(() => ({ facets: { result: facets } }))
  const run = { id: 'run-1', facets: null } as any
  return render(<Provider store={store}>{withScheme(scheme, <RunInfo run={run} />)}</Provider>)
}

describe('a job’s code in the job drawer', () => {
  it.each([
    ['dark', 'dark-plus', 'rgb(86, 156, 214)'], // Dark+ keyword #569CD6
    ['xebia', 'dark-plus', 'rgb(86, 156, 214)'],
    ['light', 'light-plus', 'rgb(0, 0, 255)'], // Light+ keyword #0000FF
  ] as const)(
    'renders the sql facet through DdlCode with keyword colours in %s (%s)',
    (scheme, editor, keyword) => {
      renderRunInfo(scheme)
      const sql = screen.getByTestId('job-code-sql')
      const code = within(sql).getByTestId('ddl-code')
      expect(code.getAttribute('data-editor')).toBe(editor)
      expect(within(code).getByText('MERGE').style.color).toBe(keyword)
      expect(within(code).getByText('NOT').style.color).toBe(keyword)
      expect(within(sql).getByText('SQL · Oracle')).toBeTruthy()
    }
  )

  it('renders a PL/SQL source code facet the same way', () => {
    renderRunInfo('light')
    const source = screen.getByTestId('job-code-sourceCode')
    const code = within(source).getByTestId('ddl-code')
    expect(within(code).getByText('BEGIN').style.color).toBe('rgb(0, 0, 255)')
    expect(within(source).getByText('Source code · PL/SQL')).toBeTruthy()
  })

  it('copies the code shown', () => {
    const writeText = jest.fn(() => Promise.resolve())
    Object.assign(navigator, { clipboard: { writeText } })
    renderRunInfo('dark')
    fireEvent.click(
      within(screen.getByTestId('job-code-sql')).getByRole('button', { name: 'Copy' })
    )
    expect(writeText).toHaveBeenCalledWith(QUERY)
  })

  it('keeps the large-input guard', () => {
    const big = Array.from({ length: 6000 }, (_, i) => `  UPDATE t SET c = ${i};`).join('\n')
    const { container } = renderRunInfo('dark', { sql: { query: big } })
    expect(screen.getByTestId('ddl-large-note')).toBeTruthy()
    expect(container.querySelectorAll('.token').length).toBe(0)
  })

  it('reads SQL without a dialect as SQL, and leaves a non-SQL language to the stock view', () => {
    expect(
      jobCodeBlocks({
        sql: { query: 'SELECT 1' },
        sourceCode: { language: 'python', sourceCode: 'print(1)' },
      }).map((b) => [b.label, b.dialect])
    ).toEqual([
      ['SQL', 'sql'],
      ['Source code · python', null],
    ])
    const { container } = render(
      withScheme(
        'dark',
        <JobCode facets={{ sourceCode: { language: 'python', sourceCode: 'print(1)' } }} />
      )
    )
    expect(screen.queryByTestId('ddl-code')).toBeNull()
    expect(container.querySelector('pre')?.textContent).toBe('print(1)')
  })

  it('hides an sql facet that only repeats part of the source code', () => {
    // the Oracle producer sends the unit's first line as the sql query
    const facets = {
      sql: { query: '  PROCEDURE load_sales IS ', dialect: 'oracle' },
      sourceCode: { language: 'plsql', sourceCode: SOURCE },
    }
    expect(jobCodeBlocks(facets).map((b) => b.facet)).toEqual(['sourceCode'])
    expect(jobCodeBlocks({ ...facets, sql: { query: '   ' } }).map((b) => b.facet)).toEqual([
      'sourceCode',
    ])
    renderRunInfo('dark', facets)
    expect(screen.queryByTestId('job-code-sql')).toBeNull()
    expect(screen.getByTestId('job-code-sourceCode')).toBeTruthy()
  })

  it('keeps an sql facet that adds code the source does not have, or that stands alone', () => {
    expect(jobCodeBlocks(FACETS).map((b) => b.facet)).toEqual(['sql', 'sourceCode'])
    expect(jobCodeBlocks({ sql: { query: 'select 1' } }).map((b) => b.facet)).toEqual(['sql'])
  })

  it('shows nothing without code facets', () => {
    expect(jobCodeBlocks({ jobType: {} })).toEqual([])
    expect(jobCodeBlocks(undefined)).toEqual([])
  })
})
