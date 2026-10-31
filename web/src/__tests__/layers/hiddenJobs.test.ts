// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import * as requestUtils from '../../store/requests'
import { IntervalMetric } from '../../store/requests/intervalMetrics'
import { getJobs, hiddenJobIndex, resetHiddenJobIndex } from '../../store/requests/jobs'
import { getSearch } from '../../store/requests/search'
import { isHiddenJob } from '../../layers/hiddenJobs'
import { withoutHiddenJobs as metricsWithoutHidden } from '../../store/requests/intervalMetrics'

const job = (
  name: string,
  jobType?: string,
  outputs: { namespace: string; name: string }[] = [],
  integration = 'ORACLE',
  createdAt = '2026-10-31T10:00:00Z'
) => ({
  id: { namespace: 'oracle', name },
  namespace: 'oracle',
  name,
  createdAt,
  outputs,
  facets: jobType ? { jobType: { integration, jobType, processingType: 'BATCH' } } : {},
})
const own = (name: string, type = 'table', createdAt?: string) =>
  job(name, type, [{ namespace: 'oracle', name }], 'ORACLE', createdAt)

describe('isHiddenJob', () => {
  it('hides a table, view or materialized view job writing its own dataset', () => {
    expect(isHiddenJob(own('s.t'))).toBe(true)
    expect(isHiddenJob(own('s.v', 'VIEW'))).toBe(true)
    expect(isHiddenJob(own('s.mv', 'materialized_view'))).toBe(true)
  })

  it('hides the axis.layers catalog job', () => {
    expect(isHiddenJob(job('axis.layers', 'catalog', [], 'AXIS'))).toBe(true)
  })

  it('keeps real jobs and anything short of the rule', () => {
    expect(isHiddenJob(job('s.load', 'procedure', [{ namespace: 'oracle', name: 's.t' }]))).toBe(
      false
    )
    expect(isHiddenJob(job('s.pkg', 'package'))).toBe(false)
    expect(isHiddenJob(job('s.t', undefined, [{ namespace: 'oracle', name: 's.t' }]))).toBe(false) // no facet
    expect(isHiddenJob(job('s.t', 'table', [{ namespace: 'oracle', name: 's.other' }]))).toBe(false)
    expect(isHiddenJob(job('s.t', 'table', [{ namespace: 'other', name: 's.t' }]))).toBe(false)
    expect(
      isHiddenJob(
        job('s.t', 'table', [
          { namespace: 'oracle', name: 's.t' },
          { namespace: 'oracle', name: 's.log' },
        ])
      )
    ).toBe(false)
    expect(isHiddenJob(job('x', 'catalog', [], 'ORACLE'))).toBe(false)
  })
})

// 3 real jobs, 4 own jobs and the catalog: 8 jobs the API counts
const ALL = [
  own('s.a', 'table', '2026-10-31T09:00:00Z'),
  job('s.load_a', 'procedure', [{ namespace: 'oracle', name: 's.a' }]),
  own('s.b', 'table', '2026-10-31T11:00:00Z'),
  job('s.pkg', 'package'),
  own('s.v', 'view', '2026-10-31T11:30:00Z'),
  job('s.dbt', 'model', [{ namespace: 'oracle', name: 's.m' }], 'DBT'),
  own('s.c', 'table', '2026-10-31T12:30:00Z'),
  job('axis.layers', 'catalog', [], 'AXIS', '2026-10-31T12:45:00Z'),
]

const serveJobs = (url: string) => {
  const query = new URLSearchParams(url.split('?')[1])
  const limit = Number(query.get('limit'))
  const offset = Number(query.get('offset'))
  return Promise.resolve({ totalCount: ALL.length, jobs: ALL.slice(offset, offset + limit) })
}

describe('job lists and counts without hidden jobs', () => {
  let spy: jest.SpyInstance
  beforeEach(() => {
    resetHiddenJobIndex()
    spy = jest.spyOn(requestUtils, 'genericFetchWrapper')
  })
  afterEach(() => spy.mockRestore())

  it('pages the visible jobs and counts only them', async () => {
    spy.mockImplementation((url: string) => serveJobs(url))
    const first = await getJobs('oracle', 2, 0)
    expect(first.totalCount).toBe(3)
    expect(first.jobs.map((j) => j.name)).toEqual(['s.load_a', 's.pkg'])
    const second = await getJobs('oracle', 2, 2)
    expect(second.jobs.map((j) => j.name)).toEqual(['s.dbt'])
    expect(spy.mock.calls[0][0]).toContain('/namespaces/oracle/jobs?limit=1000&offset=0')
  })

  it('reads every page when there are more jobs than one page holds', async () => {
    let calls = 0
    spy.mockImplementation((url: string) => {
      calls++
      const offset = Number(new URLSearchParams(url.split('?')[1]).get('offset'))
      // a server serving 3 per page
      return Promise.resolve({ totalCount: ALL.length, jobs: ALL.slice(offset, offset + 3) })
    })
    expect((await getJobs(null, 25, 0)).totalCount).toBe(3)
    expect(calls).toBe(3)
  })

  it('drops hidden jobs from search results and their count', async () => {
    spy.mockImplementation((url: string) =>
      url.includes('/search')
        ? Promise.resolve({
            totalCount: 3,
            results: [
              { type: 'DATASET', name: 's.a', namespace: 'oracle', nodeId: 'dataset:oracle:s.a' },
              { type: 'JOB', name: 's.a', namespace: 'oracle', nodeId: 'job:oracle:s.a' },
              { type: 'JOB', name: 's.load_a', namespace: 'oracle', nodeId: 'job:oracle:s.load_a' },
            ],
          })
        : serveJobs(url)
    )
    const found = await getSearch('s.a')
    expect(found.totalCount).toBe(2)
    expect(found.results.map((r: { nodeId: string }) => r.nodeId)).toEqual([
      'dataset:oracle:s.a',
      'job:oracle:s.load_a',
    ])
  })

  it('caches the hidden-job index for 30 s', async () => {
    spy.mockImplementation((url: string) => serveJobs(url))
    await hiddenJobIndex(1000)
    await hiddenJobIndex(20_000)
    expect(spy).toHaveBeenCalledTimes(1)
    await hiddenJobIndex(40_000)
    expect(spy).toHaveBeenCalledTimes(2)
  })

  it('takes hidden jobs created before each interval end out of the cumulative counts', async () => {
    spy.mockImplementation((url: string) => serveJobs(url))
    const { createdAt } = await hiddenJobIndex()
    const metrics: IntervalMetric[] = [
      { startInterval: '2026-10-31T08:00:00Z', endInterval: '2026-10-31T10:00:00Z', count: 2 },
      { startInterval: '2026-10-31T10:00:00Z', endInterval: '2026-10-31T12:00:00Z', count: 6 },
      { startInterval: '2026-10-31T12:00:00Z', endInterval: '2026-10-31T13:00:00Z', count: 8 },
    ]
    expect(metricsWithoutHidden(metrics, createdAt).map((m) => m.count)).toEqual([1, 3, 3])
  })
})
