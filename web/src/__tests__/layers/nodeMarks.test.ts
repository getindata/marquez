// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { FULL_CATALOG } from './fixtures'
import {
  LayerCatalog,
  NEUTRAL_CATEGORY,
  formatLayerAmount,
  parseLayerCatalog,
  resolveNodeMarks,
  scaleColor,
} from '../../layers'

const catalog = parseLayerCatalog(FULL_CATALOG).catalog as LayerCatalog
const ALL = { catalog, active: new Set(catalog.layers.map((l) => l.id)) }
const values = (v: Record<string, object>) => ({ axisLayers: { values: v } })
const size = catalog.layers.find((l) => l.id === 'size')!

describe('resolveNodeMarks, the LAY-10 slots', () => {
  it('gives a zone its chip in the legend colour', () => {
    const marks = resolveNodeMarks(ALL, 'dataset', values({ zone: { value: 'core' } }))
    expect(marks.tag).toEqual({
      layerId: 'zone',
      color: '#8b5cf6',
      text: 'core',
      tooltip: 'Data zone: core',
    })
  })

  it('gives a zone the legend does not list the neutral colour and its value', () => {
    const marks = resolveNodeMarks(ALL, 'dataset', values({ zone: { value: 'sandbox' } }))
    expect(marks.tag).toMatchObject({ color: NEUTRAL_CATEGORY, text: 'sandbox' })
  })

  it('gives a size its label in bytes, coloured on the heat-map scale, the detail in the tooltip', () => {
    const marks = resolveNodeMarks(
      ALL,
      'dataset',
      values({ size: { value: 1288490188, detail: '84,000 rows', asOf: '2026-10-31' } })
    )
    expect(marks.label).toEqual({
      layerId: 'size',
      color: scaleColor(size, 1288490188),
      text: '1.2 GB',
      title: 'table size',
      tooltip: 'Table size: 1.2 GB · 84,000 rows · as of 2026-10-31',
    })
  })

  it('gives a status its dot in the legend colour, on tables and jobs', () => {
    for (const kind of ['dataset', 'job'] as const) {
      const marks = resolveNodeMarks(ALL, kind, values({ status: { value: 'reconciled' } }))
      expect(marks.status).toEqual({
        layerId: 'status',
        color: '#22c55e',
        label: 'reconciled',
        tooltip: 'Migration status: reconciled',
      })
    }
  })

  it('marks a decommission candidate beside its name, with the reason in the tooltip', () => {
    const marks = resolveNodeMarks(
      ALL,
      'dataset',
      values({ decommission: { value: true, detail: 'no query in 90 days' } })
    )
    expect(marks.markers).toEqual([
      { layerId: 'decommission', tooltip: 'Decommission candidate · no query in 90 days' },
    ])
  })

  it('draws none of them with their layers off', () => {
    const marks = resolveNodeMarks(
      { catalog, active: new Set(['wave']) },
      'dataset',
      values({
        zone: { value: 'core' },
        size: { value: 10 },
        status: { value: 'pending' },
        decommission: { value: true },
      })
    )
    expect(marks.tag).toBeUndefined()
    expect(marks.label).toBeUndefined()
    expect(marks.status).toBeUndefined()
    expect(marks.markers).toEqual([])
  })

  it('draws no zone or size on a job, which has no such slot', () => {
    const marks = resolveNodeMarks(
      ALL,
      'job',
      values({ zone: { value: 'core' }, size: { value: 10 } })
    )
    expect(marks.tag).toBeUndefined()
    expect(marks.label).toBeUndefined()
  })
})

describe('formatLayerAmount', () => {
  it.each([
    [0, 'bytes', '0 B'],
    [512, 'bytes', '512 B'],
    [1536, 'bytes', '1.5 KB'],
    [880803840, 'bytes', '840 MB'],
    [10737418240, 'bytes', '10 GB'],
    [3 * 1024 ** 4, 'bytes', '3 TB'],
    [84000, 'rows', '84k rows'],
    [1250000, 'rows', '1.3M rows'],
    [999, 'rows', '999 rows'],
    [2500000000, undefined, '2.5B'],
  ])('%d %s is %s', (n, unit, text) => {
    expect(formatLayerAmount(n, unit as string | undefined)).toBe(text)
  })
})
