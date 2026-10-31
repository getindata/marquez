// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { LineageEdge, LineageJob, LineageNode } from '../../types/lineage'
import { LineageGraph } from '../../types/api'

/** The job types of a dataset's own job: Axis emits one per table or view, named after it. */
const OWN_JOB_TYPES = new Set(['table', 'view', 'materialized_view'])

/**
 * Whether a job is a dataset's own job (the DDL of a table or view): its standard `jobType`
 * facet says table, view or materialized view, and its only output is the dataset of its own
 * name in its own namespace. Recognised by the facets, never by the name alone.
 */
export const isOwnDatasetJob = (node: LineageNode, byId: Map<string, LineageNode>): boolean => {
  if (node.type !== 'JOB') return false
  const job = node.data as LineageJob
  const facet = (job.facets as Record<string, any> | undefined)?.jobType
  const type = typeof facet?.jobType === 'string' ? facet.jobType.toLowerCase() : ''
  if (!OWN_JOB_TYPES.has(type)) return false
  const outputs = new Set(node.outEdges.map((e) => e.destination))
  if (outputs.size !== 1) return false
  const output = byId.get(Array.from(outputs)[0])
  return (
    !!output &&
    output.type === 'DATASET' &&
    output.data.name === job.name &&
    output.data.namespace === job.namespace
  )
}

export interface CollapsedGraph {
  graph: LineageGraph
  /** Hidden job id -> the dataset it stood for. */
  hidden: Map<string, string>
}

/**
 * Hides each dataset's own job and draws its inputs straight into the dataset: a view keeps an
 * edge from every table it reads. Real jobs (procedures, packages, triggers, dbt…) stay.
 */
export const collapseOwnJobs = (lineage: LineageGraph): CollapsedGraph => {
  const byId = new Map(lineage.graph.map((n) => [n.id, n]))
  const hidden = new Map<string, string>()
  lineage.graph.forEach((n) => {
    if (isOwnDatasetJob(n, byId)) hidden.set(n.id, n.outEdges[0].destination)
  })
  if (!hidden.size) return { graph: lineage, hidden }

  const key = (e: LineageEdge) => `${e.origin}\u0000${e.destination}`
  const edges = new Map<string, LineageEdge>()
  lineage.graph.forEach((n) =>
    n.outEdges.forEach((e) => {
      const target = hidden.get(e.destination)
      if (hidden.has(e.origin)) return // the hidden job's own output edge
      if (target !== undefined) {
        // an input of a hidden job flows straight into its dataset
        if (e.origin !== target) {
          const direct = { origin: e.origin, destination: target }
          edges.set(key(direct), direct)
        }
        return
      }
      edges.set(key(e), e)
    })
  )

  const outOf = new Map<string, LineageEdge[]>()
  const into = new Map<string, LineageEdge[]>()
  edges.forEach((e) => {
    outOf.set(e.origin, [...(outOf.get(e.origin) ?? []), e])
    into.set(e.destination, [...(into.get(e.destination) ?? []), e])
  })
  const graph = lineage.graph
    .filter((n) => !hidden.has(n.id))
    .map((n) => ({ ...n, outEdges: outOf.get(n.id) ?? [], inEdges: into.get(n.id) ?? [] }))
  return { graph: { graph }, hidden }
}

/**
 * How many hops each node is from `start` on the (collapsed) graph, in either direction. A hop
 * is one step from a dataset to the next: through a job, or along a dataset-to-dataset edge
 * that stands for a hidden job. A job sits at the hop of the step it makes, so its inputs and
 * outputs are shown with it.
 */
export const hopDistances = (lineage: LineageGraph, start: string): Map<string, number> => {
  const byId = new Map(lineage.graph.map((n) => [n.id, n]))
  const dist = new Map<string, number>()
  if (!byId.has(start)) return dist
  dist.set(start, 0)
  const deque: string[] = [start]
  while (deque.length) {
    const id = deque.shift() as string
    const node = byId.get(id)
    if (!node) continue
    const d = dist.get(id) as number
    const neighbours = [
      ...node.outEdges.map((e) => e.destination),
      ...node.inEdges.map((e) => e.origin),
    ]
    for (const next of neighbours) {
      const other = byId.get(next)
      if (!other) continue
      // entering a job, or a dataset straight from a dataset, is a hop; leaving a job is not
      const cost = node.type === 'JOB' ? 0 : 1
      const nd = d + cost
      if (dist.has(next) && (dist.get(next) as number) <= nd) continue
      dist.set(next, nd)
      if (cost === 0) deque.unshift(next)
      else deque.push(next)
    }
  }
  return dist
}

/** The graph cut to the nodes at most `depth` hops from `start` (see `hopDistances`). */
export const trimToDepth = (lineage: LineageGraph, start: string, depth: number): LineageGraph => {
  const dist = hopDistances(lineage, start)
  if (!dist.size) return lineage
  const keep = (id: string) => (dist.get(id) ?? Infinity) <= depth
  return {
    graph: lineage.graph
      .filter((n) => keep(n.id))
      .map((n) => ({
        ...n,
        outEdges: n.outEdges.filter((e) => keep(e.destination)),
        inEdges: n.inEdges.filter((e) => keep(e.origin)),
      })),
  }
}

/**
 * How deep Full graph asks the lineage API to go: a server-side bound on the traversal, apart
 * from the Depth control (which Full graph ignores). 20 job hops covers every graph seen so far.
 */
export const FULL_GRAPH_DEPTH = 20

/** The depth the UI asks the API for: one hop more than shown, or the Full graph bound. */
export const lineageFetchDepth = (depth: number, isFull: boolean) =>
  isFull ? Math.max(FULL_GRAPH_DEPTH, depth + 1) : depth + 1

/**
 * The table-level graph the UI draws: own jobs collapsed, then cut to `depth` hops from the
 * selected node, except in Full graph, which draws everything fetched. A selected own job
 * stands for its dataset.
 */
export const collapsedLineage = (
  lineage: LineageGraph,
  selectedId: string,
  depth: number,
  isFull = false
) => {
  const { graph, hidden } = collapseOwnJobs(lineage)
  const selected = hidden.get(selectedId) ?? selectedId
  return { graph: isFull ? graph : trimToDepth(graph, selected, depth), selected, hidden }
}
