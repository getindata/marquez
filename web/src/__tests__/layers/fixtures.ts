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
