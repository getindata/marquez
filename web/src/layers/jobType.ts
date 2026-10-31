// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

/**
 * Job type is not a layer: it comes from the standard OpenLineage `jobType` job facet
 * (`integration` and `jobType`), is always on, and works for events Axis did not produce
 * (Axis lineage layers design §4.4).
 */

export type JobGlyph =
  | 'plsql'
  | 'package'
  | 'trigger'
  | 'dbt'
  | 'etleap'
  | 'notebook'
  | 'sql'
  | 'airflow'
  | 'gear'

export interface JobTypeInfo {
  glyph: JobGlyph
  caption: string
  /** The Axis layer catalog job (`AXIS` / `catalog`) is never drawn. */
  hidden: boolean
}

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

/** The glyph and caption of a job from its facets, case-insensitively; gear and "job" otherwise. */
export const jobTypeOf = (facets: unknown): JobTypeInfo => {
  const facet =
    typeof facets === 'object' && facets !== null
      ? (facets as Record<string, unknown>).jobType
      : undefined
  const raw = typeof facet === 'object' && facet !== null ? (facet as Record<string, unknown>) : {}
  const integration = str(raw.integration).toUpperCase()
  const given = str(raw.jobType)
  const type = given.toLowerCase()
  const info = (glyph: JobGlyph, caption: string): JobTypeInfo => ({
    glyph,
    caption,
    hidden: false,
  })

  switch (integration) {
    case 'ORACLE':
      if (type === 'procedure' || type === 'function') return info('plsql', `PL/SQL ${type}`)
      if (type === 'package') return info('package', 'PL/SQL package')
      if (type === 'trigger') return info('trigger', 'PL/SQL trigger')
      break
    case 'DBT':
      if (['model', 'snapshot', 'seed', 'test'].includes(type)) return info('dbt', `dbt ${type}`)
      break
    case 'ETLEAP':
      if (type === 'pipeline' || type === 'model') return info('etleap', `Etleap ${type}`)
      break
    case 'SPARK':
    case 'DATABRICKS':
      if (['notebook', 'job', 'task'].includes(type))
        return info('notebook', `${integration === 'SPARK' ? 'Spark' : 'Databricks'} ${type}`)
      break
    case 'SNOWFLAKE':
      if (type === 'task') return info('sql', 'SQL task')
      break
    case 'AIRFLOW':
      if (type === 'task') return info('airflow', 'Airflow task')
      if (type === 'dag') return info('airflow', 'Airflow DAG')
      break
    case 'AXIS':
      if (type === 'catalog') return { glyph: 'gear', caption: 'layer catalog', hidden: true }
      break
  }
  return info('gear', given ? given.replace(/_/g, ' ') : 'job')
}
