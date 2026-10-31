// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { DESIGN_CATALOG } from './fixtures'
import {
  LayerCatalog,
  activeLayersFromParams,
  parseLayerCatalog,
  toggleLayer,
  withActiveLayers,
} from '../../layers'

const catalog = parseLayerCatalog(DESIGN_CATALOG).catalog as LayerCatalog
const ids = (s: Set<string>) => Array.from(s).sort()

describe('layers URL state', () => {
  it('uses the catalog defaults when the URL names no layers', () => {
    expect(ids(activeLayersFromParams(new URLSearchParams('depth=2'), catalog))).toEqual([
      'heat',
      'orchestrator',
      'wave',
    ])
  })

  it('takes the layers the URL names, ignoring ids the catalog lacks', () => {
    const active = activeLayersFromParams(
      new URLSearchParams('layers=complexity,nope,wave'),
      catalog
    )
    expect(ids(active)).toEqual(['complexity', 'wave'])
  })

  it('reads an empty layers= as every layer off', () => {
    expect(activeLayersFromParams(new URLSearchParams('layers='), catalog).size).toBe(0)
  })

  it('has no active layers without a catalog', () => {
    expect(activeLayersFromParams(new URLSearchParams('layers=wave'), null).size).toBe(0)
  })

  it('round-trips through the URL, in catalog order, keeping other params', () => {
    const start = new URLSearchParams('depth=4&isFull=true')
    const active = toggleLayer(
      toggleLayer(activeLayersFromParams(start, catalog), 'heat'),
      'complexity'
    )
    const written = withActiveLayers(start, active, catalog)
    expect(written.get('layers')).toBe('wave,orchestrator,complexity')
    expect(written.get('depth')).toBe('4')
    expect(written.get('isFull')).toBe('true')
    const reread = activeLayersFromParams(new URLSearchParams(written.toString()), catalog)
    expect(ids(reread)).toEqual(ids(active))
    expect(start.has('layers')).toBe(false) // the input is not mutated
  })

  it('round-trips every layer off', () => {
    const none = withActiveLayers(new URLSearchParams(), new Set(), catalog)
    expect(none.toString()).toBe('layers=')
    expect(activeLayersFromParams(new URLSearchParams(none.toString()), catalog).size).toBe(0)
  })
})
