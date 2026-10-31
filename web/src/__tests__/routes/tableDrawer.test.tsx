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
import { EDITOR_COLORS } from '../../routes/table-level/drawer/DdlCode'
import { LayerCatalog, parseLayerCatalog } from '../../layers'
import { MemoryRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import { SCHEMES, SchemeContext, SchemeName } from '../../theme'
import { TableDrawer } from '../../routes/table-level/drawer/TableDrawer'
import { createStore } from 'redux'
import { fireEvent, render, screen, within } from '@testing-library/react'
import {
  readAxisDdl,
  readAxisMigration,
  splitEffect,
} from '../../routes/table-level/drawer/axisFacets'
import TableLevelDrawer from '../../routes/table-level/TableLevelDrawer'

jest.mock('../../components/datasets/DatasetDetailPage', () => ({
  __esModule: true,
  default: () => <div data-testid='stock-dataset-drawer' />,
}))
jest.mock('../../components/jobs/JobDetailPage', () => ({
  __esModule: true,
  default: () => <div data-testid='stock-job-drawer' />,
}))

const catalog = parseLayerCatalog(DESIGN_CATALOG).catalog as LayerCatalog

const FULL = { ...AXIS_DDL, ...SCHEMA, ...LAYERS, ...migration('applied') }
const NO_MIGRATION = { ...AXIS_DDL, ...SCHEMA, ...LAYERS, axisStatus: { state: 'lineage' } }
const NO_TARGET = { ...AXIS_DDL, ...SCHEMA, ...LAYERS, ...migration('will_apply') }

const renderDrawer = (facets: object, scheme: SchemeName = 'dark') => {
  const { node, lineage } = graphWith(facets)
  const onClose = jest.fn()
  const utils = render(
    <SchemeContext.Provider value={{ scheme, tokens: SCHEMES[scheme], setScheme: () => undefined }}>
      <TableDrawer
        node={node}
        lineage={lineage}
        catalog={catalog}
        onClose={onClose}
        lineageTab={<div data-testid='stock-dataset-drawer' />}
      />
    </SchemeContext.Provider>
  )
  return { ...utils, onClose }
}

const tab = (name: string) => screen.getByRole('tab', { name })
const ddlText = () => screen.getAllByTestId('ddl-code').map((el) => el.textContent)

describe('facet readers', () => {
  it('read nothing from a missing or malformed facet', () => {
    expect(readAxisDdl(undefined)).toBeNull()
    expect(readAxisDdl({ axisDdl: { dialect: 'oracle', text: '  ' } })).toBeNull()
    expect(readAxisMigration({})).toBeNull()
    expect(readAxisMigration({ axisMigration: 'nope' })).toBeNull()
  })

  it('keep a migration facet whose lists are malformed, with the bad entries dropped', () => {
    const m = readAxisMigration({
      axisMigration: { target: 'databricks', rules: [{ title: 'no id' }, 7], columns: 'x' },
    })
    expect(m).toMatchObject({ target: 'databricks', rules: [], columns: [], gaps: [] })
  })

  it('split an effect at its arrow', () => {
    expect(splitEffect('A (x) → B (x)')).toEqual(['A (x)', 'B (x)'])
    expect(splitEffect('dropped')).toBeNull()
  })
})

describe('the table drawer with full facets (converted)', () => {
  it('shows the header facts: heat, wave, complexity, real writers, status', () => {
    renderDrawer(FULL)
    expect(screen.getByText('dw.fact_sales')).toBeTruthy()
    expect(screen.getByText(/8,400 queries in 30 days/)).toBeTruthy()
    expect(screen.getByTestId('heat-dot')).toBeTruthy()
    expect(screen.getByTestId('wave-chip').textContent).toBe('Wave 1')
    expect(screen.getByTestId('meter-row').textContent).toContain('0.64')
    const meta = screen.getByTestId('drawer-meta')
    // the table's own DDL job is not a writer
    expect(meta.textContent).toContain('written by etl.load_sales')
    expect(meta.textContent).not.toContain('dw.fact_sales')
    expect(meta.textContent).toContain('status converted')
  })

  it('opens on the DDL tab with the Oracle source highlighted in Dark+', () => {
    renderDrawer(FULL)
    expect(tab('DDL').getAttribute('aria-selected')).toBe('true')
    expect(ddlText()).toEqual([SOURCE_DDL])
    const code = screen.getByTestId('ddl-code')
    const create = within(code).getAllByText('CREATE')[0]
    expect(create.style.color).toBe('rgb(86, 156, 214)') // Dark+ #569CD6
    expect(within(code).getAllByText('NUMBER')[0].style.color).toBe('rgb(78, 201, 176)') // #4EC9B0
    expect(within(code).getByText("'MONTH'").style.color).toBe('rgb(206, 145, 120)') // #CE9178
    expect(code.style.background).toBe('rgb(30, 30, 30)') // #1E1E1E
  })

  it('colours NOT in the target DDL as a keyword, as editors do', () => {
    renderDrawer(FULL)
    fireEvent.click(tab('Databricks target'))
    const code = screen.getByTestId('ddl-code')
    expect(within(code).getAllByText('NOT')[0].style.color).toBe('rgb(86, 156, 214)')
    expect(within(code).getAllByText('DECIMAL')[0].style.color).toBe('rgb(78, 201, 176)')
  })

  it('switches to the Databricks target and to side by side', () => {
    renderDrawer(FULL)
    fireEvent.click(tab('Databricks target'))
    expect(ddlText()).toEqual([TARGET_DDL])
    fireEvent.click(tab('Side by side'))
    expect(screen.getByTestId('side-by-side')).toBeTruthy()
    expect(ddlText()).toEqual([SOURCE_DDL, TARGET_DDL])
    expect(screen.getByTestId('table-drawer').style.width).toBe('1080px')
  })

  it('copies the DDL shown', () => {
    const writeText = jest.fn(() => Promise.resolve())
    Object.assign(navigator, { clipboard: { writeText } })
    renderDrawer(FULL)
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }))
    expect(writeText).toHaveBeenCalledWith(SOURCE_DDL)
    expect(screen.getByRole('button', { name: 'Copied' })).toBeTruthy()
    fireEvent.click(tab('Databricks target'))
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }))
    expect(writeText).toHaveBeenLastCalledWith(TARGET_DDL)
  })

  it('shows applied rule cards and the gap as a dashed card', () => {
    renderDrawer(FULL)
    const rules = screen.getByTestId('rules')
    expect(rules.textContent).toContain('Migration rules for Databricks')
    expect(rules.textContent).toContain('2 applied · 1 gap')
    const cards = screen.getAllByTestId('rule-card')
    expect(cards.map((c) => c.getAttribute('data-rule'))).toEqual(['ora2dbx-1', 'compression'])
    const first = cards[0]
    expect(first.textContent).toContain('partitioning')
    expect(first.textContent).toContain('deterministic')
    expect(first.textContent).toContain('verified')
    expect(within(first).getByTestId('rule-state').textContent).toBe('applied')
    expect(first.textContent).toContain(
      'On this table: PARTITION BY RANGE (sale_day) becomes CLUSTER BY (sale_day)'
    )
    const links = within(first).getAllByRole('link')
    expect(links.map((a) => a.textContent)).toEqual(['docs.oracle.com ↗', 'docs.databricks.com ↗'])
    expect(links[0].getAttribute('target')).toBe('_blank')
    const gap = screen.getByTestId('gap-card')
    expect(gap.textContent).toContain('NUMTOYMINTERVAL')
    expect(gap.style.border).toContain('dashed')
  })

  it('maps each column, exact or needs review', () => {
    renderDrawer(FULL)
    fireEvent.click(tab('Columns'))
    const rows = screen.getAllByTestId('column-row').map((r) => r.textContent)
    expect(rows).toEqual([
      'sale_idNUMBERDECIMAL(38,0)needs review',
      'amountNUMBER(12,2)DECIMAL(12,2)exact',
      'sale_dayDATEDATEneeds review',
      'channelVARCHAR2(20 CHAR)STRINGexact',
    ])
    expect(screen.getByText('Databricks type')).toBeTruthy()
  })

  it('keeps the stock drawer as the Lineage tab and the raw facets', () => {
    renderDrawer(FULL)
    fireEvent.click(tab('Lineage'))
    expect(screen.getByTestId('stock-dataset-drawer')).toBeTruthy()
    fireEvent.click(tab('Facets (raw)'))
    expect(screen.getByText(/axisMigration/)).toBeTruthy()
  })

  it('closes from its ✕', () => {
    const { onClose } = renderDrawer(FULL)
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalled()
  })
})

describe('the table drawer before conversion (no target DDL)', () => {
  it('shows the source only, without the target or side by side', () => {
    renderDrawer(NO_TARGET)
    expect(ddlText()).toEqual([SOURCE_DDL])
    expect(screen.queryByRole('tab', { name: 'Databricks target' })).toBeNull()
    expect(screen.queryByRole('tab', { name: 'Side by side' })).toBeNull()
    expect(screen.getByText('Oracle source')).toBeTruthy()
  })

  it('shows the rules as will apply', () => {
    renderDrawer(NO_TARGET)
    expect(screen.getByTestId('rules').textContent).toContain('2 apply · 1 gap')
    screen.getAllByTestId('rule-state').forEach((s) => expect(s.textContent).toBe('will apply'))
    expect(screen.getByTestId('drawer-meta').textContent).toContain('status assessed')
  })
})

describe('the table drawer with no axisMigration (today’s data)', () => {
  it('shows the Oracle source DDL with Copy, and no rules, target or side by side', () => {
    renderDrawer(NO_MIGRATION)
    expect(tab('DDL').getAttribute('aria-selected')).toBe('true')
    expect(ddlText()).toEqual([SOURCE_DDL])
    expect(screen.getByText('Oracle source')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Copy' })).toBeTruthy()
    expect(screen.queryByTestId('rules')).toBeNull()
    expect(screen.queryByTestId('side-by-side')).toBeNull()
    expect(screen.queryByRole('tab', { name: /target/ })).toBeNull()
    expect(screen.getByTestId('drawer-meta').textContent).toContain('status lineage')
  })

  it('lists the source types of the schema facet, without a target column', () => {
    renderDrawer(NO_MIGRATION)
    fireEvent.click(tab('Columns'))
    expect(screen.getAllByTestId('column-row').map((r) => r.textContent)).toEqual([
      'sale_idNUMBER',
      'amountNUMBER',
      'sale_dayDATE',
      'channelVARCHAR2',
    ])
    expect(screen.queryByText('Mapping')).toBeNull()
  })

  it('has no DDL tab without axisDdl either, and opens on Columns', () => {
    renderDrawer({ ...SCHEMA })
    expect(screen.queryByRole('tab', { name: 'DDL' })).toBeNull()
    expect(tab('Columns').getAttribute('aria-selected')).toBe('true')
    expect(screen.queryByTestId('heat-dot')).toBeNull()
  })
})

describe('editor colours follow the scheme', () => {
  it.each([
    ['light', 'light-plus', 'rgb(0, 0, 255)', 'rgb(255, 255, 255)'],
    ['xebia', 'dark-plus', 'rgb(86, 156, 214)', 'rgb(30, 30, 30)'],
  ] as const)('%s uses %s', (scheme, editor, keyword, background) => {
    expect(SCHEMES[scheme].editor).toBe(editor)
    expect(EDITOR_COLORS[editor].background).toBeTruthy()
    renderDrawer(NO_MIGRATION, scheme)
    const code = screen.getByTestId('ddl-code')
    expect(within(code).getAllByText('CREATE')[0].style.color).toBe(keyword)
    expect(code.style.background).toBe(background)
  })
})

describe('the table-level drawer host', () => {
  const host = (selected: string) => {
    const { lineage } = graphWith(FULL)
    const store = createStore(() => ({ lineage: { lineage } }))
    return render(
      <Provider store={store}>
        <MemoryRouter initialEntries={[`/lineage/dataset/oracle/x?tableLevelNode=${selected}`]}>
          <TableLevelDrawer catalog={catalog} onClose={() => undefined} />
        </MemoryRouter>
      </Provider>
    )
  }

  it('opens the table drawer for a dataset', () => {
    host('dataset:oracle:dw.fact_sales')
    expect(screen.getByTestId('table-drawer')).toBeTruthy()
  })

  it('keeps the stock drawer for a job', () => {
    host('job:oracle:etl.load_sales')
    expect(screen.queryByTestId('table-drawer')).toBeNull()
    expect(screen.getByTestId('stock-job-drawer')).toBeTruthy()
  })
})
