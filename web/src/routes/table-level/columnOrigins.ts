// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

/**
 * Where a column's values come from: the upstream-most columns of its column lineage, read
 * from Marquez's `GET /column-lineage`. The fork's API takes a dataset node only (a
 * `datasetField:` node is not found), so we ask for the table's upstream graph once and walk
 * it from the field. Asked for on the first hover only; each table's answer and each field's
 * origins are kept for the session.
 */

import { API_URL } from '../../globals'
import { useEffect, useState } from 'react'

export interface FieldRef {
  namespace: string
  dataset: string
  field: string
}

/** How far upstream to look: the fork's own default. */
const DEPTH = 20
/** How many source columns the line names before it counts the rest. */
const MAX_NAMED = 3

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const asRef = (v: unknown): FieldRef | null => {
  if (!isObject(v)) return null
  const { namespace, dataset, field } = v
  if (typeof namespace !== 'string' || typeof dataset !== 'string' || typeof field !== 'string')
    return null
  return field ? { namespace, dataset, field } : null
}

const keyOf = (r: FieldRef) => `${r.namespace}\u0000${r.dataset}\u0000${r.field.toLowerCase()}`

/**
 * The columns at the far end of `start`'s column lineage, in `graph` (a `/column-lineage`
 * body): the fields reached through `inputFields` that read nothing themselves, or whose
 * inputs the graph does not hold. A field reading itself (a MERGE that reads its own target)
 * is not an input. Sorted and distinct; none when `start` reads nothing or is not in the graph.
 */
export const upstreamOrigins = (graph: unknown, start: FieldRef): FieldRef[] => {
  const nodes = isObject(graph) && Array.isArray(graph.graph) ? graph.graph : []
  const inputs = new Map<string, FieldRef[]>()
  for (const node of nodes) {
    const data = isObject(node) ? node.data : undefined
    const ref = asRef(data)
    if (!ref || !isObject(data)) continue
    const own = keyOf(ref)
    const read = (Array.isArray(data.inputFields) ? data.inputFields : [])
      .map(asRef)
      .filter((r): r is FieldRef => r !== null && keyOf(r) !== own)
    inputs.set(own, [...(inputs.get(own) ?? []), ...read])
  }
  const first = inputs.get(keyOf(start))
  if (!first?.length) return []
  const origins = new Map<string, FieldRef>()
  const seen = new Set([keyOf(start)])
  const queue = [...first]
  while (queue.length) {
    const ref = queue.shift() as FieldRef
    const key = keyOf(ref)
    if (seen.has(key)) continue
    seen.add(key)
    const read = inputs.get(key)
    // a field that reads only fields already walked (a cycle) is no origin
    if (read?.length) queue.push(...read)
    else origins.set(key, ref)
  }
  return [...origins.values()].sort((a, b) => label(a).localeCompare(label(b)))
}

/** `table.column`: the last part of the dataset name, then the column. */
const label = (r: FieldRef) => `${r.dataset.slice(r.dataset.lastIndexOf('.') + 1)}.${r.field}`

/** "from wrk_customers.passport_number", at most three names then "+ n more"; '' for none. */
export const originLabel = (origins: FieldRef[]) => {
  if (!origins.length) return ''
  const named = origins.slice(0, MAX_NAMED).map(label).join(', ')
  const rest = origins.length - MAX_NAMED
  return `from ${named}${rest > 0 ? ` + ${rest} more` : ''}`
}

const graphs = new Map<string, Promise<unknown>>()
const origins = new Map<string, FieldRef[]>()

const tableGraph = (namespace: string, dataset: string) => {
  const key = `${namespace}\u0000${dataset}`
  let graph = graphs.get(key)
  if (!graph) {
    const nodeId = `dataset:${namespace}:${dataset}`
    const url =
      `${API_URL}/column-lineage?nodeId=${encodeURIComponent(nodeId)}` +
      `&depth=${DEPTH}&withDownstream=false`
    // whatever goes wrong (no fetch, a 404, a body that is not JSON) leaves no origin
    graph = Promise.resolve()
      .then(() => fetch(url))
      .then((response) => (response?.ok ? response.json() : null))
      .catch(() => null)
    graphs.set(key, graph)
  }
  return graph
}

/** The origins of `ref`, when they are known already. */
export const cachedFieldOrigins = (ref: FieldRef) => origins.get(keyOf(ref))

/** The origins of `ref`: one request per table, none when the request fails. */
export const loadFieldOrigins = async (ref: FieldRef): Promise<FieldRef[]> => {
  const cached = cachedFieldOrigins(ref)
  if (cached) return cached
  const found = upstreamOrigins(await tableGraph(ref.namespace, ref.dataset), ref)
  origins.set(keyOf(ref), found)
  return found
}

/** For tests: forget every answer. */
export const clearFieldOriginCache = () => {
  graphs.clear()
  origins.clear()
}

/** The origins of `ref`, loaded when the calling component first mounts; undefined until then. */
export const useFieldOrigins = (ref: FieldRef) => {
  const [found, setFound] = useState(() => cachedFieldOrigins(ref))
  const { namespace, dataset, field } = ref
  useEffect(() => {
    let live = true
    loadFieldOrigins({ namespace, dataset, field }).then((r) => live && setFound(r))
    return () => {
      live = false
    }
  }, [namespace, dataset, field])
  return found
}
