// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

/** The catalog of the Axis lineage layers design §4.2, as `axis push-layers` sends it. */
export const DESIGN_CATALOG = {
  layers: [
    {
      id: 'wave',
      title: 'Migration wave',
      kind: 'category',
      appliesTo: ['dataset', 'job'],
      slot: 'fill',
      default: true,
      legend: [
        { value: 0, label: '0 shared', color: '#6d6a78' },
        { value: 1, label: '1', color: '#3fa7d6' },
      ],
    },
    {
      id: 'orchestrator',
      title: 'Orchestrated by',
      kind: 'icon',
      appliesTo: ['job'],
      slot: 'badge',
      default: true,
      legend: [
        { value: 'oracle', label: 'Oracle Scheduler', icon: 'oracle' },
        { value: 'airflow', label: 'Airflow', icon: 'airflow' },
        { value: 'databricks', label: 'Databricks Workflows', icon: 'databricks' },
        { value: 'snowflake', label: 'Snowflake Tasks', icon: 'snowflake' },
        { value: 'etleap', label: 'Etleap', icon: 'etleap' },
        { value: 'dbt', label: 'dbt', icon: 'dbt' },
      ],
    },
    {
      id: 'heat',
      title: 'Query heat',
      kind: 'scale',
      appliesTo: ['dataset'],
      slot: 'dot',
      default: true,
      scale: 'log',
      min: 0,
      max: 8400,
      unit: 'queries',
      window: '30 days',
    },
    {
      id: 'complexity',
      title: 'Complexity',
      kind: 'scale',
      appliesTo: ['dataset', 'job'],
      slot: 'meter',
      default: false,
      scale: 'linear',
      min: 0,
      max: 1,
    },
  ],
}

export const axisLayers = (values: Record<string, unknown>) => ({
  axisLayers: {
    _producer: 'https://github.com/getindata/axis',
    values: Object.fromEntries(Object.entries(values).map(([k, v]) => [k, { value: v }])),
  },
})

/**
 * The layers of LAY-10 (getindata/axis#610) as its catalog entries: the zone chip (`tag`), the
 * size label (`label`), the migration status dot (`status`) and the decommission flag.
 */
export const LAY10_LAYERS = [
  {
    id: 'zone',
    title: 'Data zone',
    kind: 'category',
    appliesTo: ['dataset'],
    slot: 'tag',
    default: true,
    legend: [
      { value: 'staging', label: 'staging', color: '#94a3b8' },
      { value: 'core', label: 'core', color: '#8b5cf6' },
      { value: 'mart', label: 'mart', color: '#14b8a6' },
    ],
  },
  {
    id: 'size',
    title: 'Table size',
    kind: 'scale',
    appliesTo: ['dataset'],
    slot: 'label',
    default: false,
    scale: 'log',
    min: 0,
    max: 10737418240,
    unit: 'bytes',
  },
  {
    id: 'status',
    title: 'Migration status',
    kind: 'category',
    appliesTo: ['dataset', 'job'],
    slot: 'status',
    default: true,
    legend: [
      { value: 'pending', label: 'pending', color: '#94a3b8' },
      { value: 'converted', label: 'converted', color: '#3b82f6' },
      { value: 'reconciled', label: 'reconciled', color: '#22c55e' },
      { value: 'failed', label: 'failed', color: '#ef4444' },
    ],
  },
  {
    id: 'decommission',
    title: 'Decommission candidate',
    kind: 'flag',
    appliesTo: ['dataset'],
    slot: 'marker',
    default: false,
  },
]

export const FULL_CATALOG = { layers: [...DESIGN_CATALOG.layers, ...LAY10_LAYERS] }

/** A standard `tags` dataset facet as LAY-10's PII step sends it: one entry per PII column. */
export const piiTags = (columns: Record<string, string>) => ({
  tags: {
    _producer: 'https://github.com/getindata/axis',
    tags: Object.entries(columns).map(([field, kind]) => ({
      key: 'pii',
      value: kind,
      source: 'axis-agent',
      field,
    })),
  },
})
