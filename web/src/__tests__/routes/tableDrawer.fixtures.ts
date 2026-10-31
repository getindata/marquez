// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { LineageDataset, LineageJob, LineageNode } from '../../types/lineage'
import { LineageGraph } from '../../types/api'
import { axisLayers } from '../layers/fixtures'

/** A synthetic Oracle table with the facets of design §7.4. */
export const SOURCE_DDL = `CREATE TABLE dw.fact_sales (
  sale_id   NUMBER        NOT NULL,
  amount    NUMBER(12,2),
  sale_day  DATE          NOT NULL,
  channel   VARCHAR2(20 CHAR)
)
PARTITION BY RANGE (sale_day)
  INTERVAL (NUMTOYMINTERVAL(1, 'MONTH'))
COMPRESS FOR OLTP;`

export const TARGET_DDL = `CREATE TABLE dw.fact_sales (
  sale_id   DECIMAL(38,0) NOT NULL,
  amount    DECIMAL(12,2),
  sale_day  DATE          NOT NULL,
  channel   STRING
)
CLUSTER BY (sale_day);`

export const AXIS_DDL = {
  axisDdl: { dialect: 'oracle', language: 'sql', text: SOURCE_DDL },
}

export const SCHEMA = {
  schema: {
    fields: [
      { name: 'sale_id', type: 'NUMBER' },
      { name: 'amount', type: 'NUMBER' },
      { name: 'sale_day', type: 'DATE' },
      { name: 'channel', type: 'VARCHAR2' },
    ],
  },
}

export const migration = (
  state: 'will_apply' | 'applied',
  overrides: Record<string, unknown> = {}
) => ({
  axisMigration: {
    target: 'databricks',
    rules: [
      {
        id: 'ora2dbx-1',
        category: 'partitioning',
        kind: 'deterministic',
        status: 'verified',
        title: 'Oracle RANGE partitioning → Databricks liquid clustering CLUSTER BY',
        effect: 'PARTITION BY RANGE (sale_day) → CLUSTER BY (sale_day)',
        references: [
          'https://docs.oracle.com/partitioning',
          'https://docs.databricks.com/clustering',
        ],
        state,
      },
      {
        id: 'compression',
        category: 'storage',
        kind: 'agent',
        status: 'draft',
        title: 'COMPRESS FOR OLTP is dropped: Delta compresses its own files',
        effect: '',
        references: [],
        state,
      },
    ],
    columns: [
      { name: 'sale_id', source: 'NUMBER', target: 'DECIMAL(38,0)', exact: false },
      { name: 'amount', source: 'NUMBER(12,2)', target: 'DECIMAL(12,2)', exact: true },
      { name: 'sale_day', source: 'DATE', target: 'DATE', exact: false },
      { name: 'channel', source: 'VARCHAR2(20 CHAR)', target: 'STRING', exact: true },
    ],
    gaps: [
      {
        name: 'NUMTOYMINTERVAL',
        category: 'functions',
        note: 'no Databricks function; only the partition layout used it',
      },
    ],
    targetDdl: state === 'applied' ? TARGET_DDL : '',
    status: state === 'applied' ? 'converted' : 'assessed',
    ...overrides,
  },
})

export const LAYERS = axisLayers({ wave: 1, heat: 8400, complexity: 0.64 })

const datasetNode = (facets: object): LineageNode => ({
  id: 'dataset:oracle:dw.fact_sales',
  type: 'DATASET',
  data: {
    id: { namespace: 'oracle', name: 'dw.fact_sales' },
    type: 'DB_TABLE',
    name: 'dw.fact_sales',
    namespace: 'oracle',
    fields: [],
    facets,
  } as unknown as LineageDataset,
  inEdges: [
    { origin: 'job:oracle:dw.fact_sales', destination: 'dataset:oracle:dw.fact_sales' },
    { origin: 'job:oracle:etl.load_sales', destination: 'dataset:oracle:dw.fact_sales' },
  ],
  outEdges: [],
})

const jobNode = (name: string, jobType: string, output: string): LineageNode => ({
  id: `job:oracle:${name}`,
  type: 'JOB',
  data: {
    id: { namespace: 'oracle', name },
    type: 'BATCH',
    name,
    namespace: 'oracle',
    latestRun: null,
    facets: { jobType: { processingType: 'BATCH', integration: 'ORACLE', jobType } },
  } as unknown as LineageJob,
  inEdges: [],
  outEdges: [{ origin: `job:oracle:${name}`, destination: output }],
})

/** The table, its own DDL job (hidden from "written by") and one real writer. */
export const graphWith = (facets: object): { node: LineageNode; lineage: LineageGraph } => {
  const node = datasetNode(facets)
  return {
    node,
    lineage: {
      graph: [
        node,
        jobNode('dw.fact_sales', 'table', node.id),
        jobNode('etl.load_sales', 'procedure', node.id),
      ],
    },
  }
}
