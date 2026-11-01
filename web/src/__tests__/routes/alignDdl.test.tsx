// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react'
import {
  AXIS_DDL,
  LAYERS,
  SCHEMA,
  SOURCE_DDL,
  TARGET_DDL,
  graphWith,
  migration,
} from './tableDrawer.fixtures'
import { DESIGN_CATALOG } from '../layers/fixtures'
import { LayerCatalog, parseLayerCatalog } from '../../layers'
import { MemoryRouter } from 'react-router-dom'
import { SCHEMES, SchemeContext } from '../../theme'
import { TableDrawer } from '../../routes/table-level/drawer/TableDrawer'
import { alignDdl, lineKey } from '../../routes/table-level/drawer/alignDdl'
import { highlightLines } from '../../routes/table-level/drawer/DdlCode'
import { fireEvent, render, screen, within } from '@testing-library/react'

/** The owner's pair: Oracle puts `(` on its own line, BigQuery keeps it on the CREATE line. */
const ORACLE = `CREATE TABLE wrk_employees
(
 employee_code        VARCHAR2 ( 100 CHAR ),
 first_name           VARCHAR2 ( 100 CHAR ),
 age                  NUMBER ( 38 ),
 month_salary         NUMBER ( 38,3 ),
 start_dt             DATE,
 is_active            VARCHAR2 ( 100 CHAR )
);`

const BIGQUERY = `CREATE TABLE wrk_employees (
    employee_code STRING(100),
    first_name STRING(100),
    age BIGNUMERIC(38),
    month_salary BIGNUMERIC(38, 3),
    start_dt DATE,
    is_active STRING(100)
)`

const COLUMNS = ['employee_code', 'first_name', 'age', 'month_salary', 'start_dt', 'is_active']

/** The text of each row's two sides, `null` for a blank cell. */
const sides = (rows: ReturnType<typeof alignDdl>) =>
  rows.map((r) => [r.source?.text.trim() ?? null, r.target?.text.trim() ?? null])

const rowOf = (rows: ReturnType<typeof alignDdl>, column: string) =>
  rows.find((r) => r.key === `col:${column}`)

describe('the side-by-side aligner', () => {
  it('keys a line by what it is: create, column, clause or closing', () => {
    expect(lineKey('CREATE TABLE wrk_employees (')).toBe('create')
    expect(lineKey(' employee_code   VARCHAR2 ( 100 CHAR ),')).toBe('col:employee_code')
    expect(lineKey('    "First_Name" STRING(100),')).toBe('col:first_name')
    expect(lineKey('  `sale_day` DATE')).toBe('col:sale_day')
    expect(lineKey('PARTITION BY RANGE (sale_day)')).toBe('clause:PARTITION')
    expect(lineKey('  CONSTRAINT pk_sales PRIMARY KEY (sale_id),')).toBe('clause:CONSTRAINT')
    expect(lineKey(');')).toBe('close')
    expect(lineKey(')')).toBe('close')
    expect(lineKey('(')).toBe('open')
    expect(lineKey('')).toBeNull()
  })

  it('puts every column of the owner’s wrk_employees pair on the same row', () => {
    const rows = alignDdl(ORACLE, BIGQUERY)
    for (const c of COLUMNS) {
      const row = rowOf(rows, c)
      expect(row?.source?.text).toContain(c)
      expect(row?.target?.text).toContain(c)
    }
    expect(sides(rows)[0]).toEqual(['CREATE TABLE wrk_employees', 'CREATE TABLE wrk_employees ('])
    // Oracle's lone `(` has no counterpart: a blank opposite, not a shift
    expect(sides(rows)[1]).toEqual(['(', null])
    expect(sides(rows)[rows.length - 1]).toEqual([');', ')'])
    expect(rows).toHaveLength(COLUMNS.length + 3)
  })

  it('numbers each side’s lines as in the original text', () => {
    const rows = alignDdl(ORACLE, BIGQUERY)
    expect(rowOf(rows, 'age')?.source?.n).toBe(5)
    expect(rowOf(rows, 'age')?.target?.n).toBe(4)
  })

  it('gives a target-only and a source-only line a blank opposite', () => {
    const rows = alignDdl(
      `CREATE TABLE t (\n  a NUMBER,\n  b DATE\n)\nCOMPRESS FOR OLTP;`,
      `CREATE TABLE t (\n  a INT64,\n  b DATE\n)\nOPTIONS (description = 't');`
    )
    expect(sides(rows)).toEqual([
      ['CREATE TABLE t (', 'CREATE TABLE t ('],
      ['a NUMBER,', 'a INT64,'],
      ['b DATE', 'b DATE'],
      [')', ')'],
      ['COMPRESS FOR OLTP;', null],
      [null, "OPTIONS (description = 't');"],
    ])
  })

  it('keeps the other columns paired when one is moved, without a cascade', () => {
    const rows = alignDdl(
      `CREATE TABLE t (\n  a NUMBER,\n  b NUMBER,\n  c NUMBER,\n  d NUMBER\n)`,
      `CREATE TABLE t (\n  a INT64,\n  c INT64,\n  d INT64,\n  b INT64\n)`
    )
    for (const c of ['a', 'c', 'd']) {
      expect(rowOf(rows, c)?.source).toBeTruthy()
      expect(rowOf(rows, c)?.target).toBeTruthy()
    }
    // the moved column shows once on each side, each opposite a blank
    const b = rows.filter((r) => r.key === 'col:b')
    expect(b.map((r) => [!!r.source, !!r.target])).toEqual([
      [true, false],
      [false, true],
    ])
    expect(sides(rows)[rows.length - 1]).toEqual([')', ')'])
  })

  it('aligns a DDL without columns, such as a view, by its clauses and text', () => {
    const rows = alignDdl(
      `CREATE OR REPLACE VIEW v_sales AS\nSELECT sale_id, amount\nFROM dw.fact_sales\nWHERE amount > 0;`,
      `CREATE OR REPLACE VIEW v_sales AS\nSELECT sale_id, amount\nFROM dw.fact_sales\nWHERE amount > 0`
    )
    expect(rows.every((r) => r.source && r.target)).toBe(true)
    expect(rows).toHaveLength(4)
  })

  it('marks a column row whose type changed, and not one whose type is the same', () => {
    const rows = alignDdl(ORACLE, BIGQUERY)
    expect(rowOf(rows, 'age')?.changed).toBe(true)
    expect(rowOf(rows, 'start_dt')?.changed).toBe(false)
  })
})

describe('target types', () => {
  it.each(['BIGNUMERIC', 'INT64', 'FLOAT64', 'BYTES', 'DATETIME', 'GEOGRAPHY'])(
    'colours the BigQuery type %s as a type, like STRING',
    (type) => {
      const line = highlightLines(`  c ${type},`, 'bigquery')[0]
      const tok = line.find((t) => t.text === type)
      expect(tok?.types).toContain('class-name')
    }
  )
})

describe('the side-by-side view', () => {
  const catalog = parseLayerCatalog(DESIGN_CATALOG).catalog as LayerCatalog
  const openSideBySide = (facets: object) => {
    const { node, lineage } = graphWith(facets)
    render(
      <MemoryRouter>
        <SchemeContext.Provider
          value={{ scheme: 'dark', tokens: SCHEMES.dark, setScheme: () => undefined }}
        >
          <TableDrawer node={node} lineage={lineage} catalog={catalog} onClose={() => undefined} />
        </SchemeContext.Provider>
      </MemoryRouter>
    )
    fireEvent.click(screen.getByRole('tab', { name: 'Side by side' }))
    return screen.getByTestId('side-by-side')
  }

  it('falls back to the two plain panes over the large-DDL limits', () => {
    const big = Array.from({ length: 6000 }, (_, i) => `  col_${i} NUMBER,`).join('\n')
    const grid = openSideBySide({
      ...SCHEMA,
      axisDdl: { dialect: 'oracle', language: 'sql', text: big },
      ...migration('applied', { targetDdl: TARGET_DDL }),
    })
    expect(grid.getAttribute('data-aligned')).toBe('false')
    expect(within(grid).queryAllByTestId('sbs-row')).toHaveLength(0)
    expect(within(grid).getByTestId('ddl-plain')).toBeTruthy()
  })

  it('draws one grid with both cells on every row, highlighted, and copies each side in full', () => {
    const { node, lineage } = graphWith({
      ...AXIS_DDL,
      ...SCHEMA,
      ...LAYERS,
      ...migration('applied'),
    })
    render(
      <MemoryRouter>
        <SchemeContext.Provider
          value={{ scheme: 'dark', tokens: SCHEMES.dark, setScheme: () => undefined }}
        >
          <TableDrawer node={node} lineage={lineage} catalog={catalog} onClose={() => undefined} />
        </SchemeContext.Provider>
      </MemoryRouter>
    )
    fireEvent.click(screen.getByRole('tab', { name: 'Side by side' }))
    const grid = screen.getByTestId('side-by-side')
    const rows = within(grid).getAllByTestId('sbs-row')
    expect(rows.length).toBeGreaterThan(0)
    for (const row of rows) {
      expect(row.querySelectorAll('[data-side="source"]')).toHaveLength(1)
      expect(row.querySelectorAll('[data-side="target"]')).toHaveLength(1)
    }
    const saleId = rows.find((r) => r.getAttribute('data-key') === 'col:sale_id') as HTMLElement
    expect(saleId.querySelector('[data-side="source"]')?.textContent).toContain('NUMBER')
    expect(saleId.querySelector('[data-side="target"]')?.textContent).toContain('DECIMAL(38,0)')
    expect(within(saleId).getByText('NUMBER').style.color).toBe('rgb(78, 201, 176)') // Dark+ type
    const writeText = jest.fn(() => Promise.resolve())
    Object.assign(navigator, { clipboard: { writeText } })
    const copies = screen.getAllByRole('button', { name: 'Copy' })
    fireEvent.click(copies[0])
    fireEvent.click(copies[1])
    expect(writeText).toHaveBeenNthCalledWith(1, SOURCE_DDL)
    expect(writeText).toHaveBeenNthCalledWith(2, TARGET_DDL)
  })
})
