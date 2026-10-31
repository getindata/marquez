// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { LayerCatalog } from './catalog'

/** The URL query parameter that keeps the active layers, e.g. `layers=wave,heat,orchestrator`. */
export const LAYERS_PARAM = 'layers'

/**
 * The active layer ids: those the URL names that the catalog has, or the catalog's defaults
 * when the URL names none. `layers=` (empty) means every layer off.
 */
export const activeLayersFromParams = (
  params: URLSearchParams,
  catalog: LayerCatalog | null
): Set<string> => {
  if (!catalog) return new Set()
  const raw = params.get(LAYERS_PARAM)
  if (raw === null) return new Set(catalog.layers.filter((l) => l.default).map((l) => l.id))
  const named = new Set(
    raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  )
  return new Set(catalog.layers.filter((l) => named.has(l.id)).map((l) => l.id))
}

/** A copy of `params` with `layers=` set to `active`, in the catalog's order. */
export const withActiveLayers = (
  params: URLSearchParams,
  active: Set<string>,
  catalog: LayerCatalog
): URLSearchParams => {
  const next = new URLSearchParams(params)
  next.set(
    LAYERS_PARAM,
    catalog.layers
      .filter((l) => active.has(l.id))
      .map((l) => l.id)
      .join(',')
  )
  return next
}

/** `active` with `id` switched. */
export const toggleLayer = (active: Set<string>, id: string): Set<string> => {
  const next = new Set(active)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  return next
}
