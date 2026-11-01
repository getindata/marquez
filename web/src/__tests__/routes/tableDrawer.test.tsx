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
  neighbourGraph,
  neighbourNode,
} from './tableDrawer.fixtures'
import { DESIGN_CATALOG, FULL_CATALOG, axisLayers, piiTags } from '../layers/fixtures'
import { EDITOR_COLORS } from '../../routes/table-level/drawer/DdlCode'
import { LayerCatalog, parseLayerCatalog } from '../../layers'
import { LineageGraph } from '../../types/api'
import { LineageNode } from '../../types/lineage'
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

/** The graph's URL the drawer opens on: its query must survive every link the drawer follows. */
const GRAPH_URL =
  '/lineage/dataset/oracle/dw.fact_sales?theme=xebia&layers=wave&depth=3&tableLevelNode=dataset%3Aoracle%3Adw.fact_sales'

const renderNode = (
  node: LineageNode,
  lineage: LineageGraph,
  scheme: SchemeName = 'dark',
  layerCatalog: LayerCatalog = catalog
) => {
  const onClose = jest.fn()
  const utils = render(
    <MemoryRouter initialEntries={[GRAPH_URL]}>
      <SchemeContext.Provider
        value={{ scheme, tokens: SCHEMES[scheme], setScheme: () => undefined }}
      >
        <TableDrawer node={node} lineage={lineage} catalog={layerCatalog} onClose={onClose} />
      </SchemeContext.Provider>
    </MemoryRouter>
  )
  return { ...utils, onClose }
}

const renderDrawer = (facets: object, scheme: SchemeName = 'dark') => {
  const { node, lineage } = graphWith(facets)
  return renderNode(node, lineage, scheme)
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

  it('read a rule state other than applied or will_apply as unknown, never as will apply', () => {
    const rule = (state: unknown) => ({ id: 'r', state })
    const m = readAxisMigration({
      axisMigration: {
        rules: [
          rule('applied'),
          rule('will_apply'),
          rule(undefined),
          rule('APPLIED!'),
          rule(3),
          { id: 'no state' },
        ],
      },
    })
    expect(m?.rules.map((r) => r.state)).toEqual([
      'applied',
      'will_apply',
      'unknown',
      'unknown',
      'unknown',
      'unknown',
    ])
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

  it('shows the migration and the reconcile status together, as the mockup does', () => {
    renderDrawer({ ...FULL, axisStatus: { state: 'reconciled' } })
    const status = screen.getByTestId('drawer-status')
    expect(status.textContent).toBe('converted · reconcile ✓')
  })

  it('shows a failed reconcile, and any other state as given, after the migration status', () => {
    const { unmount } = renderDrawer({ ...FULL, axisStatus: { state: 'failed' } })
    expect(screen.getByTestId('drawer-status').textContent).toBe('converted · reconcile ✗')
    unmount()
    renderDrawer({ ...FULL, axisStatus: { state: 'lineage' } })
    expect(screen.getByTestId('drawer-status').textContent).toBe('converted · lineage')
  })

  it('does not repeat a state both facets give', () => {
    renderDrawer({ ...FULL, axisStatus: { state: 'converted' } })
    expect(screen.getByTestId('drawer-status').textContent).toBe('converted')
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

  it('shows the raw facets, and only them, as Facets (raw)', () => {
    renderDrawer(FULL)
    fireEvent.click(tab('Facets (raw)'))
    expect(screen.getByText(/axisMigration/)).toBeTruthy()
    expect(screen.queryByTestId('lineage-tab')).toBeNull()
    expect(screen.queryByTestId('stock-dataset-drawer')).toBeNull()
  })

  it('closes from its ✕', () => {
    const { onClose } = renderDrawer(FULL)
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalled()
  })
})

describe('a rule of unknown state', () => {
  it('is shown as unknown, in the neutral colour, and the count does not call it applied', () => {
    const facets = { ...FULL, ...migration('applied') }
    facets.axisMigration.rules[1] = { ...facets.axisMigration.rules[1], state: 'bogus' }
    renderDrawer(facets)
    const states = screen.getAllByTestId('rule-state')
    expect(states.map((s) => s.textContent)).toEqual(['applied', 'unknown'])
    expect(states[1].style.color).not.toBe(states[0].style.color)
    expect(screen.getByTestId('rules').textContent).not.toContain('2 applied')
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

describe('a large DDL', () => {
  // 6,000 lines, about 250 KB: over both limits of DdlCode
  const LARGE_DDL = Array.from(
    { length: 6000 },
    (_, i) => `  col_${i} VARCHAR2(30) NOT NULL, -- column number ${i} of a wide table`
  ).join('\n')

  it('is shown as escaped plain text, not tokenised, with a note', () => {
    const { container } = renderDrawer({
      ...SCHEMA,
      axisDdl: { dialect: 'oracle', language: 'sql', text: `<img src=x>\n${LARGE_DDL}` },
    })
    const plain = screen.getByTestId('ddl-plain')
    expect(container.querySelectorAll('.token').length).toBe(0)
    expect(container.querySelector('img')).toBeNull()
    expect(plain.textContent?.startsWith('<img src=x>')).toBe(true)
    expect(plain.textContent?.split('\n').length).toBeLessThanOrEqual(5000)
    expect(screen.getByTestId('ddl-large-note').textContent).toContain('Highlighting is off')
  })

  it('is still copied in full', () => {
    const writeText = jest.fn(() => Promise.resolve())
    Object.assign(navigator, { clipboard: { writeText } })
    renderDrawer({ ...SCHEMA, axisDdl: { dialect: 'oracle', language: 'sql', text: LARGE_DDL } })
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }))
    expect(writeText).toHaveBeenCalledWith(LARGE_DDL)
  })

  it('under the limits is highlighted as before', () => {
    const { container } = renderDrawer(FULL)
    expect(screen.queryByTestId('ddl-large-note')).toBeNull()
    expect(container.querySelectorAll('.token').length).toBeGreaterThan(0)
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

describe('the Lineage tab', () => {
  const openLineage = (name: string) => {
    const lineage = neighbourGraph()
    const utils = renderNode(neighbourNode(lineage, name), lineage)
    fireEvent.click(tab('Lineage'))
    return utils
  }
  const side = (title: 'upstream' | 'downstream') => within(screen.getByTestId(`lineage-${title}`))
  const hrefOf = (el: HTMLElement) => el.getAttribute('href') as string
  const queryOf = (el: HTMLElement) => new URLSearchParams(hrefOf(el).split('?')[1])

  it('lists the real writers upstream, each with what it reads, without the own table job', () => {
    openLineage('dw.fact_sales')
    const up = side('upstream')
    expect(up.getAllByTestId('lineage-job').map((a) => a.textContent)).toEqual(['etl.load_sales'])
    expect(up.queryByTestId('lineage-direct')).toBeNull()
    expect(up.getAllByTestId('lineage-dataset').map((a) => a.textContent)).toEqual([
      'stg.channels',
      'stg.sales_raw',
    ])
    expect(up.getByText('PL/SQL procedure')).toBeTruthy()
  })

  it('shows the job type icon, wave chip and orchestrator badge as on the cards', () => {
    openLineage('dw.fact_sales')
    const up = side('upstream')
    expect(up.getByTestId('lineage-row').querySelector('[data-glyph="plsql"]')).toBeTruthy()
    expect(up.getByTestId('wave-chip').textContent).toBe('Wave 1')
    expect(up.getByTestId('orchestrator-badge')).toBeTruthy()
  })

  it('lists the readers downstream, each with what it writes, and collapses a view’s own DDL', () => {
    openLineage('dw.fact_sales')
    const down = side('downstream')
    expect(down.getAllByTestId('lineage-job').map((a) => a.textContent)).toEqual([
      'rpt.refresh_daily',
    ])
    expect(down.getByTestId('lineage-direct').textContent).toBe('Read by the DDL of')
    expect(down.getAllByTestId('lineage-dataset').map((a) => a.textContent)).toEqual([
      'rpt.v_sales',
      'rpt.daily_sales',
    ])
    expect(screen.queryByText('axis.layers')).toBeNull()
  })

  it('shows a view’s own DDL upstream as the tables it reads', () => {
    openLineage('rpt.v_sales')
    const up = side('upstream')
    expect(up.queryByTestId('lineage-job')).toBeNull()
    expect(up.getByTestId('lineage-direct').textContent).toBe('Its own DDL reads')
    expect(up.getByTestId('lineage-dataset').textContent).toBe('dw.fact_sales')
    expect(side('downstream').getByTestId('lineage-empty').textContent).toBe('No downstream jobs')
  })

  it('says so in one muted line when a side is empty', () => {
    openLineage('stg.sales_raw')
    expect(side('upstream').getByTestId('lineage-empty').textContent).toBe('No upstream jobs')
    expect(side('upstream').queryByTestId('lineage-row')).toBeNull()
    expect(side('downstream').getByTestId('lineage-job').textContent).toBe('etl.load_sales')
  })

  it('links each job and dataset to its node in the graph, keeping the query', () => {
    openLineage('dw.fact_sales')
    const writer = side('upstream').getByTestId('lineage-job')
    expect(hrefOf(writer).split('?')[0]).toBe('/lineage/job/oracle/etl.load_sales')
    const input = side('upstream').getAllByTestId('lineage-dataset')[1]
    expect(hrefOf(input).split('?')[0]).toBe('/lineage/dataset/oracle/stg.sales_raw')
    for (const link of [writer, input]) {
      const q = queryOf(link)
      expect(q.get('theme')).toBe('xebia')
      expect(q.get('layers')).toBe('wave')
      expect(q.get('depth')).toBe('3')
    }
    expect(queryOf(writer).get('tableLevelNode')).toBe('job:oracle:etl.load_sales')
    expect(queryOf(input).get('tableLevelNode')).toBe('dataset:oracle:stg.sales_raw')
  })

  it('links to the stock column-level view of the table, in the same scheme', () => {
    openLineage('dw.fact_sales')
    expect(hrefOf(screen.getByTestId('column-lineage'))).toBe(
      '/datasets/column-level/oracle/dw.fact_sales?theme=xebia'
    )
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

  it('shows its own lineage, not the stock dataset drawer, as the Lineage tab', () => {
    host('dataset:oracle:dw.fact_sales')
    fireEvent.click(screen.getByRole('tab', { name: 'Lineage' }))
    expect(screen.getByTestId('lineage-tab')).toBeTruthy()
    expect(screen.queryByTestId('stock-dataset-drawer')).toBeNull()
  })

  it('keeps the stock drawer for a job', () => {
    host('job:oracle:etl.load_sales')
    expect(screen.queryByTestId('table-drawer')).toBeNull()
    expect(screen.getByTestId('stock-job-drawer')).toBeTruthy()
  })
})

describe('descriptions, PII and the LAY-10 layers in the drawer', () => {
  const DESCRIBED = {
    ...SCHEMA,
    documentation: { description: 'Sales facts, one row per receipt line.' },
    schema: {
      fields: [
        { name: 'sale_id', type: 'NUMBER', description: 'Key of the sale.' },
        { name: 'email', type: 'VARCHAR2' },
      ],
    },
    ...piiTags({ email: 'email' }),
  }

  it("shows the table's description under its name", () => {
    renderDrawer(DESCRIBED)
    expect(screen.getByTestId('drawer-description').textContent).toBe(
      'Sales facts, one row per receipt line.'
    )
  })

  it('has no description line without one', () => {
    renderDrawer({ ...SCHEMA })
    expect(screen.queryByTestId('drawer-description')).toBeNull()
  })

  it("shows each column's description under its name, and marks the PII column with its kind", () => {
    renderDrawer(DESCRIBED)
    const rows = screen.getAllByTestId('column-row')
    expect(within(rows[0]).getByTestId('column-description').textContent).toBe('Key of the sale.')
    expect(within(rows[0]).queryByTestId('pii-marker')).toBeNull()
    expect(within(rows[1]).queryByTestId('column-description')).toBeNull()
    expect(within(rows[1]).getByTestId('pii-chip').textContent).toBe('email')
    expect(within(rows[1]).getByTestId('pii-marker').getAttribute('aria-label')).toBe(
      'Personal data: email'
    )
  })

  it('keeps the descriptions when the migration maps the columns', () => {
    renderDrawer({ ...DESCRIBED, ...migration('applied') })
    fireEvent.click(tab('Columns'))
    const row = screen
      .getAllByTestId('column-row')
      .find((r) => r.textContent?.startsWith('sale_id'))!
    expect(within(row).getByTestId('column-description').textContent).toBe('Key of the sale.')
  })

  it('shows the zone chip, the size and the status dot in the header', () => {
    const full = parseLayerCatalog(FULL_CATALOG).catalog as LayerCatalog
    const { node, lineage } = graphWith({
      ...SCHEMA,
      ...axisLayers({ wave: 1, zone: 'core', size: 1288490188, status: 'reconciled' }),
    })
    renderNode(node, lineage, 'dark', full)
    expect(screen.getByTestId('tag-chip').textContent).toBe('core')
    expect(screen.getByTestId('size-label').textContent).toBe('1.2 GB')
    expect(screen.getByTestId('status-dot').style.background).toBe('rgb(34, 197, 94)')
    // with no migration or reconcile facet, the status line is the layer's
    expect(screen.getByTestId('drawer-status').textContent).toBe('reconciled')
  })
})
