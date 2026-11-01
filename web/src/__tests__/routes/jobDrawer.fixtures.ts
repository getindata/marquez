// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { LineageDataset, LineageJob, LineageNode } from '../../types/lineage'
import { LineageGraph, Run } from '../../types/api'
import { axisLayers } from '../layers/fixtures'

/** A synthetic PL/SQL procedure, as the Axis Oracle producer sends it. */
export const SOURCE = `---------------------------------------------------
PROCEDURE load_sales
IS
BEGIN
  INSERT INTO dw.fact_sales (sale_id, amount)
  SELECT sale_id, amount FROM stg.sales_raw;
END;`

export const JOB_NAME = 'etl.pkg_sales.load_sales'
export const JOB_ID = `job:oracle:${JOB_NAME}`

export const run = (id: string, state: Run['state'], startedAt: string, durationMs: number) =>
  ({
    id,
    state,
    createdAt: startedAt,
    updatedAt: startedAt,
    startedAt,
    endedAt: startedAt,
    durationMs,
    nominalStartTime: null,
    nominalEndTime: null,
    jobVersion: { name: JOB_NAME, namespace: 'oracle', version: 'v1' },
    args: {},
    facets: { parent: { job: { name: 'etl.pkg_sales', namespace: 'oracle' } } },
  } as unknown as Run)

export const LATEST = run('run-2', 'COMPLETED', '2026-10-31T16:12:51.652Z', 1336)

export const CODE_FACETS = {
  // the producer's sql facet: the unit's first line only
  sql: { query: '---------------------------------------------------', dialect: 'oracle' },
  sourceCode: { language: 'plsql', sourceCode: SOURCE },
}

const dataset = (name: string): LineageNode => ({
  id: `dataset:oracle:${name}`,
  type: 'DATASET',
  data: {
    id: { namespace: 'oracle', name },
    type: 'DB_TABLE',
    name,
    namespace: 'oracle',
    fields: [],
    facets: {},
  } as unknown as LineageDataset,
  inEdges: [],
  outEdges: [],
})

/** The job between `stg.sales_raw` (and `stg.channels`, past the fetched depth) and `dw.fact_sales`. */
export const jobGraph = (
  facets: object = CODE_FACETS
): { node: LineageNode; lineage: LineageGraph } => {
  const node: LineageNode = {
    id: JOB_ID,
    type: 'JOB',
    data: {
      id: { namespace: 'oracle', name: JOB_NAME },
      type: 'BATCH',
      name: JOB_NAME,
      namespace: 'oracle',
      simpleName: 'load_sales',
      parentJobName: 'etl.pkg_sales',
      parentJobUuid: 'p-1',
      inputs: [
        { namespace: 'oracle', name: 'stg.sales_raw' },
        { namespace: 'oracle', name: 'stg.channels' },
      ],
      outputs: [{ namespace: 'oracle', name: 'dw.fact_sales' }],
      latestRun: LATEST,
      facets: {
        jobType: { processingType: 'BATCH', integration: 'ORACLE', jobType: 'procedure' },
        ...axisLayers({ wave: 1, orchestrator: 'airflow', complexity: 0.64 }),
        ...facets,
      },
    } as unknown as LineageJob,
    inEdges: [{ origin: 'dataset:oracle:stg.sales_raw', destination: JOB_ID }],
    outEdges: [{ origin: JOB_ID, destination: 'dataset:oracle:dw.fact_sales' }],
  }
  return { node, lineage: { graph: [node, dataset('stg.sales_raw'), dataset('dw.fact_sales')] } }
}
