// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { LineageGraph } from '../../types/api'
import { LineageJob, LineageNode } from '../../types/lineage'

/**
 * Power BI in the Axis lineage UI: what a dataset in a `powerbi://` namespace is (a model
 * table, the report's measures or a report page), the page layout of its `axisPowerBiPage`
 * facet, and the code of the job that writes it (its refresh's Power Query M or the measures'
 * DAX). The Axis Power BI consumer sends these; any other dataset reads as not Power BI.
 */

export type PowerBiKind = 'table' | 'measures' | 'page'

export const POWERBI_TYPE_LABELS: Record<PowerBiKind, string> = {
  table: 'Power BI table',
  measures: 'Power BI measures',
  page: 'Power BI page',
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)
const str = (v: unknown) => (typeof v === 'string' ? v : '')
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)

export const isPowerBiNamespace = (namespace: unknown) =>
  typeof namespace === 'string' && namespace.toLowerCase().startsWith('powerbi://')

/**
 * A `powerbi://` dataset's kind: a page has `axisPowerBiPage`, the measures `axisPowerBiModel`
 * (the model's relationships), any other is a model table. Null outside `powerbi://`.
 */
export const powerBiKindOf = (dataset: {
  namespace: string
  facets?: unknown
}): PowerBiKind | null => {
  if (!isPowerBiNamespace(dataset.namespace)) return null
  const facets = isObject(dataset.facets) ? dataset.facets : {}
  if (isObject(facets.axisPowerBiPage)) return 'page'
  if (isObject(facets.axisPowerBiModel)) return 'measures'
  return 'table'
}

export interface VisualPosition {
  x: number
  y: number
  width: number
  height: number
  z: number
}

export interface PowerBiVisual {
  type: string
  title: string
  fields: string[]
  /** Null when the report layout gives the visual no position. */
  position: VisualPosition | null
}

export interface PowerBiPage {
  /** The page's size; null when the facet gives none, or one out of range (see `MAX_PAGE_SIZE`). */
  width: number | null
  height: number | null
  visuals: PowerBiVisual[]
}

/** A page side over this many px is not a report page: its layout is not drawn. */
export const MAX_PAGE_SIZE = 10_000

/** How far past the page's edge a visual may reach and still be drawn: layouts round to 1 px. */
const FIT_SLACK = 1

const pageSide = (v: unknown) => {
  const n = num(v)
  return n !== null && n > 0 && n <= MAX_PAGE_SIZE ? n : null
}

/**
 * A visual's position when it lies inside the page: no negative offset, a positive size, and
 * no edge past the page's. Null otherwise, and on a page with no usable size: such a visual is
 * listed under the page, not drawn on it.
 */
const positionOf = (
  v: Record<string, unknown>,
  page: { width: number | null; height: number | null }
): VisualPosition | null => {
  const [x, y, width, height] = [num(v.x), num(v.y), num(v.width), num(v.height)]
  if (x === null || y === null || width === null || height === null) return null
  if (page.width === null || page.height === null) return null
  if (x < 0 || y < 0 || width <= 0 || height <= 0) return null
  if (x + width > page.width + FIT_SLACK || y + height > page.height + FIT_SLACK) return null
  return { x, y, width, height, z: num(v.z) ?? 0 }
}

/**
 * The page of an `axisPowerBiPage` facet: `width`, `height` and each visual's `type`, `title`,
 * `fields`, and `x`, `y`, `width`, `height`, `z` when it has a position inside the page. Null
 * for a missing or malformed facet.
 */
export const readPowerBiPage = (facets: unknown): PowerBiPage | null => {
  const f = isObject(facets) ? facets.axisPowerBiPage : null
  if (!isObject(f)) return null
  const size = { width: pageSide(f.width), height: pageSide(f.height) }
  const visuals = (Array.isArray(f.visuals) ? f.visuals : []).filter(isObject).map(
    (v): PowerBiVisual => ({
      type: str(v.type),
      title: str(v.title),
      fields: (Array.isArray(v.fields) ? v.fields : []).map(str).filter(Boolean),
      position: positionOf(v, size),
    })
  )
  return { ...size, visuals }
}

export type VisualGlyph = 'card' | 'table' | 'line' | 'column' | 'pie' | 'slicer' | 'generic'

/** A visual's glyph from its Power BI `visualType`: `clusteredColumnChart` is a column chart. */
export const visualGlyphOf = (type: string): VisualGlyph => {
  const t = type.toLowerCase()
  if (t.includes('slicer')) return 'slicer'
  if (t.includes('pie') || t.includes('donut')) return 'pie'
  if (t.includes('line') || t.includes('area')) return 'line'
  if (t.includes('column') || t.includes('bar')) return 'column'
  if (t.includes('table') || t.includes('matrix') || t.includes('pivot')) return 'table'
  if (t.includes('card') || t.includes('kpi')) return 'card'
  return 'generic'
}

/** `clusteredColumnChart` → `clustered column chart`, `tableEx` → `table`. */
export const visualTypeLabel = (type: string) =>
  type === 'tableEx'
    ? 'table'
    : type
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .toLowerCase()
        .trim() || 'visual'

/** A page field `Sales.Total Sales`: its table and the column or measure after the first dot. */
export const fieldParts = (field: string): { table: string; name: string } => {
  const dot = field.indexOf('.')
  return dot > 0
    ? { table: field.slice(0, dot), name: field.slice(dot + 1) }
    : { table: '', name: field }
}

const sourceLanguage = (job: LineageJob) => {
  const source = isObject(job.facets) ? job.facets.sourceCode : null
  return isObject(source) ? str(source.language).toLowerCase() : ''
}

export const POWER_QUERY_LANGUAGES = ['powerquery', 'm', 'pq']

/**
 * The job that writes a dataset with code in one of `languages` (a model table's refresh, in
 * Power Query M; the measures' job, in DAX), from the graph already loaded; null when the graph
 * has none.
 */
export const writerWithCode = (
  node: LineageNode,
  lineage: LineageGraph,
  languages: string[]
): { id: string; job: LineageJob } | null => {
  const byId = new Map(lineage.graph.map((n) => [n.id, n]))
  for (const edge of node.inEdges) {
    const writer = byId.get(edge.origin)
    if (writer?.type !== 'JOB') continue
    const job = writer.data as LineageJob
    if (languages.includes(sourceLanguage(job))) return { id: writer.id, job }
  }
  return null
}

/** The connector a Power Query source opens, by its function's prefix, as a platform id. */
const CONNECTORS: Record<string, string> = {
  oracle: 'oracle',
  sql: 'sqlserver',
  snowflake: 'snowflake',
  googlebigquery: 'bigquery',
  postgresql: 'postgres',
  databricks: 'databricks',
  mysql: 'mysql',
  amazonredshift: 'redshift',
  teradata: 'teradata',
}

/** M's escapes in a text literal: `""` is a quote, `#(lf)`, `#(cr)` and `#(tab)` are controls. */
const unescapeM = (text: string) =>
  text
    .replace(/""/g, '"')
    .replace(/#\(cr\)#\(lf\)/gi, '\n')
    .replace(/#\(lf\)/gi, '\n')
    .replace(/#\(cr\)/gi, '\n')
    .replace(/#\(tab\)/gi, '\t')

export interface NativeQuery {
  sql: string
  /** The platform id of the connector that runs it (`oracle`), else empty. */
  dialect: string
}

/**
 * The native queries of a Power Query M script: each `Query="…"` option, unescaped, with the
 * dialect of the connector call it is in (`Oracle.Database(…)` is Oracle).
 */
export const nativeQueries = (m: string): NativeQuery[] => {
  const found: NativeQuery[] = []
  const option = /\bQuery\s*=\s*"((?:[^"]|"")*)"/g
  for (let match = option.exec(m); match; match = option.exec(m)) {
    const sql = unescapeM(match[1]).trim()
    if (!sql) continue
    // the last connector call opened before the option
    const before = m.slice(0, match.index)
    const call = /\b([A-Za-z]+)\.[A-Za-z]+\s*\(/g
    let dialect = ''
    for (let c = call.exec(before); c; c = call.exec(before)) {
      dialect = CONNECTORS[c[1].toLowerCase()] ?? dialect
    }
    found.push({ sql, dialect })
  }
  return found
}
