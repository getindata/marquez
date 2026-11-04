// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react'
import { DAX, DATES_M, IDS, NS, PAGE_FACET, nodeOf, powerBiGraph } from './powerBi.fixtures'
import { EDITOR_COLORS } from '../../routes/table-level/drawer/DdlCode'
import { JobCode, jobCodeBlocks } from '../../routes/table-level/drawer/JobCode'
import { JobDrawer } from '../../routes/table-level/drawer/JobDrawer'
import { JobTypeTile, jobTypeOf, resolveNodeMarks } from '../../layers'
import { LineageDataset } from '../../types/lineage'
import { LineageGraph } from '../../types/api'
import { MemoryRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import { SCHEMES, SchemeContext, SchemeName } from '../../theme'
import { TableDrawer } from '../../routes/table-level/drawer/TableDrawer'
import {
  TableLineageDatasetNode,
  datasetTypeOf,
} from '../../routes/table-level/TableLineageDatasetNode'
import { createStore } from 'redux'
import { fireEvent, render, screen, within } from '@testing-library/react'
import {
  nativeQueries,
  powerBiKindOf,
  readPowerBiPage,
  visualGlyphOf,
} from '../../routes/table-level/powerbi'
import TableLevelDrawer from '../../routes/table-level/TableLevelDrawer'

jest.mock('../../store/requests/jobs', () => ({
  getRuns: jest.fn(() => Promise.resolve({ totalCount: 0, runs: [] })),
}))
jest.mock('../../components/datasets/DatasetDetailPage', () => ({
  __esModule: true,
  default: () => <div data-testid='stock-dataset-drawer' />,
}))
jest.mock('../../components/jobs/JobDetailPage', () => ({
  __esModule: true,
  default: () => <div data-testid='stock-job-drawer' />,
}))

const rgb = (hex: string) =>
  `rgb(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ')})`

const withScheme = (
  scheme: SchemeName,
  ui: React.ReactElement,
  url = `/lineage?theme=${scheme}`
) => (
  <MemoryRouter initialEntries={[url]}>
    <SchemeContext.Provider value={{ scheme, tokens: SCHEMES[scheme], setScheme: () => undefined }}>
      {ui}
    </SchemeContext.Provider>
  </MemoryRouter>
)

const renderTable = (id: string, scheme: SchemeName = 'xebia', lineage = powerBiGraph()) =>
  render(
    withScheme(
      scheme,
      <TableDrawer
        node={nodeOf(lineage, id)}
        lineage={lineage}
        catalog={null}
        onClose={() => undefined}
      />
    )
  )

const tabNames = () => screen.getAllByRole('tab').map((t) => t.textContent)
const selectedTab = () =>
  screen.getAllByRole('tab').find((t) => t.getAttribute('aria-selected') === 'true')?.textContent

const datasetOf = (lineage: LineageGraph, id: string) => nodeOf(lineage, id).data as LineageDataset

describe('point 1: the Power BI glyph and captions', () => {
  it.each([
    ['page', 'Power BI page'],
    ['dax', 'DAX measures'],
    ['refresh', 'Power Query refresh'],
  ])('draws a POWERBI %s job with the Power BI glyph, captioned "%s"', (type, caption) => {
    const info = jobTypeOf({ jobType: { integration: 'POWERBI', jobType: type } })
    expect(info).toEqual({ glyph: 'powerbi', caption, hidden: false })
  })

  it('leaves a POWERBI job of another type with the gear', () => {
    expect(jobTypeOf({ jobType: { integration: 'POWERBI', jobType: 'dataflow' } }).glyph).toBe(
      'gear'
    )
  })

  it('draws the glyph as columns in Power BI yellow on a dark tile', () => {
    const { container } = render(
      <svg>
        <JobTypeTile glyph='powerbi' />
      </svg>
    )
    const tile = container.querySelector('[data-glyph="powerbi"]') as SVGElement
    expect(tile).toBeTruthy()
    const bars = tile.querySelectorAll('path')
    expect(bars.length).toBe(3)
    bars.forEach((b) => expect(b.getAttribute('fill')).toBe('#F2C811'))
  })

  it('types each powerbi:// dataset by its facets, and leaves Oracle and Excel as they were', () => {
    const lineage = powerBiGraph()
    expect(datasetTypeOf(datasetOf(lineage, IDS.dates))).toBe('Power BI table')
    expect(datasetTypeOf(datasetOf(lineage, IDS.measures))).toBe('Power BI measures')
    expect(datasetTypeOf(datasetOf(lineage, IDS.page))).toBe('Power BI page')
    expect(datasetTypeOf(datasetOf(lineage, IDS.oracle))).toBe('table')
    expect(powerBiKindOf(datasetOf(lineage, IDS.oracle))).toBeNull()
    expect(powerBiKindOf(datasetOf(lineage, IDS.excel))).toBeNull()
  })

  const card = (id: string) => {
    const lineage = powerBiGraph()
    const dataset = datasetOf(lineage, id)
    const store = createStore(() => ({ dataset: { result: null } }))
    return render(
      <Provider store={store}>
        {withScheme(
          'xebia',
          <svg>
            <TableLineageDatasetNode
              node={{
                id,
                kind: 'DATASET',
                width: 190,
                height: 46,
                bottomLeftCorner: { x: 0, y: 0 },
                data: {
                  dataset,
                  marks: resolveNodeMarks({ catalog: null, active: new Set() }, 'dataset', {}),
                  showFields: false,
                },
              }}
            />
          </svg>
        )}
      </Provider>
    )
  }

  it('marks a Power BI dataset card with the glyph and its type', () => {
    card(IDS.measures)
    const mark = screen.getByTestId('powerbi-mark')
    expect(mark.querySelector('[data-glyph="powerbi"]')).toBeTruthy()
    expect(screen.getByTestId('dataset-sub').textContent).toBe(`${NS} · Power BI measures`)
  })

  it('leaves an Oracle table card without the mark, reading "oracle · table"', () => {
    card(IDS.oracle)
    expect(screen.queryByTestId('powerbi-mark')).toBeNull()
    expect(screen.getByTestId('dataset-sub').textContent).toBe('oracle · table')
  })

  it('leaves an excel:// external with its generic look and its external status', () => {
    card(IDS.excel)
    expect(screen.queryByTestId('powerbi-mark')).toBeNull()
    renderTable(IDS.excel)
    expect(screen.getAllByTestId('drawer-status').pop()?.textContent).toBe('external')
  })

  it('puts the mark and the type in the table drawer header too', () => {
    renderTable(IDS.page)
    const mark = screen.getByTestId('powerbi-mark')
    expect(mark.querySelector('[data-glyph="powerbi"]')).toBeTruthy()
    expect(screen.getByText(`${NS} · Power BI page`)).toBeTruthy()
  })

  it('draws a refresh job’s drawer header with the glyph and "Power Query refresh"', () => {
    const lineage = powerBiGraph()
    render(
      withScheme(
        'dark',
        <JobDrawer
          node={nodeOf(lineage, IDS.ordersRefresh)}
          lineage={lineage}
          catalog={null}
          onClose={() => undefined}
        />
      )
    )
    const header = screen.getByTestId('job-drawer-header')
    expect(header.querySelector('[data-glyph="powerbi"]')).toBeTruthy()
    expect(screen.getByTestId('drawer-meta').textContent).toContain('Power Query refresh')
  })
})

describe('point 2: Power BI nodes open the Axis drawers', () => {
  it('opens a model table on Columns, then Power Query M, with no DDL tab', () => {
    renderTable(IDS.dates)
    expect(tabNames()).toEqual(['Columns', 'Power Query M', 'Lineage', 'Facets (raw)'])
    expect(selectedTab()).toBe('Columns')
    const rows = screen.getAllByTestId('column-row').map((r) => r.textContent)
    expect(rows).toEqual(['DAYdateTime', 'Monthstring', 'Quarterstring'])
    expect(screen.getByRole('columnheader', { name: 'Type' })).toBeTruthy()
  })

  it('shows the M of the refresh that loads the table, highlighted, with a link to the job', () => {
    renderTable(IDS.dates)
    fireEvent.click(screen.getByRole('tab', { name: 'Power Query M' }))
    const link = screen.getByTestId('writer-job')
    expect(link.textContent).toBe('Dates.refresh')
    expect(
      new URLSearchParams(link.getAttribute('href')?.split('?')[1]).get('tableLevelNode')
    ).toBe(IDS.datesRefresh)
    const code = within(screen.getByTestId('job-code-sourceCode')).getByTestId('ddl-code')
    expect(code.textContent).toBe(DATES_M)
    expect(code.textContent).toContain('Oracle.Database(')
  })

  it('opens the measures on DAX, then Columns', () => {
    renderTable(IDS.measures)
    expect(tabNames()).toEqual(['DAX', 'Columns', 'Lineage', 'Facets (raw)'])
    expect(selectedTab()).toBe('DAX')
    expect(screen.getByTestId('writer-job').textContent).toBe('shop-report.measures')
    expect(screen.getByTestId('job-code-sourceCode').textContent).toContain(
      'Revenue = SUM(Orders[AMOUNT])'
    )
  })

  it('opens a page on Page, then Fields and Lineage', () => {
    renderTable(IDS.page)
    expect(tabNames()).toEqual(['Page', 'Fields', 'Lineage', 'Facets (raw)'])
    expect(selectedTab()).toBe('Page')
    fireEvent.click(screen.getByRole('tab', { name: 'Fields' }))
    expect(screen.getAllByTestId('column-row')).toHaveLength(7)
    fireEvent.click(screen.getByRole('tab', { name: 'Lineage' }))
    expect(
      within(screen.getByTestId('lineage-upstream')).getByTestId('lineage-job').textContent
    ).toBe('shop-report: Overview.render')
  })

  it('leaves the M tab out when the graph does not hold the table’s refresh', () => {
    const lineage = powerBiGraph()
    lineage.graph = lineage.graph.filter((n) => n.id !== IDS.datesRefresh)
    renderTable(IDS.dates, 'xebia', lineage)
    expect(tabNames()).toEqual(['Columns', 'Lineage', 'Facets (raw)'])
  })

  const host = (selected: string) => {
    const lineage = powerBiGraph()
    const store = createStore(() => ({ lineage: { lineage } }))
    return render(
      <Provider store={store}>
        <MemoryRouter
          initialEntries={[`/lineage/dataset/x/y?tableLevelNode=${encodeURIComponent(selected)}`]}
        >
          <TableLevelDrawer catalog={null} onClose={() => undefined} />
        </MemoryRouter>
      </Provider>
    )
  }

  it.each([IDS.datesRefresh, IDS.measuresJob, IDS.render])(
    'opens the Axis job drawer for %s, not the stock one',
    (id) => {
      host(id)
      expect(screen.getByTestId('job-drawer')).toBeTruthy()
      expect(screen.queryByTestId('stock-job-drawer')).toBeNull()
    }
  )

  it('opens the Axis table drawer for each Power BI dataset, not the stock one', () => {
    ;[IDS.dates, IDS.measures, IDS.page].forEach((id) => {
      const { unmount } = host(id)
      expect(screen.getByTestId('table-drawer')).toBeTruthy()
      expect(screen.queryByTestId('stock-dataset-drawer')).toBeNull()
      unmount()
    })
  })
})

describe('point 3: the Page tab', () => {
  const boxes = () => screen.getAllByTestId('page-visual')

  it('draws each visual at its position, scaled to the page, in z order', () => {
    renderTable(IDS.page)
    const wireframe = screen.getByTestId('page-wireframe')
    // 720 / 1280: the page keeps its aspect ratio at the drawer's width
    expect(wireframe.style.paddingTop).toBe('56.25%')
    expect(boxes().map((b) => within(b).getByTestId('visual-title').textContent)).toEqual([
      'Revenue',
      'Orders count',
      'YoY %',
      'multi row card',
      'Revenue by month',
      'YoY % by quarter',
      'Orders by year',
    ])
    const table = boxes()[6]
    expect(table.style.left).toBe(`${(20 / 1280) * 100}%`)
    expect(table.style.top).toBe(`${(440 / 720) * 100}%`)
    expect(table.style.width).toBe(`${(1240 / 1280) * 100}%`)
    expect(table.style.height).toBe(`${(260 / 720) * 100}%`)
    expect(boxes().map((b) => b.style.zIndex)).toEqual(['1', '2', '3', '4', '5', '6', '7'])
  })

  it('puts the four cards in one row, the line and column charts under them, the table last', () => {
    renderTable(IDS.page)
    const tops = boxes().map((b) => b.style.top)
    expect(new Set(tops.slice(0, 4)).size).toBe(1)
    expect(tops[4]).toBe(tops[5])
    expect(parseFloat(tops[6])).toBeGreaterThan(parseFloat(tops[4]))
  })

  it('gives each visual its type glyph and its fields as chips', () => {
    renderTable(IDS.page)
    expect(
      boxes().map((b) => b.querySelector('[data-visual-glyph]')?.getAttribute('data-visual-glyph'))
    ).toEqual(['card', 'card', 'card', 'card', 'line', 'column', 'table'])
    const chips = within(boxes()[4]).getAllByTestId('field-chip')
    expect(chips.map((c) => [c.textContent, c.getAttribute('title')])).toEqual([
      ['Month', 'Dates.Month'],
      ['Revenue', 'Orders.Revenue'],
    ])
  })

  it.each([
    ['card', 'card'],
    ['multiRowCard', 'card'],
    ['tableEx', 'table'],
    ['pivotTable', 'table'],
    ['lineChart', 'line'],
    ['areaChart', 'line'],
    ['clusteredBarChart', 'column'],
    ['columnChart', 'column'],
    ['pieChart', 'pie'],
    ['donutChart', 'pie'],
    ['slicer', 'slicer'],
    ['map', 'generic'],
  ])('draws a %s with the %s glyph', (type, glyph) => {
    expect(visualGlyphOf(type)).toBe(glyph)
  })

  it('highlights the field in the page’s field list while its chip is hovered', () => {
    renderTable(IDS.page)
    const field = () =>
      screen
        .getAllByTestId('page-field')
        .find((f) => f.dataset.field === 'Dates.Month') as HTMLElement
    expect(field().dataset.highlighted).toBeUndefined()
    const chip = within(boxes()[4]).getAllByTestId('field-chip')[0]
    fireEvent.mouseEnter(chip)
    expect(field().dataset.highlighted).toBe('true')
    expect(
      screen.getAllByTestId('page-field').filter((f) => f.dataset.highlighted === 'true')
    ).toHaveLength(1)
    fireEvent.mouseLeave(chip)
    expect(field().dataset.highlighted).toBeUndefined()
  })

  it('lists a visual with no position under the page, not on it', () => {
    const facet = {
      ...PAGE_FACET,
      visuals: [...PAGE_FACET.visuals, { type: 'slicer', title: 'Year', fields: ['Dates.Year'] }],
    }
    renderTable(IDS.page, 'xebia', powerBiGraph(facet))
    expect(boxes()).toHaveLength(7)
    const unplaced = within(screen.getByTestId('unplaced-visuals')).getAllByTestId(
      'unplaced-visual'
    )
    expect(unplaced).toHaveLength(1)
    expect(unplaced[0].textContent).toContain('Year')
    expect(unplaced[0].querySelector('[data-visual-glyph="slicer"]')).toBeTruthy()
  })

  it('lists every visual, with no wireframe, when the facet has no layout keys (older readers)', () => {
    const facet = {
      visuals: PAGE_FACET.visuals.map(({ type, title, fields }) => ({ type, title, fields })),
    }
    renderTable(IDS.page, 'xebia', powerBiGraph(facet))
    expect(screen.queryByTestId('page-wireframe')).toBeNull()
    expect(screen.getAllByTestId('unplaced-visual')).toHaveLength(7)
  })

  it('reads a malformed page facet without throwing, dropping what it cannot place', () => {
    expect(readPowerBiPage({})).toBeNull()
    expect(readPowerBiPage({ axisPowerBiPage: 'x' })).toBeNull()
    const page = readPowerBiPage({
      axisPowerBiPage: {
        width: 1280,
        height: 720,
        visuals: [
          null,
          { type: 'card', x: 10, y: 10, width: 100, height: 0 },
          { type: 'card', x: 0, y: 0, width: 200, height: 100, fields: [1, 'T.a'] },
        ],
      },
    })
    expect(page?.visuals.map((v) => !!v.position)).toEqual([false, true])
    expect(page?.visuals[1].fields).toEqual(['T.a'])
  })

  it.each(['xebia', 'dark', 'light'] as const)(
    'draws the page in the %s scheme’s colours',
    (scheme) => {
      renderTable(IDS.page, scheme)
      expect(boxes()[0].style.background).toBe(rgb(SCHEMES[scheme].card))
      expect(within(boxes()[0]).getByTestId('visual-title').style.color).toBe(
        rgb(SCHEMES[scheme].text)
      )
    }
  )
})

describe('out-of-range page geometry', () => {
  const withVisual = (visual: object, size: object = { width: 1280, height: 720 }) => ({
    ...PAGE_FACET,
    ...size,
    visuals: [
      ...PAGE_FACET.visuals,
      { type: 'card', title: 'Odd', fields: ['Orders.Revenue'], ...visual },
    ],
  })
  const placedTitles = () =>
    screen
      .getAllByTestId('page-visual')
      .map((b) => within(b).getByTestId('visual-title').textContent)
  const unplacedTitles = () =>
    screen
      .queryAllByTestId('unplaced-visual')
      .map((v) => within(v).getByTestId('visual-title').textContent)

  it.each([
    ['at a negative x', { x: -40, y: 20, width: 100, height: 100 }],
    ['at a negative y', { x: 20, y: -20, width: 100, height: 100 }],
    ['past the right edge', { x: 1200, y: 20, width: 100, height: 100 }],
    ['past the bottom edge', { x: 20, y: 700, width: 100, height: 100 }],
    ['larger than the page', { x: 0, y: 0, width: 2000, height: 10000 }],
  ])('lists a visual %s under the page instead of drawing it', (_, geometry) => {
    renderTable(IDS.page, 'xebia', powerBiGraph(withVisual(geometry)))
    expect(placedTitles()).toHaveLength(7)
    expect(placedTitles()).not.toContain('Odd')
    expect(unplacedTitles()).toEqual(['Odd'])
  })

  it('draws a visual that fills the page exactly', () => {
    renderTable(
      IDS.page,
      'xebia',
      powerBiGraph(withVisual({ x: 0, y: 0, width: 1280, height: 720 }))
    )
    expect(placedTitles()).toContain('Odd')
  })

  it.each([
    ['no size', { width: undefined, height: undefined }],
    ['no height', { height: undefined }],
    ['a zero width', { width: 0 }],
    ['a negative height', { height: -720 }],
    ['an absurd width', { width: 20000 }],
    ['an absurd height', { height: 10001 }],
    ['a size that is not a number', { width: '1280' }],
  ])('draws no wireframe for a page with %s, and lists all its visuals', (_, size) => {
    renderTable(IDS.page, 'xebia', powerBiGraph({ ...PAGE_FACET, ...size }))
    expect(screen.queryByTestId('page-wireframe')).toBeNull()
    expect(unplacedTitles()).toHaveLength(7)
  })

  it('reads a page with no usable size as having none, and none of its visuals placed', () => {
    const page = readPowerBiPage({ axisPowerBiPage: { ...PAGE_FACET, width: 20000 } })
    expect([page?.width, page?.height]).toEqual([null, 720])
    expect(page?.visuals.every((v) => v.position === null)).toBe(true)
  })
})

describe('point 4: DAX and Power Query M highlighted', () => {
  const renderCode = (facets: object, scheme: SchemeName = 'dark') =>
    render(withScheme(scheme, <JobCode facets={facets} />))
  const lineage = powerBiGraph()
  const facetsOf = (id: string) => (nodeOf(lineage, id).data as { facets: object }).facets

  it.each([
    ['dark', 'dark-plus'],
    ['light', 'light-plus'],
  ] as const)('labels DAX and colours it as VS Code does in %s', (scheme, editor) => {
    renderCode(facetsOf(IDS.measuresJob), scheme)
    const block = screen.getByTestId('job-code-sourceCode')
    expect(within(block).getByText('DAX')).toBeTruthy()
    const code = within(block).getByTestId('ddl-code')
    const c = EDITOR_COLORS[editor]
    expect(within(code).getAllByText('SUM')[0].style.color).toBe(rgb(c.function))
    expect(within(code).getByText('Orders[AMOUNT]').style.color).toBe(rgb(c.variable))
    expect(within(code).getByText("'Dates'[DAY]").style.color).toBe(rgb(c.variable))
    expect(within(code).getAllByText('[Revenue]')[0].style.color).toBe(rgb(c.variable))
    expect(within(code).getByText('VAR').style.color).toBe(rgb(c.keyword))
    expect(within(code).getByText('-- year over year').style.color).toBe(rgb(c.comment))
    expect(code.textContent).toBe(DAX)
  })

  it('labels Power Query M and colours its keywords, strings and comments', () => {
    renderCode(facetsOf(IDS.ordersRefresh))
    const block = screen.getByTestId('job-code-sourceCode')
    expect(within(block).getByText('Power Query M')).toBeTruthy()
    const code = within(block).getByTestId('ddl-code')
    const c = EDITOR_COLORS['dark-plus']
    expect(within(code).getByText('let').style.color).toBe(rgb(c.keyword))
    expect(within(code).getByText('"db:1521/SHOP"').style.color).toBe(rgb(c.string))
    expect(within(code).getByText('Oracle.Database').style.color).toBe(rgb(c.function))
    expect(within(code).getByText('// the monthly roll-up runs in the database').style.color).toBe(
      rgb(c.comment)
    )
  })

  it('shows a refresh’s native query beneath its M, as SQL in the connector’s dialect', () => {
    renderCode(facetsOf(IDS.ordersRefresh))
    expect(jobCodeBlocks(facetsOf(IDS.ordersRefresh)).map((b) => b.facet)).toEqual([
      'sourceCode',
      'nativeQuery-0',
    ])
    const native = screen.getByTestId('job-code-nativeQuery-0')
    expect(within(native).getByText('Native query · SQL · Oracle')).toBeTruthy()
    const code = within(native).getByTestId('ddl-code')
    // M's escapes undone: #(lf) is a new line, "" a quote
    expect(code.textContent).toBe(
      'SELECT d.year AS order_year, SUM(o.amount) AS revenue\nFROM dw.fact_orders o JOIN dw.dim_date d ON d.day = o.order_day\nWHERE o.status = "paid"\nGROUP BY d.year'
    )
    expect(within(code).getByText('SELECT').style.color).toBe(
      rgb(EDITOR_COLORS['dark-plus'].keyword)
    )
  })

  it('adds no native query block to M that has none', () => {
    expect(jobCodeBlocks(facetsOf(IDS.datesRefresh)).map((b) => b.facet)).toEqual(['sourceCode'])
  })

  it('reads each native query with its connector’s dialect', () => {
    expect(
      nativeQueries(
        'let A = Sql.Database("h", "db", [Query="SELECT 1"]), B = Value.Type(A), C = Snowflake.Databases("x"){[Query="SELECT 2"]} in A'
      )
    ).toEqual([
      { sql: 'SELECT 1', dialect: 'sqlserver' },
      { sql: 'SELECT 2', dialect: 'snowflake' },
    ])
    expect(nativeQueries('let A = Csv.Document(File.Contents("x"), [Query="  "]) in A')).toEqual([])
    // a connector this UI has no dialect for: plain SQL
    expect(nativeQueries('let A = Exasol.Database("h", [Query="SELECT 3"]) in A')).toEqual([
      { sql: 'SELECT 3', dialect: '' },
    ])
  })

  it('keeps PL/SQL source code labelled and highlighted as before', () => {
    expect(
      jobCodeBlocks({ sourceCode: { language: 'plsql', sourceCode: 'BEGIN NULL; END;' } }).map(
        (b) => [b.label, b.dialect]
      )
    ).toEqual([['Source code · PL/SQL', 'oracle']])
  })
})
