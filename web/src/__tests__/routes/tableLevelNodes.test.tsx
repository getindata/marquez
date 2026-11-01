// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react'
import {
  DESIGN_CATALOG,
  FULL_CATALOG,
  axisLayers,
  axisPii,
  columnLineage,
  piiTags,
} from '../layers/fixtures'
import {
  LayerCatalog,
  LayerView,
  NO_LAYERS,
  jobTypeOf,
  parseLayerCatalog,
  resolveNodeMarks,
} from '../../layers'
import { LineageDataset, LineageJob } from '../../types/lineage'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { TableLineageDatasetNode } from '../../routes/table-level/TableLineageDatasetNode'
import { SCHEMES } from '../../theme/schemes'
import { fireEvent, render, screen, within } from '@testing-library/react'
import TableLineageJobNode from '../../routes/table-level/TableLineageJobNode'
import { clearFieldOriginCache } from '../../routes/table-level/columnOrigins'

const catalog = parseLayerCatalog(DESIGN_CATALOG).catalog as LayerCatalog
const ALL_ON: LayerView = {
  catalog,
  active: new Set(['wave', 'orchestrator', 'heat', 'complexity']),
}
const ALL_OFF: LayerView = { catalog, active: new Set() }

const dataset = (
  facets: object | undefined,
  fieldCount = 6,
  descriptions: Record<string, string> = {}
): LineageDataset =>
  ({
    id: { namespace: 'oracle', name: 'dw.fact_sales' },
    type: 'DB_TABLE',
    name: 'dw.fact_sales',
    namespace: 'oracle',
    fields: Array.from({ length: fieldCount }, (_, i) => ({
      name: `col_${i}`,
      type: 'NUMBER(12,2)',
      tags: [],
      description: descriptions[`col_${i}`] ?? null,
    })),
    facets,
  } as unknown as LineageDataset)

const job = (facets: Record<string, unknown> | undefined): LineageJob =>
  ({
    id: { namespace: 'oracle', name: 'etl.load_sales' },
    type: 'BATCH',
    name: 'etl.load_sales',
    namespace: 'oracle',
    latestRun: null,
    facets,
  } as unknown as LineageJob)

const DATASET_FACETS = axisLayers({ wave: 1, heat: 8400, complexity: 0.64 })
const JOB_FACETS = {
  jobType: { processingType: 'BATCH', integration: 'ORACLE', jobType: 'procedure' },
  ...axisLayers({ wave: 1, orchestrator: 'oracle', complexity: 0.71 }),
}

const inRouter = (ui: React.ReactElement, path = '/lineage/dataset/oracle/other') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path='/lineage/:nodeType/:namespace/:name' element={ui} />
      </Routes>
    </MemoryRouter>
  )

const renderDataset = (
  view: LayerView,
  facets: object | undefined,
  showFields = true,
  descriptions: Record<string, string> = {}
) => {
  const data = dataset(facets, 6, descriptions)
  const node = {
    id: 'dataset:oracle:dw.fact_sales',
    kind: 'DATASET' as const,
    width: 190,
    height: 200,
    bottomLeftCorner: { x: 0, y: 0 },
    data: { dataset: data, marks: resolveNodeMarks(view, 'dataset', facets), showFields },
  }
  return inRouter(
    <svg>
      <TableLineageDatasetNode node={node} />
    </svg>
  )
}

const renderJob = (view: LayerView, facets: Record<string, unknown> | undefined, path?: string) => {
  const node = {
    id: 'job:oracle:etl.load_sales',
    kind: 'JOB' as const,
    width: 180,
    height: 52,
    bottomLeftCorner: { x: 0, y: 0 },
    data: {
      job: job(facets),
      jobType: jobTypeOf(facets),
      marks: resolveNodeMarks(view, 'job', facets),
    },
  }
  return inRouter(
    <svg>
      <TableLineageJobNode node={node} />
    </svg>,
    path
  )
}

const q = (c: HTMLElement, id: string) => c.querySelector(`[data-testid="${id}"]`) as HTMLElement

describe('dataset node', () => {
  it('draws every layer when all are on', () => {
    const { container } = renderDataset(ALL_ON, DATASET_FACETS)
    const card = q(container, 'dataset-card')
    expect(card.style.border).toBe('1px solid #3fa7d6') // exactly the wave colour
    expect(q(container, 'wave-chip').textContent).toBe('Wave 1')
    expect(q(container, 'wave-accent')).not.toBeNull()
    expect(q(container, 'heat-dot').style.background).toBe('rgb(220, 38, 38)')
    expect(q(container, 'meter-row').textContent).toBe('complexity0.64')
    expect(container.textContent).toContain('oracle · table')
  })

  it('shows at most four column rows, then the rest as a count', () => {
    const { container } = renderDataset(ALL_ON, DATASET_FACETS)
    const rows = container.querySelectorAll('[data-testid="field-row"]')
    expect(rows).toHaveLength(4)
    expect(rows[0].textContent).toBe('col_0number(12,2)')
    expect(q(container, 'more-fields').textContent).toBe('+ 2 more fields')
  })

  it('hides the rows when compact or collapsed', () => {
    const { container } = renderDataset(ALL_ON, DATASET_FACETS, false)
    expect(container.querySelectorAll('[data-testid="field-row"]')).toHaveLength(0)
    expect(q(container, 'more-fields')).toBeNull()
  })

  it.each(['wave', 'heat', 'complexity'])('turning %s off hides only its marks', (off) => {
    const active = new Set(ALL_ON.active)
    active.delete(off)
    const { container } = renderDataset({ catalog, active }, DATASET_FACETS)
    expect(!!q(container, 'wave-chip')).toBe(off !== 'wave')
    expect(!!q(container, 'wave-accent')).toBe(off !== 'wave')
    expect(!!q(container, 'heat-dot')).toBe(off !== 'heat')
    expect(!!q(container, 'meter-row')).toBe(off !== 'complexity')
  })

  it('draws no layer marks with every layer off, and a neutral border', () => {
    const { container } = renderDataset(ALL_OFF, DATASET_FACETS)
    expect(q(container, 'dataset-card').style.border).toBe(`1px solid ${SCHEMES.dark.line}`)
    ;['wave-chip', 'wave-accent', 'heat-dot', 'meter-row'].forEach((id) =>
      expect(q(container, id)).toBeNull()
    )
  })

  it('renders cleanly without any Axis facet or catalog', () => {
    for (const [view, facets] of [
      [NO_LAYERS, undefined],
      [ALL_ON, {}],
    ] as [LayerView, object | undefined][]) {
      const { container, unmount } = renderDataset(view, facets)
      expect(q(container, 'dataset-card')).not.toBeNull()
      expect(q(container, 'wave-chip')).toBeNull()
      expect(q(container, 'heat-dot')).toBeNull()
      expect(container.querySelectorAll('[data-testid="field-row"]')).toHaveLength(4)
      unmount()
    }
  })
})

const full = parseLayerCatalog(FULL_CATALOG).catalog as LayerCatalog
const FULL_ON: LayerView = { catalog: full, active: new Set(full.layers.map((l) => l.id)) }
const LAY10_FACETS = axisLayers({
  wave: 1,
  heat: 8400,
  complexity: 0.64,
  zone: 'core',
  size: 1288490188,
  status: 'reconciled',
  decommission: true,
})

/** The text of the tooltip that hovering `el` opens. */
const hoverTooltip = async (el: Element) => {
  fireEvent.mouseOver(el)
  return (await screen.findByRole('tooltip')).textContent
}

describe('dataset node, the LAY-10 layers', () => {
  it('draws the zone chip, the status dot, the size label and the decommission mark', () => {
    const { container } = renderDataset(FULL_ON, LAY10_FACETS)
    const chip = q(container, 'tag-chip')
    expect(chip.textContent).toBe('core')
    expect(chip.style.border).toBe('1px solid #8b5cf6')
    expect(q(container, 'status-dot').style.background).toBe('rgb(34, 197, 94)')
    expect(q(container, 'size-label').textContent).toBe('1.2 GB')
    expect(q(container, 'meter-row').textContent).toBe('complexity0.64')
    expect(q(container, 'flag-marker')).not.toBeNull()
    expect(q(container, 'wave-chip').textContent).toBe('Wave 1')
  })

  it.each(['zone', 'size', 'status', 'decommission'])(
    'turning %s off hides only its marks',
    (off) => {
      const active = new Set(FULL_ON.active)
      active.delete(off)
      const { container } = renderDataset({ catalog: full, active }, LAY10_FACETS)
      expect(!!q(container, 'tag-chip')).toBe(off !== 'zone')
      expect(!!q(container, 'size-label')).toBe(off !== 'size')
      expect(!!q(container, 'status-dot')).toBe(off !== 'status')
      expect(!!q(container, 'flag-marker')).toBe(off !== 'decommission')
      expect(q(container, 'wave-chip')).not.toBeNull()
      expect(q(container, 'heat-dot')).not.toBeNull()
      expect(q(container, 'meter-row')).not.toBeNull()
    }
  )

  it('gives the size label its own row, named, when complexity is off', () => {
    const active = new Set(['size'])
    const { container } = renderDataset({ catalog: full, active }, LAY10_FACETS)
    expect(q(container, 'facts-row').textContent).toBe('table size1.2 GB')
    expect(q(container, 'meter-row')).toBeNull()
  })

  it('shows the status and the zone in the name tooltip', async () => {
    const { container } = renderDataset(FULL_ON, LAY10_FACETS)
    const text = await hoverTooltip(container.querySelector('[data-testid="dataset-name"]')!)
    expect(text).toContain('Migration status: reconciled')
    expect(text).toContain('Data zone: core')
    expect(text).toContain('Table size: 1.2 GB')
  })
})

describe('dataset node, PII columns', () => {
  it('marks the PII columns with a shield, and no other column', () => {
    const { container } = renderDataset(NO_LAYERS, piiTags({ col_1: 'email', col_3: 'passport' }))
    const rows = Array.from(container.querySelectorAll('[data-testid="field-row"]'))
    expect(rows.map((r) => !!r.querySelector('[data-testid="pii-marker"]'))).toEqual([
      false,
      true,
      false,
      true,
    ])
    expect(rows[1].querySelector('[data-testid="pii-marker"]')?.getAttribute('aria-label')).toBe(
      'Personal data: email'
    )
  })

  it('shows the kind when hovering the row', async () => {
    const { container } = renderDataset(NO_LAYERS, piiTags({ col_1: 'email' }))
    const row = container.querySelectorAll('[data-testid="field-row"]')[1]
    expect(await hoverTooltip(row)).toContain('Personal data: email')
  })

  it('matches the column whatever the case, and is on with every layer off', () => {
    const { container } = renderDataset(ALL_OFF, piiTags({ COL_0: 'name' }))
    const rows = container.querySelectorAll('[data-testid="field-row"]')
    expect(rows[0].querySelector('[data-testid="pii-marker"]')).not.toBeNull()
  })

  it('ignores tags that are not PII or name no column', () => {
    const { container } = renderDataset(NO_LAYERS, {
      tags: {
        tags: [
          { key: 'owner', value: 'finance', field: 'col_0' },
          { key: 'pii', value: 'email' },
          { key: 'pii', value: 'phone', field: 'not_a_column' },
        ],
      },
    })
    expect(q(container, 'pii-marker')).toBeNull()
  })
})

describe('dataset node, why a column is PII', () => {
  const PII = {
    ...piiTags({ col_1: 'passport', col_2: 'email' }),
    ...axisPii({
      col_1: ['passport', "Comment: carries the CRM's natural key, the passport number."],
      col_2: ['email', 'Comment: the person’s email address.'],
    }),
  }
  const LINEAGE = columnLineage({
    'dw.fact_sales.col_1': ['stage.cls_customers.customer_id'],
    'stage.cls_customers.customer_id': ['stage.wrk_customers.passport_number'],
    'dw.fact_sales.col_2': [],
  })
  let fetchMock: jest.Mock

  beforeEach(() => {
    clearFieldOriginCache()
    fetchMock = jest.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve(LINEAGE) } as Response)
    )
    global.fetch = fetchMock as unknown as typeof fetch
  })

  const row = (c: HTMLElement, i: number) => c.querySelectorAll('[data-testid="field-row"]')[i]

  it("shows the kind, the agent's rationale and the source column on hover", async () => {
    const { container } = renderDataset(NO_LAYERS, PII)
    fireEvent.mouseOver(row(container, 1))
    const tip = await screen.findByRole('tooltip')
    expect(tip.textContent).toContain('Personal data: passport')
    expect(screen.getByTestId('pii-rationale').textContent).toBe(
      "Comment: carries the CRM's natural key, the passport number."
    )
    expect((await screen.findByTestId('pii-source')).textContent).toBe(
      'from wrk_customers.passport_number'
    )
  })

  it('asks for the lineage only on the first hover, once per table', async () => {
    const { container } = renderDataset(NO_LAYERS, PII)
    expect(fetchMock).not.toHaveBeenCalled()
    fireEvent.mouseOver(row(container, 1))
    await screen.findByTestId('pii-source')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(String(fetchMock.mock.calls[0][0])).toContain(
      'nodeId=dataset%3Aoracle%3Adw.fact_sales&depth='
    )
    fireEvent.mouseOut(row(container, 1))
    fireEvent.mouseOver(row(container, 2))
    await screen.findByTestId('pii-rationale')
    fireEvent.mouseOver(row(container, 1))
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('shows no source when the column is its own origin', async () => {
    const { container } = renderDataset(NO_LAYERS, PII)
    fireEvent.mouseOver(row(container, 2))
    await screen.findByTestId('pii-rationale')
    await new Promise((r) => setTimeout(r, 0))
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(screen.queryByTestId('pii-source')).toBeNull()
  })

  it('shows no rationale without the axisPii facet', async () => {
    const { container } = renderDataset(NO_LAYERS, piiTags({ col_1: 'passport' }))
    fireEvent.mouseOver(row(container, 1))
    expect((await screen.findByRole('tooltip')).textContent).toContain('Personal data: passport')
    expect(screen.queryByTestId('pii-rationale')).toBeNull()
  })

  it('asks for nothing when hovering a column that is not PII', async () => {
    const { container } = renderDataset(NO_LAYERS, PII, true, { col_0: 'Key of the sale.' })
    fireEvent.mouseOver(row(container, 0))
    await screen.findByRole('tooltip')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('dataset node, malformed facets and untrusted text', () => {
  const HTML = '<img src=x onerror="alert(1)">'
  const MALFORMED: object[] = [
    { documentation: 'x', tags: 'x', axisPii: 'x' },
    { documentation: null, tags: null, axisPii: null },
    { documentation: { description: 42 }, tags: { tags: 'x' }, axisPii: { columns: 'x' } },
    {
      documentation: { description: { html: HTML } },
      tags: { tags: [null, 1, 'pii', { key: 1, field: 'col_1' }, { key: 'pii', field: 7 }] },
      axisPii: { columns: [null, { column: 'col_1', rationale: 9 }, { column: 3 }] },
    },
    { documentation: [], tags: [], axisPii: [] },
  ]
  const imgs = () => document.querySelectorAll('img').length
  let fetchMock: jest.Mock

  beforeEach(() => {
    clearFieldOriginCache()
    fetchMock = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve(columnLineage({ 'dw.fact_sales.col_1': [`stage.${HTML}.col`, 'x.y.z'] })),
      } as Response)
    )
    global.fetch = fetchMock as unknown as typeof fetch
  })

  it.each(MALFORMED.map((f, i) => [i, f]))(
    'draws the card, its tooltip and its rows from malformed facets (case %i)',
    async (_, facets) => {
      const { container } = renderDataset(NO_LAYERS, facets)
      expect(container.querySelectorAll('[data-testid="field-row"]')).toHaveLength(4)
      expect(q(container, 'pii-marker')).toBeNull()
      await hoverTooltip(q(container, 'dataset-name'))
      expect(screen.queryByTestId('tooltip-description')).toBeNull()
    }
  )

  it('writes an HTML-like description in the name tooltip as text', async () => {
    const { container } = renderDataset(NO_LAYERS, { documentation: { description: HTML } })
    await hoverTooltip(q(container, 'dataset-name'))
    expect(screen.getByTestId('tooltip-description').textContent).toBe(HTML)
    expect(imgs()).toBe(0)
  })

  it('writes an HTML-like column description, PII kind, rationale and source as text', async () => {
    const { container } = renderDataset(
      NO_LAYERS,
      { ...piiTags({ col_1: HTML }), ...axisPii({ col_1: [HTML, `${HTML} rationale`] }) },
      true,
      { col_1: `${HTML} description` }
    )
    const row = container.querySelectorAll('[data-testid="field-row"]')[1]
    expect(row.querySelector('[data-testid="pii-marker"]')?.getAttribute('aria-label')).toBe(
      `Personal data: ${HTML}`
    )
    fireEvent.mouseOver(row)
    const tip = await screen.findByRole('tooltip')
    expect(within(tip).getByTestId('tooltip-description').textContent).toBe(`${HTML} description`)
    expect(tip.textContent).toContain(`Personal data: ${HTML}`)
    expect(within(tip).getByTestId('pii-rationale').textContent).toBe(`${HTML} rationale`)
    expect((await within(tip).findByTestId('pii-source')).textContent).toBe(`from ${HTML}.col, y.z`)
    expect(imgs()).toBe(0)
  })
})

describe('dataset node, descriptions', () => {
  const DOC = { documentation: { description: 'Sales facts, one row per receipt line.' } }

  it("shows the table's description in the name tooltip", async () => {
    const { container } = renderDataset(NO_LAYERS, DOC)
    const text = await hoverTooltip(container.querySelector('[data-testid="dataset-name"]')!)
    expect(text).toContain('Sales facts, one row per receipt line.')
  })

  it('has no description line without one', async () => {
    const { container } = renderDataset(NO_LAYERS, {})
    await hoverTooltip(container.querySelector('[data-testid="dataset-name"]')!)
    expect(screen.queryByTestId('tooltip-description')).toBeNull()
  })

  it("shows a column's description when hovering its row", async () => {
    const { container } = renderDataset(NO_LAYERS, {}, true, { col_2: 'Net amount in PLN.' })
    const row = container.querySelectorAll('[data-testid="field-row"]')[2]
    const text = await hoverTooltip(row)
    expect(text).toContain('col_2')
    expect(text).toContain('Net amount in PLN.')
  })

  it('opens no tooltip on a row with neither a description nor PII', async () => {
    const { container } = renderDataset(NO_LAYERS, {}, true, { col_2: 'Net amount in PLN.' })
    fireEvent.mouseOver(container.querySelectorAll('[data-testid="field-row"]')[0])
    await new Promise((r) => setTimeout(r, 300))
    expect(screen.queryByRole('tooltip')).toBeNull()
  })
})

describe('job node', () => {
  it('draws the status dot with the status layer on, and none with it off', () => {
    const facets = { ...JOB_FACETS, ...axisLayers({ wave: 1, status: 'failed' }) }
    const on = renderJob(FULL_ON, facets)
    expect(q(on.container, 'status-dot').style.background).toBe('rgb(239, 68, 68)')
    on.unmount()
    const active = new Set(FULL_ON.active)
    active.delete('status')
    const off = renderJob({ catalog: full, active }, facets)
    expect(q(off.container, 'status-dot')).toBeNull()
    expect(q(off.container, 'wave-chip')).not.toBeNull()
  })

  it('draws the type tile, badge, wave and meter with every layer on', () => {
    const { container } = renderJob(ALL_ON, JOB_FACETS)
    expect(container.querySelector('[data-glyph="plsql"]')).not.toBeNull()
    expect(q(container, 'job-type-caption').textContent).toBe('PL/SQL procedure')
    expect(container.querySelector('[data-vendor="oracle"]')).not.toBeNull()
    expect(q(container, 'wave-chip').textContent).toBe('Wave 1')
    expect(q(container, 'wave-accent')).not.toBeNull()
    expect(q(container, 'job-card').style.border).toBe('1px solid #3fa7d6')
    expect(q(container, 'meter-row').textContent).toBe('complexity0.71')
  })

  it.each(['wave', 'orchestrator', 'complexity'])('turning %s off hides only its marks', (off) => {
    const active = new Set(ALL_ON.active)
    active.delete(off)
    const { container } = renderJob({ catalog, active }, JOB_FACETS)
    expect(!!q(container, 'wave-chip')).toBe(off !== 'wave')
    expect(!!q(container, 'orchestrator-badge')).toBe(off !== 'orchestrator')
    expect(!!q(container, 'meter-row')).toBe(off !== 'complexity')
    expect(container.querySelector('[data-glyph="plsql"]')).not.toBeNull() // job type is no layer
  })

  it('gives an orchestrator the catalog does not list a neutral badge', () => {
    const { container } = renderJob(ALL_ON, {
      ...JOB_FACETS,
      ...axisLayers({ orchestrator: 'control-m' }),
    })
    expect(q(container, 'orchestrator-badge')).not.toBeNull()
    expect(container.querySelector('[data-vendor]')).toBeNull()
  })

  it('renders cleanly with the gear and "job" without any facet', () => {
    const { container } = renderJob(NO_LAYERS, undefined)
    expect(container.querySelector('[data-glyph="gear"]')).not.toBeNull()
    expect(q(container, 'job-type-caption').textContent).toBe('job')
    expect(q(container, 'orchestrator-badge')).toBeNull()
    expect(q(container, 'wave-chip')).toBeNull()
    expect(q(container, 'job-card').style.border).toBe(`1px solid ${SCHEMES.dark.line}`)
  })

  it('shows the end of a long name, the full name in the tooltip', () => {
    const facets = { jobType: { integration: 'ORACLE', jobType: 'procedure' } }
    const long = {
      ...job(facets),
      name: 'freepdb1.bl_cl_2nd.package.pkg_etl_insert_products.insert_table_products',
    }
    const node = {
      id: 'job:oracle:long',
      kind: 'JOB' as const,
      width: 180,
      height: 52,
      bottomLeftCorner: { x: 0, y: 0 },
      data: { job: long, jobType: jobTypeOf(facets), marks: { markers: [] } },
    }
    const { container } = inRouter(
      <svg>
        <TableLineageJobNode node={node} />
      </svg>
    )
    expect(q(container, 'job-card').textContent).toContain('…_table_products')
  })

  it('draws a dbt-ol event with the dbt glyph', () => {
    const { container } = renderJob(NO_LAYERS, {
      jobType: { processingType: 'BATCH', integration: 'DBT', jobType: 'MODEL' },
    })
    expect(container.querySelector('[data-glyph="dbt"]')).not.toBeNull()
  })

  it('is not selected when a dataset of the same name is (a table and its own job)', () => {
    const { container } = renderJob(ALL_ON, JOB_FACETS, '/lineage/dataset/oracle/etl.load_sales')
    expect(q(container, 'job-card').dataset.selected).toBe('false')
  })

  it('keeps the wave border on a selected node and adds a magenta ring outside it', () => {
    const { container } = renderJob(ALL_ON, JOB_FACETS, '/lineage/job/oracle/etl.load_sales')
    const card = q(container, 'job-card')
    expect(card.dataset.selected).toBe('true')
    expect(card.style.border).toBe('1px solid #3fa7d6')
    expect(card.style.boxShadow).toContain(`0 0 0 5px ${SCHEMES.dark.accent}`)
  })
})
