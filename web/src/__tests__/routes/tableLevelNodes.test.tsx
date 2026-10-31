// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react'
import { DESIGN_CATALOG, axisLayers } from '../layers/fixtures'
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
import { render } from '@testing-library/react'
import TableLineageJobNode from '../../routes/table-level/TableLineageJobNode'

const catalog = parseLayerCatalog(DESIGN_CATALOG).catalog as LayerCatalog
const ALL_ON: LayerView = {
  catalog,
  active: new Set(['wave', 'orchestrator', 'heat', 'complexity']),
}
const ALL_OFF: LayerView = { catalog, active: new Set() }

const dataset = (facets: object | undefined, fieldCount = 6): LineageDataset =>
  ({
    id: { namespace: 'oracle', name: 'dw.fact_sales' },
    type: 'DB_TABLE',
    name: 'dw.fact_sales',
    namespace: 'oracle',
    fields: Array.from({ length: fieldCount }, (_, i) => ({
      name: `col_${i}`,
      type: 'NUMBER(12,2)',
      tags: [],
      description: '',
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

const renderDataset = (view: LayerView, facets: object | undefined, showFields = true) => {
  const data = dataset(facets)
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
    expect(q(container, 'dataset-card').style.border).toBe('1px solid #34274a')
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

describe('job node', () => {
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
    expect(q(container, 'job-card').style.border).toBe('1px solid #34274a')
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

  it('keeps the wave border on a selected node and adds a magenta ring outside it', () => {
    const { container } = renderJob(ALL_ON, JOB_FACETS, '/lineage/job/oracle/etl.load_sales')
    const card = q(container, 'job-card')
    expect(card.dataset.selected).toBe('true')
    expect(card.style.border).toBe('1px solid #3fa7d6')
    expect(card.style.boxShadow).toContain('0 0 0 5px #E331D0')
  })
})
