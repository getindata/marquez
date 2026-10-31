// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { jobTypeOf } from '../../layers'

const facets = (integration: string, jobType: string) => ({
  jobType: { processingType: 'BATCH', integration, jobType },
})

describe('jobTypeOf (design §4.4)', () => {
  it.each([
    ['ORACLE', 'procedure', 'plsql', 'PL/SQL procedure'],
    ['ORACLE', 'function', 'plsql', 'PL/SQL function'],
    ['ORACLE', 'package', 'package', 'PL/SQL package'],
    ['ORACLE', 'trigger', 'trigger', 'PL/SQL trigger'],
    ['DBT', 'model', 'dbt', 'dbt model'],
    ['DBT', 'snapshot', 'dbt', 'dbt snapshot'],
    ['DBT', 'seed', 'dbt', 'dbt seed'],
    ['DBT', 'test', 'dbt', 'dbt test'],
    ['ETLEAP', 'pipeline', 'etleap', 'Etleap pipeline'],
    ['ETLEAP', 'model', 'etleap', 'Etleap model'],
    ['SPARK', 'notebook', 'notebook', 'Spark notebook'],
    ['SPARK', 'job', 'notebook', 'Spark job'],
    ['DATABRICKS', 'notebook', 'notebook', 'Databricks notebook'],
    ['DATABRICKS', 'job', 'notebook', 'Databricks job'],
    ['DATABRICKS', 'task', 'notebook', 'Databricks task'],
    ['SNOWFLAKE', 'task', 'sql', 'SQL task'],
    ['AIRFLOW', 'task', 'airflow', 'Airflow task'],
    ['AIRFLOW', 'dag', 'airflow', 'Airflow DAG'],
  ])('%s %s -> %s glyph, "%s"', (integration, jobType, glyph, caption) => {
    expect(jobTypeOf(facets(integration, jobType))).toEqual({ glyph, caption, hidden: false })
  })

  it('is case-insensitive', () => {
    expect(jobTypeOf(facets('oracle', 'PROCEDURE'))).toMatchObject({ glyph: 'plsql' })
    expect(jobTypeOf(facets('Dbt', 'Model'))).toMatchObject({ glyph: 'dbt', caption: 'dbt model' })
  })

  it('hides the AXIS catalog job', () => {
    expect(jobTypeOf(facets('AXIS', 'catalog')).hidden).toBe(true)
  })

  it('falls back to the gear and the job type as given', () => {
    expect(jobTypeOf(facets('ORACLE', 'materialized_view'))).toEqual({
      glyph: 'gear',
      caption: 'materialized view',
      hidden: false,
    })
    expect(jobTypeOf(facets('SPARK', 'streaming'))).toMatchObject({ glyph: 'gear' })
  })

  it('falls back to the gear and "job" without a jobType facet', () => {
    const fallback = { glyph: 'gear', caption: 'job', hidden: false }
    expect(jobTypeOf(undefined)).toEqual(fallback)
    expect(jobTypeOf({})).toEqual(fallback)
    expect(jobTypeOf({ jobType: { integration: 'ORACLE' } })).toEqual(fallback)
  })
})
