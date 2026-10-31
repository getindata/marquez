// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { LineageDataset, LineageJob, LineageNode } from '../../../types/lineage'
import { LineageGraph } from '../../../types/api'
import { isOwnDatasetJob } from '../collapse'
import { jobTypeOf } from '../../../layers'

/** A dataset a neighbour job reads or writes, by its lineage node id. */
export interface DatasetRef {
  id: string
  namespace: string
  name: string
}

/** A real job next to the table, with the datasets it reads (upstream) or writes (downstream). */
export interface NeighbourJob {
  id: string
  job: LineageJob
  datasets: DatasetRef[]
}

/**
 * One side of the table's lineage. `direct` holds what own (DDL) jobs stand for, collapsed as
 * the graph collapses them: upstream, the datasets the table's own DDL reads (a view's
 * tables); downstream, the views and tables whose own DDL reads this table.
 */
export interface LineageSide {
  jobs: NeighbourJob[]
  direct: DatasetRef[]
}

const datasetRef = (d: { namespace: string; name: string }): DatasetRef => ({
  id: `dataset:${d.namespace}:${d.name}`,
  namespace: d.namespace,
  name: d.name,
})

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name)

/**
 * The datasets a job reads or writes: its edges in the fetched graph, and its `inputs` or
 * `outputs`, which still name the datasets past the edge of the fetched depth.
 */
const jobDatasets = (
  node: LineageNode,
  byId: Map<string, LineageNode>,
  dir: 'inputs' | 'outputs'
): DatasetRef[] => {
  const found = new Map<string, DatasetRef>()
  const edgeIds =
    dir === 'inputs' ? node.inEdges.map((e) => e.origin) : node.outEdges.map((e) => e.destination)
  edgeIds.forEach((id) => {
    const n = byId.get(id)
    if (n?.type === 'DATASET') {
      const d = n.data as LineageDataset
      found.set(id, { id, namespace: d.namespace, name: d.name })
    }
  })
  ;((node.data as LineageJob)[dir] ?? []).forEach((d) => {
    const ref = datasetRef(d)
    if (!found.has(ref.id)) found.set(ref.id, ref)
  })
  return Array.from(found.values()).sort(byName)
}

/** The table's upstream (jobs that write it) and downstream (jobs that read it). */
export const tableNeighbours = (
  node: LineageNode,
  lineage: LineageGraph
): { upstream: LineageSide; downstream: LineageSide } => {
  const byId = new Map(lineage.graph.map((n) => [n.id, n]))

  const side = (jobIds: string[], dir: 'inputs' | 'outputs'): LineageSide => {
    const jobs: NeighbourJob[] = []
    const direct = new Map<string, DatasetRef>()
    Array.from(new Set(jobIds)).forEach((id) => {
      const n = byId.get(id)
      if (n?.type !== 'JOB') return
      const job = n.data as LineageJob
      if (jobTypeOf(job.facets).hidden) return // the layer catalog job is never shown
      const datasets = jobDatasets(n, byId, dir)
      if (isOwnDatasetJob(n, byId)) {
        // upstream: the table's own DDL, drawn as its inputs flowing straight in; downstream:
        // a view's own DDL, drawn as this table flowing straight into the view (its output)
        datasets.forEach((d) => direct.set(d.id, d))
        return
      }
      jobs.push({ id, job, datasets })
    })
    return {
      jobs: jobs.sort((a, b) => byName(a.job, b.job)),
      direct: Array.from(direct.values()).sort(byName),
    }
  }

  return {
    upstream: side(
      node.inEdges.map((e) => e.origin),
      'inputs'
    ),
    downstream: side(
      node.outEdges.map((e) => e.destination),
      'outputs'
    ),
  }
}

/** The stock column-level view of a dataset, in the same colour scheme. */
export const columnLineageUrl = (
  dataset: { namespace: string; name: string },
  searchParams: URLSearchParams
) => {
  const theme = searchParams.get('theme')
  return `/datasets/column-level/${encodeURIComponent(dataset.namespace)}/${encodeURIComponent(
    dataset.name
  )}${theme ? `?theme=${encodeURIComponent(theme)}` : ''}`
}
