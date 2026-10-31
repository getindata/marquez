// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { LayerCatalog, LayerDefinition, LayerNodeKind, LayerValue, layerValues } from './catalog'
import { scaleColor, scaleFraction } from './colorScale'

/** What the viewer has on: the namespace's catalog and the active layer ids. */
export interface LayerView {
  catalog: LayerCatalog | null
  active: Set<string>
}

export const NO_LAYERS: LayerView = { catalog: null, active: new Set() }

/** The neutral colour of a category value the catalog's legend does not list. */
export const NEUTRAL_CATEGORY = '#6d6a78'

/** The marks one node draws, slot by slot; a slot is absent when its layer is off or valueless. */
export interface NodeMarks {
  /** `fill`: the wave chip, the left accent, the tint and the border. */
  fill?: { layerId: string; color: string; chip: string; tooltip: string }
  /** `dot`: the 12px heat dot in a dataset header. */
  dot?: { layerId: string; color: string; tooltip: string }
  /** `meter`: the row with a 44px bar and the number. */
  meter?: { layerId: string; label: string; color: string; fraction: number; text: string }
  /** `badge`: the white disc on a job tile's corner; `icon` is absent for an unknown value. */
  badge?: { layerId: string; icon?: string; label: string; tooltip: string }
  /** `marker`: small marks beside the name, for flags. */
  markers: { layerId: string; tooltip: string }[]
}

const sameValue = (a: unknown, b: unknown) => String(a) === String(b)

const humanId = (id: string) => {
  const s = id.replace(/_/g, ' ')
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export const formatLayerNumber = (n: number, max = 1) =>
  max <= 1 ? n.toFixed(2) : Math.round(n).toLocaleString('en-US')

const withDetail = (text: string, v: LayerValue) =>
  [text, v.detail, v.asOf ? `as of ${v.asOf}` : undefined].filter(Boolean).join(' · ')

const resolve = (layer: LayerDefinition, v: LayerValue, marks: NodeMarks) => {
  const entry = layer.legend.find((e) => sameValue(e.value, v.value))
  switch (layer.slot) {
    case 'fill':
      marks.fill = {
        layerId: layer.id,
        color: entry?.color ?? NEUTRAL_CATEGORY,
        chip: `${humanId(layer.id)} ${v.value}`,
        tooltip: withDetail(`${layer.title}: ${entry?.label ?? v.value}`, v),
      }
      return
    case 'dot':
    case 'meter': {
      const n = typeof v.value === 'number' ? v.value : Number(v.value)
      if (!Number.isFinite(n)) return
      const color = scaleColor(layer, n)
      const text = formatLayerNumber(n, layer.max ?? 1)
      if (layer.slot === 'dot') {
        const amount = layer.unit ? `${text} ${layer.unit}` : `${layer.title}: ${text}`
        const span = layer.window ? ` in ${layer.window}` : ''
        marks.dot = { layerId: layer.id, color, tooltip: withDetail(amount + span, v) }
      } else {
        marks.meter = {
          layerId: layer.id,
          label: layer.title.toLowerCase(),
          color,
          fraction: scaleFraction(layer, n),
          text,
        }
      }
      return
    }
    case 'badge': {
      const label = entry?.label ?? String(v.value)
      marks.badge = {
        layerId: layer.id,
        icon: entry?.icon,
        label,
        tooltip: withDetail(`${layer.title}: ${label}`, v),
      }
      return
    }
    case 'marker':
      if (v.value === true || v.value === 'true')
        marks.markers.push({ layerId: layer.id, tooltip: withDetail(layer.title, v) })
      return
  }
}

/**
 * The marks of one node: for each active catalog layer that applies to the node's kind and has
 * a value in the node's `axisLayers` facet. A value for a layer the catalog lacks is ignored.
 */
export const resolveNodeMarks = (
  view: LayerView,
  kind: LayerNodeKind,
  facets: unknown
): NodeMarks => {
  const marks: NodeMarks = { markers: [] }
  if (!view.catalog) return marks
  const values = layerValues(facets)
  for (const layer of view.catalog.layers) {
    if (!view.active.has(layer.id) || !layer.appliesTo.includes(kind)) continue
    const v = values[layer.id]
    if (v) resolve(layer, v, marks)
  }
  return marks
}

/** The catalog layers that apply to a node kind present in the graph: the Layers panel's entries. */
export const layersForGraph = (catalog: LayerCatalog | null, kinds: Set<LayerNodeKind>) =>
  catalog ? catalog.layers.filter((l) => l.appliesTo.some((k) => kinds.has(k))) : []
