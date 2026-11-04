// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { LineageDataset, LineageJob, LineageNode } from '../../types/lineage'
import { LineageGraph } from '../../types/api'

/**
 * A synthetic Power BI report as the Axis Power BI consumer sends it: two model tables loaded
 * by Power Query refreshes from Oracle (one through a native query), the report's DAX
 * measures, and one page with seven visuals, its `axisPowerBiPage` carrying the layout keys
 * (`width`, `height`, each visual's `x`, `y`, `width`, `height`, `z`).
 */

export const NS = 'powerbi://shop-report'

export const DATES_M = `let
    Source = Oracle.Database("db:1521/SHOP", [HierarchicalNavigation=true]),
    DW = Source{[Schema="DW"]}[Data],
    Dates = DW{[Name="DIM_DATE"]}[Data]
in
    Dates`

export const ORDERS_M = `let
    // the monthly roll-up runs in the database
    Source = Oracle.Database("db:1521/SHOP", [Query="SELECT d.year AS order_year, SUM(o.amount) AS revenue#(lf)FROM dw.fact_orders o JOIN dw.dim_date d ON d.day = o.order_day#(lf)WHERE o.status = ""paid""#(lf)GROUP BY d.year"])
in
    Source`

export const DAX = `Revenue = SUM(Orders[AMOUNT])

Orders count = COUNTROWS(Orders)

-- year over year
YoY % = VAR Last = CALCULATE([Revenue], SAMEPERIODLASTYEAR('Dates'[DAY]))
RETURN DIVIDE([Revenue] - Last, Last)`

const jobType = (type: string) => ({
  jobType: { integration: 'POWERBI', jobType: type, processingType: 'BATCH' },
})

const schema = (...fields: [string, string?][]) => ({
  schema: { fields: fields.map(([name, type]) => ({ name, ...(type ? { type } : {}) })) },
})

export const PAGE_FACET = {
  width: 1280,
  height: 720,
  visuals: [
    // listed out of z order: the wireframe sorts them
    {
      type: 'tableEx',
      title: 'Orders by year',
      fields: ['Orders.order_year', 'Orders.revenue'],
      x: 20,
      y: 440,
      width: 1240,
      height: 260,
      z: 6000,
    },
    {
      type: 'card',
      title: 'Revenue',
      fields: ['Orders.Revenue'],
      x: 20,
      y: 20,
      width: 290,
      height: 110,
      z: 0,
    },
    {
      type: 'card',
      title: 'Orders count',
      fields: ['Orders.Orders count'],
      x: 330,
      y: 20,
      width: 290,
      height: 110,
      z: 1000,
    },
    {
      type: 'card',
      title: 'YoY %',
      fields: ['Orders.YoY %'],
      x: 640,
      y: 20,
      width: 290,
      height: 110,
      z: 2000,
    },
    {
      type: 'multiRowCard',
      title: '',
      fields: ['Orders.Revenue'],
      x: 950,
      y: 20,
      width: 290,
      height: 110,
      z: 3000,
    },
    {
      type: 'lineChart',
      title: 'Revenue by month',
      fields: ['Dates.Month', 'Orders.Revenue'],
      x: 20,
      y: 150,
      width: 760,
      height: 270,
      z: 4000,
    },
    {
      type: 'clusteredColumnChart',
      title: 'YoY % by quarter',
      fields: ['Dates.Quarter', 'Orders.YoY %'],
      x: 800,
      y: 150,
      width: 460,
      height: 270,
      z: 5000,
    },
  ],
}

const dataset = (name: string, facets: object, namespace = NS): LineageNode => ({
  id: `dataset:${namespace}:${name}`,
  type: 'DATASET',
  data: {
    id: { namespace, name },
    type: 'DB_TABLE',
    name,
    namespace,
    fields: [],
    facets,
    tags: [],
  } as unknown as LineageDataset,
  inEdges: [],
  outEdges: [],
})

const job = (name: string, facets: object): LineageNode => ({
  id: `job:${NS}:${name}`,
  type: 'JOB',
  data: {
    id: { namespace: NS, name },
    type: 'BATCH',
    name,
    namespace: NS,
    simpleName: name,
    parentJobName: null,
    parentJobUuid: null,
    inputs: [],
    outputs: [],
    latestRun: null,
    facets,
  } as unknown as LineageJob,
  inEdges: [],
  outEdges: [],
})

export const IDS = {
  dates: `dataset:${NS}:Dates`,
  orders: `dataset:${NS}:Orders`,
  measures: `dataset:${NS}:shop-report measures`,
  page: `dataset:${NS}:shop-report: Overview`,
  excel: 'dataset:excel://files.example.com:/targets.xlsx#Targets',
  oracle: 'dataset:oracle:dw.fact_orders',
  datesRefresh: `job:${NS}:Dates.refresh`,
  ordersRefresh: `job:${NS}:Orders.refresh`,
  measuresJob: `job:${NS}:shop-report.measures`,
  render: `job:${NS}:shop-report: Overview.render`,
}

/** The report's graph; `pageFacet` replaces the page's `axisPowerBiPage`. */
export const powerBiGraph = (pageFacet: object = PAGE_FACET): LineageGraph => {
  const nodes = [
    dataset('dw.fact_orders', schema(['AMOUNT', 'NUMBER']), 'oracle'),
    dataset(
      '/targets.xlsx#Targets',
      { axisStatus: { state: 'external' }, ...schema(['TARGET']) },
      'excel://files.example.com'
    ),
    dataset('Dates', schema(['DAY', 'dateTime'], ['Month', 'string'], ['Quarter', 'string'])),
    dataset('Orders', schema(['order_year', 'int64'], ['revenue', 'double'])),
    dataset('shop-report measures', {
      axisPowerBiModel: { relationships: [{ from: 'Orders.DAY', to: 'Dates.DAY' }] },
      ...schema(['Revenue'], ['Orders count'], ['YoY %']),
    }),
    dataset('shop-report: Overview', {
      axisPowerBiPage: pageFacet,
      ...schema(
        ['Orders.order_year'],
        ['Orders.revenue'],
        ['Orders.Revenue'],
        ['Orders.Orders count'],
        ['Orders.YoY %'],
        ['Dates.Month'],
        ['Dates.Quarter']
      ),
    }),
    job('Dates.refresh', {
      ...jobType('refresh'),
      sourceCode: { language: 'powerquery', sourceCode: DATES_M },
    }),
    job('Orders.refresh', {
      ...jobType('refresh'),
      sourceCode: { language: 'powerquery', sourceCode: ORDERS_M },
    }),
    job('shop-report.measures', {
      ...jobType('dax'),
      sourceCode: { language: 'dax', sourceCode: DAX },
    }),
    job('shop-report: Overview.render', jobType('page')),
  ]
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const link = (origin: string, destination: string) => {
    const edge = { origin, destination }
    byId.get(origin)?.outEdges.push(edge)
    byId.get(destination)?.inEdges.push(edge)
  }
  link(IDS.oracle, IDS.datesRefresh)
  link(IDS.datesRefresh, IDS.dates)
  link(IDS.oracle, IDS.ordersRefresh)
  link(IDS.ordersRefresh, IDS.orders)
  link(IDS.orders, IDS.measuresJob)
  link(IDS.dates, IDS.measuresJob)
  link(IDS.measuresJob, IDS.measures)
  link(IDS.measures, IDS.render)
  link(IDS.orders, IDS.render)
  link(IDS.dates, IDS.render)
  link(IDS.render, IDS.page)
  return { graph: nodes }
}

export const nodeOf = (lineage: LineageGraph, id: string) =>
  lineage.graph.find((n) => n.id === id) as LineageNode
