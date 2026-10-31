// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

/**
 * Jobs the Axis lineage UI never shows as jobs: each table's or view's own job (its DDL), which
 * the graph folds into its dataset, and the hidden `axis.layers` catalog job. The Jobs list,
 * the job counts and the search results leave them out too, so they agree with the graph.
 */

/** The job types of a dataset's own job: Axis emits one per table or view, named after it. */
export const OWN_JOB_TYPES = new Set(['table', 'view', 'materialized_view'])

interface DatasetRef {
  namespace: string
  name: string
}

export interface JobLike {
  namespace: string
  name: string
  facets?: unknown
}

const jobTypeFacet = (facets: unknown): Record<string, unknown> => {
  const facet =
    typeof facets === 'object' && facets !== null
      ? (facets as Record<string, unknown>).jobType
      : undefined
  return typeof facet === 'object' && facet !== null ? (facet as Record<string, unknown>) : {}
}

const lower = (v: unknown) => (typeof v === 'string' ? v.toLowerCase() : '')

/**
 * Whether a job is a dataset's own job: its standard `jobType` facet says table, view or
 * materialized view, and its only output is the dataset of its own name in its own namespace.
 * Recognised by the facets and outputs, never by the name alone.
 */
export const isOwnDatasetJob = (job: JobLike, outputs: DatasetRef[]): boolean => {
  if (!OWN_JOB_TYPES.has(lower(jobTypeFacet(job.facets).jobType))) return false
  const distinct = new Set(outputs.map((o) => `${o.namespace}\u0000${o.name}`))
  if (distinct.size !== 1) return false
  return outputs[0].name === job.name && outputs[0].namespace === job.namespace
}

/** Whether a job is the hidden Axis layer catalog (`jobType` AXIS / catalog). */
export const isLayerCatalogJob = (job: JobLike): boolean => {
  const facet = jobTypeFacet(job.facets)
  return lower(facet.integration) === 'axis' && lower(facet.jobType) === 'catalog'
}

/** Whether the UI's job lists, counts and search leave a job out. */
export const isHiddenJob = (job: JobLike & { outputs?: DatasetRef[] }): boolean =>
  isLayerCatalogJob(job) || isOwnDatasetJob(job, job.outputs ?? [])

/** The lineage node id of a job, as search results and the lineage graph name it. */
export const jobNodeId = (job: { namespace: string; name: string }) =>
  `job:${job.namespace}:${job.name}`
