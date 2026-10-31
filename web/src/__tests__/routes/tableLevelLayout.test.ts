// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { DESIGN_CATALOG, axisLayers } from '../layers/fixtures'
import { LayerCatalog, LayerView, parseLayerCatalog } from '../../layers'
import { LineageGraph } from '../../types/api'
import {
  TABLE_LEVEL_LAYOUT_OPTIONS,
  createElkNodes,
  datasetFields,
} from '../../routes/table-level/layout'

const catalog = parseLayerCatalog(DESIGN_CATALOG).catalog as LayerCatalog

const ds = (name: string, fields: number, facets: object = {}) => ({
  id: `dataset:oracle:${name}`,
  type: 'DATASET' as const,
  data: {
    name,
    namespace: 'oracle',
    type: 'DB_TABLE',
    fields: Array.from({ length: fields }, (_, i) => ({ name: `c${i}`, type: 'NUMBER' })),
    facets,
  },
})
const jb = (name: string, facets?: object) => ({
  id: `job:oracle:${name}`,
  type: 'JOB' as const,
  data: { name, namespace: 'oracle', facets },
})

// src -> load -> fact -> report -> mart ; other -> side (not on the selected node's flow)
const graph = {
  graph: [
    {
      ...ds('src', 2),
      inEdges: [],
      outEdges: [{ origin: 'dataset:oracle:src', destination: 'job:oracle:load' }],
    },
    {
      ...jb('load', axisLayers({ complexity: 0.5 })),
      inEdges: [{ origin: 'dataset:oracle:src', destination: 'job:oracle:load' }],
      outEdges: [{ origin: 'job:oracle:load', destination: 'dataset:oracle:fact' }],
    },
    {
      ...ds('fact', 9, axisLayers({ complexity: 0.2 })),
      inEdges: [{ origin: 'job:oracle:load', destination: 'dataset:oracle:fact' }],
      outEdges: [{ origin: 'dataset:oracle:fact', destination: 'job:oracle:report' }],
    },
    {
      ...jb('report'),
      inEdges: [{ origin: 'dataset:oracle:fact', destination: 'job:oracle:report' }],
      outEdges: [{ origin: 'job:oracle:report', destination: 'dataset:oracle:mart' }],
    },
    {
      ...ds('mart', 0),
      inEdges: [{ origin: 'job:oracle:report', destination: 'dataset:oracle:mart' }],
      outEdges: [],
    },
    {
      ...jb('side'),
      inEdges: [{ origin: 'dataset:oracle:src', destination: 'job:oracle:side' }],
      outEdges: [],
    },
    {
      ...jb('axis.layers', { jobType: { integration: 'AXIS', jobType: 'catalog' } }),
      inEdges: [],
      outEdges: [],
    },
  ],
} as unknown as LineageGraph
// src also feeds `side`, which is off the selected node's flow
;(graph.graph[0].outEdges as any).push({
  origin: 'dataset:oracle:src',
  destination: 'job:oracle:side',
})

const SELECTED = 'dataset:oracle:fact'
const sizes = (view?: LayerView, compact = false, collapsed: string | null = null) =>
  Object.fromEntries(
    createElkNodes(graph, SELECTED, compact, true, collapsed, view).nodes.map((n) => [
      n.id,
      [n.width, n.height],
    ])
  )

describe('createElkNodes', () => {
  it('sizes tables by their visible rows and jobs at 180 x 52', () => {
    const s = sizes()
    expect(s['dataset:oracle:src']).toEqual([190, 2 + 46 + 2 * 22])
    expect(s['dataset:oracle:fact']).toEqual([190, 2 + 46 + 4 * 22 + 20]) // 4 rows + "5 more"
    expect(s['dataset:oracle:mart']).toEqual([190, 48])
    expect(s['job:oracle:load']).toEqual([180, 52])
  })

  it('adds the meter row only where complexity is on and has a value', () => {
    const s = sizes({ catalog, active: new Set(['complexity']) })
    expect(s['dataset:oracle:fact']).toEqual([190, 2 + 46 + 20 + 4 * 22 + 20])
    expect(s['dataset:oracle:src']).toEqual([190, 2 + 46 + 2 * 22])
    expect(s['job:oracle:load']).toEqual([180, 64])
    expect(s['job:oracle:report']).toEqual([180, 52])
  })

  it('hides rows when compact or collapsed', () => {
    expect(sizes(undefined, true)['dataset:oracle:fact']).toEqual([190, 48])
    expect(sizes(undefined, false, 'dataset:oracle:fact')['dataset:oracle:fact']).toEqual([190, 48])
  })

  it('never draws the axis.layers catalog job', () => {
    expect(Object.keys(sizes())).not.toContain('job:oracle:axis.layers')
  })

  it('draws every edge dotted and animated, magenta on the selected node flow', () => {
    const { edges } = createElkNodes(graph, SELECTED, false, true, null)
    const byId = Object.fromEntries(edges.map((e) => [e.id, e]))
    expect(byId['dataset:oracle:src:job:oracle:load'].color).toBe('#E331D0')
    expect(byId['dataset:oracle:fact:job:oracle:report'].color).toBe('#E331D0')
    expect(byId['dataset:oracle:src:job:oracle:side'].color).toBe('#8f80a8')
    edges.forEach((e) =>
      expect(e).toMatchObject({
        strokeDasharray: '0.1 5',
        strokeWidth: 1.8,
        animatedStrokeWidth: 5,
        isAnimated: true,
      })
    )
  })

  it('asks ELK for layer sweep, Brandes-Koepf placement and greedy cycle breaking', () => {
    expect(TABLE_LEVEL_LAYOUT_OPTIONS).toMatchObject({
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
      'elk.layered.cycleBreaking.strategy': 'GREEDY',
    })
  })
})

describe('datasetFields', () => {
  it('falls back to the schema facet when Marquez gives no fields', () => {
    const d = {
      fields: [],
      facets: { schema: { fields: [{ name: 'id', type: 'NUMBER' }, { name: 'x' }] } },
    } as any
    expect(datasetFields(d)).toEqual([
      { name: 'id', type: 'NUMBER' },
      { name: 'x', type: undefined },
    ])
    expect(datasetFields({ fields: undefined, facets: undefined } as any)).toEqual([])
  })
})
