// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react'
import { DESIGN_CATALOG } from '../layers/fixtures'
import { JobCode } from '../../routes/table-level/drawer/JobCode'
import { LayerCatalog, parseLayerCatalog } from '../../layers'
import { MemoryRouter } from 'react-router-dom'
import { SCHEMA, graphWith, migration } from './tableDrawer.fixtures'
import { SCHEMES, SchemeContext } from '../../theme'
import { TableDrawer } from '../../routes/table-level/drawer/TableDrawer'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { stripSeparators } from '../../routes/table-level/drawer/separators'

/** A PL/SQL unit as the Oracle producer sends it: a dash separator line first. */
const UNIT = `---------------------------------------------------

PROCEDURE load_sales
IS
BEGIN
  -- note: keep this comment
  ----
  INSERT INTO t (a) VALUES (1); -- inline note
     --   
END;
---------------------------------------------------
`

const scheme = (ui: React.ReactElement) => (
  <SchemeContext.Provider
    value={{ scheme: 'dark', tokens: SCHEMES.dark, setScheme: () => undefined }}
  >
    {ui}
  </SchemeContext.Provider>
)

const clipboard = () => {
  const writeText = jest.fn(() => Promise.resolve())
  Object.assign(navigator, { clipboard: { writeText } })
  return writeText
}

describe('separator lines', () => {
  it('drop lines that are only dashes, keep comments with text, and trim blank ends', () => {
    const { text, numbers } = stripSeparators(UNIT)
    expect(text).toBe(`PROCEDURE load_sales
IS
BEGIN
  -- note: keep this comment
  INSERT INTO t (a) VALUES (1); -- inline note
END;`)
    // each shown line keeps its number in the original text
    expect(numbers).toEqual([3, 4, 5, 6, 8, 10])
  })

  it('keep a line with text after the dashes, and text before them', () => {
    expect(stripSeparators('-- note').text).toBe('-- note')
    expect(stripSeparators('a -- b').text).toBe('a -- b')
    expect(stripSeparators('---- x').text).toBe('---- x')
    expect(stripSeparators('-').text).toBe('-')
  })

  it('are not shown in a job’s code, which Copy still copies unchanged', () => {
    const writeText = clipboard()
    render(scheme(<JobCode facets={{ sourceCode: { language: 'plsql', sourceCode: UNIT } }} />))
    const code = screen.getByTestId('ddl-code').textContent as string
    expect(code.startsWith('PROCEDURE load_sales')).toBe(true)
    expect(code).not.toMatch(/^\s*-{2,}\s*$/m)
    expect(code).toContain('-- note: keep this comment')
    expect(code).toContain('-- inline note')
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }))
    expect(writeText).toHaveBeenCalledWith(UNIT)
  })

  it('are not shown in a table’s DDL panes or side by side, nor numbered there', () => {
    const catalog = parseLayerCatalog(DESIGN_CATALOG).catalog as LayerCatalog
    const source = `-----------------\nCREATE TABLE t\n(\n  a NUMBER\n);`
    const target = `CREATE TABLE t (\n  ------\n  a INT64\n)`
    const { node, lineage } = graphWith({
      ...SCHEMA,
      axisDdl: { dialect: 'oracle', language: 'sql', text: source },
      ...migration('applied', { targetDdl: target }),
    })
    const writeText = clipboard()
    render(
      <MemoryRouter>
        {scheme(
          <TableDrawer node={node} lineage={lineage} catalog={catalog} onClose={() => undefined} />
        )}
      </MemoryRouter>
    )
    expect(screen.getByTestId('ddl-code').textContent).toBe('CREATE TABLE t\n(\n  a NUMBER\n);')
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }))
    expect(writeText).toHaveBeenLastCalledWith(source)
    fireEvent.click(screen.getByRole('tab', { name: 'Side by side' }))
    const rows = within(screen.getByTestId('side-by-side')).getAllByTestId('sbs-row')
    const texts = rows.map((r) =>
      Array.from(r.querySelectorAll('[data-side]')).map((c) => c.textContent)
    )
    expect(texts.flat().some((t) => /^\s*-{2,}\s*$/.test(t as string))).toBe(false)
    // the column row pairs, and its gutter numbers are the original lines (4 and 3)
    const a = rows.find((r) => r.getAttribute('data-key') === 'col:a') as HTMLElement
    expect(
      Array.from(a.querySelectorAll('[aria-hidden="true"]')).map((g) => g.textContent)
    ).toEqual(['4', '3'])
    const copies = screen.getAllByRole('button', { name: 'Copy' })
    fireEvent.click(copies[1])
    expect(writeText).toHaveBeenLastCalledWith(target)
  })
})
