// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { DESIGN_CATALOG, FULL_CATALOG } from './fixtures'
import { catalogFromJobFacets, layerValues, parseLayerCatalog } from '../../layers'

describe('parseLayerCatalog', () => {
  it('reads the design catalog in order with every field', () => {
    const { catalog, problems } = parseLayerCatalog(DESIGN_CATALOG)
    expect(problems).toEqual([])
    expect(catalog?.layers.map((l) => l.id)).toEqual(['wave', 'orchestrator', 'heat', 'complexity'])
    const heat = catalog?.layers[2]
    expect(heat).toMatchObject({
      kind: 'scale',
      slot: 'dot',
      appliesTo: ['dataset'],
      default: true,
      scale: 'log',
      min: 0,
      max: 8400,
      unit: 'queries',
      window: '30 days',
    })
    expect(catalog?.layers[0].legend[1]).toEqual({
      value: 1,
      label: '1',
      color: '#3fa7d6',
      icon: undefined,
    })
    expect(catalog?.layers[3].default).toBe(false)
  })

  it('ignores a layer of an unknown kind and keeps the rest', () => {
    const { catalog, problems } = parseLayerCatalog({
      layers: [
        { id: 'owner', title: 'Owner', kind: 'avatar', slot: 'badge', appliesTo: ['job'] },
        ...DESIGN_CATALOG.layers,
      ],
    })
    expect(catalog?.layers.map((l) => l.id)).toEqual(['wave', 'orchestrator', 'heat', 'complexity'])
    expect(problems).toEqual([expect.stringContaining('owner: unknown kind')])
  })

  it('ignores an inherited name as a kind and keeps the valid layer after it', () => {
    const { catalog, problems } = parseLayerCatalog({
      layers: [
        { id: 'future', kind: 'toString', slot: 'badge', appliesTo: ['job'] },
        { id: 'proto', kind: '__proto__', slot: 'badge', appliesTo: ['job'] },
        DESIGN_CATALOG.layers[0],
      ],
    })
    expect(catalog?.layers.map((l) => l.id)).toEqual(['wave'])
    expect(problems).toEqual([
      expect.stringContaining('future: unknown kind'),
      expect.stringContaining('proto: unknown kind'),
    ])
  })

  it('refuses a layer whose slot an earlier layer holds on the same node kind', () => {
    const { catalog, problems } = parseLayerCatalog({
      layers: [
        ...DESIGN_CATALOG.layers,
        {
          id: 'reconcile',
          title: 'Reconcile status',
          kind: 'category',
          slot: 'fill',
          appliesTo: ['dataset'],
          legend: [],
        },
      ],
    })
    expect(catalog?.layers.map((l) => l.id)).not.toContain('reconcile')
    expect(problems).toEqual([expect.stringContaining('slot fill already holds layer wave')])
  })

  it('allows one slot on different node kinds', () => {
    const { catalog } = parseLayerCatalog({
      layers: [
        { id: 'a', kind: 'flag', slot: 'marker', appliesTo: ['dataset'] },
        { id: 'b', kind: 'flag', slot: 'marker', appliesTo: ['job'] },
      ],
    })
    expect(catalog?.layers.map((l) => l.id)).toEqual(['a', 'b'])
  })

  it('refuses a slot that does not fit the kind, invalid and duplicate ids', () => {
    const { catalog, problems } = parseLayerCatalog({
      layers: [
        { id: 'x', kind: 'scale', slot: 'badge', appliesTo: ['job'] },
        { id: 'Bad-Id', kind: 'flag', slot: 'marker', appliesTo: ['job'] },
        { id: 'f', kind: 'flag', slot: 'marker', appliesTo: ['job'] },
        { id: 'f', kind: 'flag', slot: 'marker', appliesTo: ['dataset'] },
      ],
    })
    expect(catalog?.layers.map((l) => l.id)).toEqual(['f'])
    expect(problems).toHaveLength(3)
  })

  it('drops node kinds a slot does not exist on (no heat dot on jobs)', () => {
    const { catalog } = parseLayerCatalog({
      layers: [{ id: 'heat', kind: 'scale', slot: 'dot', appliesTo: ['dataset', 'job'] }],
    })
    expect(catalog?.layers[0].appliesTo).toEqual(['dataset'])
  })

  it('reads the tag, label and status slots of the LAY-10 layers', () => {
    const { catalog, problems } = parseLayerCatalog(FULL_CATALOG)
    expect(problems).toEqual([])
    const byId = Object.fromEntries((catalog?.layers ?? []).map((l) => [l.id, l]))
    expect(byId.zone).toMatchObject({ kind: 'category', slot: 'tag', appliesTo: ['dataset'] })
    expect(byId.size).toMatchObject({ kind: 'scale', slot: 'label', unit: 'bytes', scale: 'log' })
    expect(byId.status).toMatchObject({ slot: 'status', appliesTo: ['dataset', 'job'] })
    expect(byId.decommission).toMatchObject({ kind: 'flag', slot: 'marker' })
  })

  it('takes a category in tag or status and a scale in label, and nothing else there', () => {
    const { catalog, problems } = parseLayerCatalog({
      layers: [
        { id: 'a', kind: 'scale', slot: 'tag', appliesTo: ['dataset'] },
        { id: 'b', kind: 'category', slot: 'label', appliesTo: ['dataset'] },
        { id: 'c', kind: 'flag', slot: 'status', appliesTo: ['dataset'] },
        { id: 'd', kind: 'category', slot: 'tag', appliesTo: ['dataset'] },
        { id: 'e', kind: 'scale', slot: 'label', appliesTo: ['dataset'] },
        { id: 'f', kind: 'category', slot: 'status', appliesTo: ['dataset'] },
      ],
    })
    expect(catalog?.layers.map((l) => l.id)).toEqual(['d', 'e', 'f'])
    expect(problems).toHaveLength(3)
  })

  it('keeps the zone chip and the size label off jobs, the status dot on both', () => {
    const { catalog } = parseLayerCatalog({
      layers: [
        { id: 'zone', kind: 'category', slot: 'tag', appliesTo: ['dataset', 'job'] },
        { id: 'size', kind: 'scale', slot: 'label', appliesTo: ['dataset', 'job'] },
        { id: 'status', kind: 'category', slot: 'status', appliesTo: ['dataset', 'job'] },
      ],
    })
    expect(catalog?.layers.map((l) => l.appliesTo)).toEqual([
      ['dataset'],
      ['dataset'],
      ['dataset', 'job'],
    ])
  })

  it('refuses a second layer in the status slot', () => {
    const { catalog, problems } = parseLayerCatalog({
      layers: [
        ...FULL_CATALOG.layers,
        { id: 'reconcile', kind: 'category', slot: 'status', appliesTo: ['job'] },
      ],
    })
    expect(catalog?.layers.map((l) => l.id)).not.toContain('reconcile')
    expect(problems).toEqual([expect.stringContaining('slot status already holds layer status')])
  })

  it('gives no catalog for junk or an empty list', () => {
    expect(parseLayerCatalog(null).catalog).toBeNull()
    expect(parseLayerCatalog({ layers: [] }).catalog).toBeNull()
    expect(parseLayerCatalog({ layers: 'wave' }).catalog).toBeNull()
  })
})

describe('catalogFromJobFacets', () => {
  it('reads axisLayerCatalog from the axis.layers job facets', () => {
    const { catalog } = catalogFromJobFacets({
      jobType: { integration: 'AXIS', jobType: 'catalog' },
      axisLayerCatalog: DESIGN_CATALOG,
    })
    expect(catalog?.layers).toHaveLength(4)
  })

  it('is null for a job without the facet', () => {
    expect(catalogFromJobFacets({}).catalog).toBeNull()
    expect(catalogFromJobFacets(undefined).catalog).toBeNull()
  })
})

describe('layerValues', () => {
  it('reads values, asOf and detail, and skips malformed entries', () => {
    expect(
      layerValues({
        axisLayers: {
          values: {
            wave: { value: 1, asOf: '2026-10-30' },
            orchestrator: { value: 'oracle', detail: 'SALES_NIGHTLY' },
            broken: { nope: 1 },
            nested: { value: { a: 1 } },
          },
        },
      })
    ).toEqual({
      wave: { value: 1, asOf: '2026-10-30', detail: undefined },
      orchestrator: { value: 'oracle', asOf: undefined, detail: 'SALES_NIGHTLY' },
    })
  })

  it('is empty without the facet', () => {
    expect(layerValues({ schema: {} })).toEqual({})
    expect(layerValues(null)).toEqual({})
  })
})
