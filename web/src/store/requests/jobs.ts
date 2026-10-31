// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { API_URL } from '../../globals'
import { Job, Jobs, RunState } from '../../types/api'
import { Nullable } from '../../types/util/Nullable'
import { genericFetchWrapper } from './index'
import { isHiddenJob, jobNodeId } from '../../layers/hiddenJobs'

/** The largest page the jobs API serves. */
const MAX_PAGE = 1000

const jobsUrl = (
  namespace: Nullable<string>,
  limit: number,
  offset: number,
  lastRunStates?: RunState
) => {
  let url = `${API_URL}/jobs?limit=${limit}&offset=${offset}`
  if (namespace) {
    const encodedNamespace = encodeURIComponent(namespace)
    url = `${API_URL}/namespaces/${encodedNamespace}/jobs?limit=${limit}&offset=${offset}`
  }
  if (lastRunStates) {
    url += `&lastRunStates=${lastRunStates}`
  }
  return url
}

/** Every job of a namespace (or of all namespaces), page by page. */
export const fetchAllJobs = async (
  namespace: Nullable<string>,
  lastRunStates?: RunState
): Promise<Job[]> => {
  const all: Job[] = []
  for (;;) {
    const page: Jobs = await genericFetchWrapper(
      jobsUrl(namespace, MAX_PAGE, all.length, lastRunStates),
      { method: 'GET' },
      'fetchJobs'
    )
    all.push(...page.jobs)
    if (!page.jobs.length || all.length >= page.totalCount) return all
  }
}

/** How long a read of a namespace's visible jobs serves further pages and counts. */
const SNAPSHOT_TTL_MS = 30_000

interface Snapshot {
  at: number
  jobs: Promise<Job[]>
}
const snapshots = new Map<string, Snapshot>()

/**
 * The visible jobs of a namespace (or of all), from one full read that further pages reuse
 * for 30 s after it completes; a read in flight is shared, a failed one forgotten.
 */
const visibleJobs = (namespace: Nullable<string>, lastRunStates?: RunState): Promise<Job[]> => {
  const key = `${namespace ?? ''}\u0000${lastRunStates ?? ''}`
  const cached = snapshots.get(key)
  if (cached && (cached.at === Infinity || Date.now() - cached.at < SNAPSHOT_TTL_MS)) {
    return cached.jobs
  }
  const snapshot: Snapshot = { at: Infinity, jobs: Promise.resolve([]) } // Infinity: in flight
  snapshot.jobs = fetchAllJobs(namespace, lastRunStates).then(
    (jobs) => {
      snapshot.at = Date.now()
      return jobs.filter((j) => !isHiddenJob(j))
    },
    (error) => {
      if (snapshots.get(key) === snapshot) snapshots.delete(key)
      throw error
    }
  )
  snapshots.set(key, snapshot)
  return snapshot.jobs
}

/** Forget the jobs read for paging: after a job changes, and in tests. */
export const resetJobSnapshots = () => {
  snapshots.clear()
}

/**
 * A page of the jobs the UI shows, and their count: each table's or view's own job and the
 * `axis.layers` catalog job are left out (layers/hiddenJobs.ts), as on the lineage graph. The
 * API cannot filter by facets, so the web reads every job once and pages from that read.
 */
export const getJobs = async (
  namespace: Nullable<string>,
  limit = 25,
  offset = 0,
  lastRunStates?: RunState
) => {
  const visible = await visibleJobs(namespace, lastRunStates)
  return { totalCount: visible.length, jobs: visible.slice(offset, offset + limit) }
}

export interface HiddenJobIndex {
  /** Lineage node ids (`job:<namespace>:<name>`) of the hidden jobs. */
  ids: Set<string>
  /** When each hidden job was created, in ms. */
  createdAt: number[]
}

const HIDDEN_INDEX_TTL_MS = 30_000
/** How long search and the jobs chart wait for a first index before showing unfiltered data. */
export const HIDDEN_INDEX_WAIT_MS = 3_000

let hiddenIndex: { at: number; value: HiddenJobIndex } | null = null
let hiddenIndexInFlight: Promise<HiddenJobIndex> | null = null

const readHiddenIndex = (): Promise<HiddenJobIndex> => {
  if (!hiddenIndexInFlight) {
    hiddenIndexInFlight = fetchAllJobs(null).then(
      (jobs) => {
        const hidden = jobs.filter(isHiddenJob)
        const value = {
          ids: new Set(hidden.map(jobNodeId)),
          createdAt: hidden.map((j) => Date.parse(j.createdAt)),
        }
        // the 30 s start when the read completes, not when it starts
        hiddenIndex = { at: Date.now(), value }
        hiddenIndexInFlight = null
        return value
      },
      (error) => {
        hiddenIndexInFlight = null
        throw error
      }
    )
  }
  return hiddenIndexInFlight
}

/**
 * The hidden jobs of all namespaces. A fresh index (under 30 s old) is returned as it is; an
 * older one is returned at once while one read refreshes it; only the first call waits for a
 * read. Reads never overlap.
 */
export const hiddenJobIndex = (): Promise<HiddenJobIndex> => {
  if (hiddenIndex && Date.now() - hiddenIndex.at < HIDDEN_INDEX_TTL_MS) {
    return Promise.resolve(hiddenIndex.value)
  }
  const reading = readHiddenIndex()
  if (hiddenIndex) {
    reading.catch(() => undefined) // a failed refresh keeps the last index
    return Promise.resolve(hiddenIndex.value)
  }
  return reading
}

/**
 * The hidden-job index for search and the jobs chart, which never fail or stall on it: null
 * when the first read fails or takes longer than HIDDEN_INDEX_WAIT_MS (they then show the
 * API's own data).
 */
export const hiddenJobIndexOrNull = async (
  waitMs = HIDDEN_INDEX_WAIT_MS
): Promise<HiddenJobIndex | null> => {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), waitMs)
  })
  try {
    return await Promise.race([hiddenJobIndex(), timeout])
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/** Forget the hidden-job index (tests). */
export const resetHiddenJobIndex = () => {
  hiddenIndex = null
  hiddenIndexInFlight = null
}

export const deleteJob = async (namespace: string, jobName: string) => {
  const encodedNamespace = encodeURIComponent(namespace)
  const encodedJob = encodeURIComponent(jobName)
  const url = `${API_URL}/namespaces/${encodedNamespace}/jobs/${encodedJob}`
  resetJobSnapshots()
  return genericFetchWrapper(url, { method: 'DELETE' }, 'deleteJob')
}

export const getRuns = async (
  jobName: string,
  namespace: string,
  limit: number,
  offset: number
) => {
  const encodedNamespace = encodeURIComponent(namespace)
  const encodedJob = encodeURIComponent(jobName)
  const url = `${API_URL}/namespaces/${encodedNamespace}/jobs/${encodedJob}/runs?limit=${limit}&offset=${offset}`
  return genericFetchWrapper(url, { method: 'GET' }, 'fetchRuns')
}

export const getJob = async (namespace: string, jobName: string) => {
  const encodedNamespace = encodeURIComponent(namespace)
  const encodedJob = encodeURIComponent(jobName)
  const url = `${API_URL}/namespaces/${encodedNamespace}/jobs/${encodedJob}`
  return genericFetchWrapper(url, { method: 'GET' }, 'fetchJob')
}

export const deleteJobTag = async (namespace: string, jobName: string, tag: string) => {
  const encodedNamespace = encodeURIComponent(namespace)
  const encodedJob = encodeURIComponent(jobName)
  const encodedTag = encodeURIComponent(tag)
  const url = `${API_URL}/namespaces/${encodedNamespace}/jobs/${encodedJob}/tags/${encodedTag}`
  return genericFetchWrapper(url, { method: 'DELETE' }, 'deleteJobTag')
}

export const addJobTag = async (namespace: string, jobName: string, tag: string) => {
  const encodedNamespace = encodeURIComponent(namespace)
  const encodedJob = encodeURIComponent(jobName)
  const encodedTag = encodeURIComponent(tag)
  const url = `${API_URL}/namespaces/${encodedNamespace}/jobs/${encodedJob}/tags/${encodedTag}`
  return genericFetchWrapper(url, { method: 'POST' }, 'addJobTag')
}

/**
 * Jobs whose latest run is in `runState`, paged and counted like the Jobs list: through the jobs
 * API's `lastRunStates` filter and getJobs, so hidden jobs on any page are left out of the
 * page and the total alike.
 */
export const getJobsByState = async (runState: RunState, limit: number, offset: number) =>
  getJobs(null, limit, offset, runState)
