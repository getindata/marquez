// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { LineageGraph } from '../../types/api'
import {
  collapseOwnJobs,
  collapsedLineage,
  hopDistances,
  trimToDepth,
} from '../../routes/table-level/collapse'

type Spec = { id: string; type: 'JOB' | 'DATASET'; jobType?: string }

/** A lineage graph from node specs and [origin, destination] edges (short ids: d:x, j:x). */
const graphOf = (nodes: Spec[], edges: [string, string][]): LineageGraph => {
  const full = (id: string) =>
    id.startsWith('d:') ? `dataset:oracle:${id.slice(2)}` : `job:oracle:${id.slice(2)}`
  return {
    graph: nodes.map((n) => ({
      id: full(n.id),
      type: n.type,
      data: {
        name: n.id.slice(2),
        namespace: 'oracle',
        facets: n.jobType
          ? { jobType: { integration: 'ORACLE', processingType: 'BATCH', jobType: n.jobType } }
          : {},
      } as any,
      inEdges: edges
        .filter(([, b]) => b === n.id)
        .map(([a, b]) => ({ origin: full(a), destination: full(b) })),
      outEdges: edges
        .filter(([a]) => a === n.id)
        .map(([a, b]) => ({ origin: full(a), destination: full(b) })),
    })),
  }
}

const ids = (g: LineageGraph) => g.graph.map((n) => n.id).sort()
const edgesOf = (g: LineageGraph) =>
  g.graph.flatMap((n) => n.outEdges.map((e) => `${e.origin} -> ${e.destination}`)).sort()

describe('collapseOwnJobs', () => {
  it('draws a view straight from the two tables it reads', () => {
    const g = graphOf(
      [
        { id: 'd:a', type: 'DATASET' },
        { id: 'd:b', type: 'DATASET' },
        { id: 'd:v', type: 'DATASET' },
        { id: 'j:v', type: 'JOB', jobType: 'VIEW' },
      ],
      [
        ['d:a', 'j:v'],
        ['d:b', 'j:v'],
        ['j:v', 'd:v'],
      ]
    )
    const { graph, hidden } = collapseOwnJobs(g)
    expect(ids(graph)).toEqual(['dataset:oracle:a', 'dataset:oracle:b', 'dataset:oracle:v'])
    expect(edgesOf(graph)).toEqual([
      'dataset:oracle:a -> dataset:oracle:v',
      'dataset:oracle:b -> dataset:oracle:v',
    ])
    expect(hidden.get('job:oracle:v')).toBe('dataset:oracle:v')
    const v = graph.graph.find((n) => n.id === 'dataset:oracle:v')
    expect(v?.inEdges.map((e) => e.origin).sort()).toEqual(['dataset:oracle:a', 'dataset:oracle:b'])
  })

  it('hides a table job and keeps the procedure that writes the table', () => {
    const g = graphOf(
      [
        { id: 'd:src', type: 'DATASET' },
        { id: 'd:t', type: 'DATASET' },
        { id: 'j:t', type: 'JOB', jobType: 'table' },
        { id: 'j:load_t', type: 'JOB', jobType: 'procedure' },
      ],
      [
        ['d:src', 'j:t'],
        ['j:t', 'd:t'],
        ['d:src', 'j:load_t'],
        ['j:load_t', 'd:t'],
      ]
    )
    const { graph } = collapseOwnJobs(g)
    expect(ids(graph)).toEqual(['dataset:oracle:src', 'dataset:oracle:t', 'job:oracle:load_t'])
    expect(edgesOf(graph)).toEqual([
      'dataset:oracle:src -> dataset:oracle:t',
      'dataset:oracle:src -> job:oracle:load_t',
      'job:oracle:load_t -> dataset:oracle:t',
    ])
  })

  it('keeps real jobs, and own-type jobs whose output is not their own dataset', () => {
    const g = graphOf(
      [
        { id: 'd:a', type: 'DATASET' },
        { id: 'd:b', type: 'DATASET' },
        { id: 'j:pkg', type: 'JOB', jobType: 'package' },
        { id: 'j:dbt', type: 'JOB', jobType: 'model' },
        { id: 'j:x', type: 'JOB', jobType: 'table' }, // a table job writing another dataset
        { id: 'j:untyped', type: 'JOB' },
      ],
      [
        ['d:a', 'j:pkg'],
        ['j:pkg', 'd:b'],
        ['d:a', 'j:dbt'],
        ['j:dbt', 'd:b'],
        ['d:a', 'j:x'],
        ['j:x', 'd:b'],
        ['j:untyped', 'd:a'],
      ]
    )
    const { graph, hidden } = collapseOwnJobs(g)
    expect(hidden.size).toBe(0)
    expect(graph).toBe(g)
  })

  it('needs the jobType facet: a job named after its dataset alone stays', () => {
    const g = graphOf(
      [
        { id: 'd:t', type: 'DATASET' },
        { id: 'j:t', type: 'JOB' },
      ],
      [['j:t', 'd:t']]
    )
    expect(collapseOwnJobs(g).hidden.size).toBe(0)
  })

  it('keeps a materialized view job with a second output', () => {
    const g = graphOf(
      [
        { id: 'd:mv', type: 'DATASET' },
        { id: 'd:log', type: 'DATASET' },
        { id: 'j:mv', type: 'JOB', jobType: 'materialized_view' },
      ],
      [
        ['j:mv', 'd:mv'],
        ['j:mv', 'd:log'],
      ]
    )
    expect(collapseOwnJobs(g).hidden.size).toBe(0)
  })
})

// a -> [j:t1] -> t1 -> [load] -> t2 -> [j:v] -> v ; v -> [report] -> r
const chain = graphOf(
  [
    { id: 'd:a', type: 'DATASET' },
    { id: 'j:t1', type: 'JOB', jobType: 'table' },
    { id: 'd:t1', type: 'DATASET' },
    { id: 'j:load', type: 'JOB', jobType: 'procedure' },
    { id: 'd:t2', type: 'DATASET' },
    { id: 'j:v', type: 'JOB', jobType: 'view' },
    { id: 'd:v', type: 'DATASET' },
    { id: 'j:report', type: 'JOB', jobType: 'procedure' },
    { id: 'd:r', type: 'DATASET' },
  ],
  [
    ['d:a', 'j:t1'],
    ['j:t1', 'd:t1'],
    ['d:t1', 'j:load'],
    ['j:load', 'd:t2'],
    ['d:t2', 'j:v'],
    ['j:v', 'd:v'],
    ['d:v', 'j:report'],
    ['j:report', 'd:r'],
  ]
)

describe('depth on the collapsed graph', () => {
  it('counts a hop per step from dataset to dataset, through a job or a collapsed edge', () => {
    const { graph } = collapseOwnJobs(chain)
    const d = hopDistances(graph, 'dataset:oracle:t2')
    expect(d.get('dataset:oracle:t2')).toBe(0)
    expect(d.get('job:oracle:load')).toBe(1)
    expect(d.get('dataset:oracle:t1')).toBe(1)
    expect(d.get('dataset:oracle:v')).toBe(1) // the view, via its hidden job's edge
    expect(d.get('dataset:oracle:a')).toBe(2)
    expect(d.get('job:oracle:report')).toBe(2)
    expect(d.get('dataset:oracle:r')).toBe(2)
  })

  it('cuts the collapsed graph to the depth, dropping edges to cut nodes', () => {
    const { graph } = collapseOwnJobs(chain)
    const one = trimToDepth(graph, 'dataset:oracle:t2', 1)
    expect(ids(one)).toEqual([
      'dataset:oracle:t1',
      'dataset:oracle:t2',
      'dataset:oracle:v',
      'job:oracle:load',
    ])
    expect(edgesOf(one)).toEqual([
      'dataset:oracle:t1 -> job:oracle:load',
      'dataset:oracle:t2 -> dataset:oracle:v',
      'job:oracle:load -> dataset:oracle:t2',
    ])
  })

  it('makes a selected hidden job stand for its dataset', () => {
    const { graph, selected } = collapsedLineage(chain, 'job:oracle:v', 1)
    expect(selected).toBe('dataset:oracle:v')
    expect(ids(graph)).toEqual([
      'dataset:oracle:r',
      'dataset:oracle:t2',
      'dataset:oracle:v',
      'job:oracle:report',
    ])
  })

  it('keeps every node within a large depth', () => {
    const { graph } = collapsedLineage(chain, 'dataset:oracle:a', 10)
    expect(graph.graph).toHaveLength(7) // 9 raw nodes less the two hidden jobs
  })
})
