// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

/**
 * The Axis layer catalog: the `axisLayerCatalog` job facet on the hidden job `axis.layers`
 * of a namespace (Axis lineage layers design §4.2). It says which layers exist and how the UI
 * draws each, so a new layer needs a catalog entry and data, not a UI release.
 */

export type LayerKind = 'category' | 'scale' | 'icon' | 'flag'
export type LayerSlot = 'fill' | 'dot' | 'meter' | 'badge' | 'marker'
export type LayerNodeKind = 'dataset' | 'job'

export const CATALOG_JOB_NAME = 'axis.layers'
export const CATALOG_FACET = 'axisLayerCatalog'
export const LAYERS_FACET = 'axisLayers'

export interface LegendEntry {
  value: string | number | boolean
  label: string
  color?: string
  icon?: string
}

export interface LayerDefinition {
  id: string
  title: string
  kind: LayerKind
  slot: LayerSlot
  appliesTo: LayerNodeKind[]
  default: boolean
  legend: LegendEntry[]
  scale?: 'linear' | 'log'
  min?: number
  max?: number
  unit?: string
  window?: string
}

export interface LayerCatalog {
  layers: LayerDefinition[]
}

export interface CatalogParseResult {
  catalog: LayerCatalog | null
  /** Entries the UI ignored or refused, one line each, for the console. */
  problems: string[]
}

/** The slots each kind may draw in. */
const KIND_SLOTS: Record<LayerKind, LayerSlot[]> = {
  category: ['fill'],
  scale: ['dot', 'meter'],
  icon: ['badge'],
  flag: ['marker'],
}

/** The node kinds each slot exists on: the heat dot is a dataset header's, the badge a job tile's. */
const SLOT_NODES: Record<LayerSlot, LayerNodeKind[]> = {
  fill: ['dataset', 'job'],
  dot: ['dataset'],
  meter: ['dataset', 'job'],
  badge: ['job'],
  marker: ['dataset', 'job'],
}

const ID_PATTERN = /^[a-z][a-z0-9_]{0,31}$/

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const asNumber = (v: unknown): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) ? v : undefined

const asString = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined)

const parseLegend = (raw: unknown): LegendEntry[] =>
  Array.isArray(raw)
    ? raw.filter(isObject).reduce<LegendEntry[]>((acc, e) => {
        const value = e.value
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          acc.push({
            value,
            label: asString(e.label) ?? String(value),
            color: asString(e.color),
            icon: asString(e.icon),
          })
        }
        return acc
      }, [])
    : []

/**
 * Parses an `axisLayerCatalog` facet. A layer of a kind this UI does not know is ignored; a
 * layer whose slot an earlier layer already holds on the same node kind is refused, so two
 * layers never draw over each other. Returns `catalog: null` when nothing usable is left.
 */
export const parseLayerCatalog = (raw: unknown): CatalogParseResult => {
  const problems: string[] = []
  if (!isObject(raw) || !Array.isArray(raw.layers)) {
    return { catalog: null, problems: ['catalog has no layers list'] }
  }
  const layers: LayerDefinition[] = []
  const taken = new Map<string, string>() // `${nodeKind}:${slot}` -> layer id
  for (const entry of raw.layers) {
    if (!isObject(entry)) continue
    const id = asString(entry.id)
    if (!id || !ID_PATTERN.test(id)) {
      problems.push(`layer ${JSON.stringify(entry.id)}: invalid id, ignored`)
      continue
    }
    if (layers.some((l) => l.id === id)) {
      problems.push(`layer ${id}: duplicate id, refused`)
      continue
    }
    const kind = asString(entry.kind) as LayerKind | undefined
    // an own key only: `toString` and other inherited names are unknown kinds too
    if (!kind || !Object.prototype.hasOwnProperty.call(KIND_SLOTS, kind)) {
      problems.push(`layer ${id}: unknown kind ${JSON.stringify(entry.kind)}, ignored`)
      continue
    }
    const slot = asString(entry.slot) as LayerSlot | undefined
    if (!slot || !KIND_SLOTS[kind].includes(slot)) {
      problems.push(`layer ${id}: slot ${JSON.stringify(entry.slot)} does not fit kind ${kind}`)
      continue
    }
    const appliesTo = (Array.isArray(entry.appliesTo) ? entry.appliesTo : [])
      .filter((k): k is LayerNodeKind => k === 'dataset' || k === 'job')
      .filter((k) => SLOT_NODES[slot].includes(k))
    if (!appliesTo.length) {
      problems.push(`layer ${id}: applies to no node kind with a ${slot} slot, ignored`)
      continue
    }
    const clash = appliesTo
      .map((k) => taken.get(`${k}:${slot}`))
      .find((other): other is string => !!other)
    if (clash) {
      problems.push(`layer ${id}: slot ${slot} already holds layer ${clash}, refused`)
      continue
    }
    appliesTo.forEach((k) => taken.set(`${k}:${slot}`, id))
    const scale = entry.scale === 'log' ? 'log' : entry.scale === 'linear' ? 'linear' : undefined
    layers.push({
      id,
      title: asString(entry.title) ?? id,
      kind,
      slot,
      appliesTo,
      default: entry.default === true,
      legend: parseLegend(entry.legend),
      scale: kind === 'scale' ? scale ?? 'linear' : undefined,
      min: asNumber(entry.min),
      max: asNumber(entry.max),
      unit: asString(entry.unit),
      window: asString(entry.window),
    })
  }
  return { catalog: layers.length ? { layers } : null, problems }
}

/** The catalog from a job's facets (`axis.layers`), or null when it has none. */
export const catalogFromJobFacets = (facets: unknown): CatalogParseResult => {
  if (!isObject(facets) || !(CATALOG_FACET in facets)) return { catalog: null, problems: [] }
  return parseLayerCatalog(facets[CATALOG_FACET])
}

export interface LayerValue {
  value: string | number | boolean
  asOf?: string
  detail?: string
}

/** The `axisLayers` values of a node's facets, by layer id; `{}` when it has none. */
export const layerValues = (facets: unknown): Record<string, LayerValue> => {
  if (!isObject(facets)) return {}
  const facet = facets[LAYERS_FACET]
  if (!isObject(facet) || !isObject(facet.values)) return {}
  const out: Record<string, LayerValue> = {}
  for (const [id, v] of Object.entries(facet.values)) {
    if (!isObject(v)) continue
    const value = v.value
    if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean')
      continue
    out[id] = { value, asOf: asString(v.asOf), detail: asString(v.detail) }
  }
  return out
}
