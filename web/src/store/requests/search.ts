// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { API_BETA_URL, API_URL } from '../../globals'
import { OpenSearchResultJobs, Search } from '../../types/api'
import { genericFetchWrapper } from './index'
import { hiddenJobIndexOrNull } from './jobs'

export const getSearch = async (q: string, filter = 'ALL', sort = 'NAME', limit = 100) => {
  let url = `${API_URL}/search?q=${q}&sort=${sort}&limit=${limit}`
  if (filter === 'JOB' || filter === 'DATASET') {
    url += `&filter=${filter}`
  }
  const response: Search = await genericFetchWrapper(url, { method: 'GET' }, 'fetchSearch')
  return withoutHiddenJobs(response)
}

/** Search results less the jobs the UI hides (own table/view jobs, the layer catalog). */
export const withoutHiddenJobs = async (response: Search): Promise<Search> => {
  if (!response?.results?.some((r) => r.type === 'JOB')) return response
  const index = await hiddenJobIndexOrNull()
  if (!index) return response // no index yet: the API's results as they are
  const { ids } = index
  const results = response.results.filter((r) => !(r.type === 'JOB' && ids.has(r.nodeId)))
  return {
    ...response,
    results,
    totalCount: response.totalCount - (response.results.length - results.length),
  }
}

export const getOpenSearchJobs = async (q: string) => {
  const url = `${API_BETA_URL}/search/jobs?q=${q}`
  const response: OpenSearchResultJobs = await genericFetchWrapper(
    url,
    { method: 'GET' },
    'fetchOpenSearchJobs'
  )
  if (!response?.hits?.length) return response
  const index = await hiddenJobIndexOrNull()
  if (!index) return response
  const { ids } = index
  const keep = response.hits.map((h) => !ids.has(`job:${h.namespace}:${h.name}`))
  return {
    hits: response.hits.filter((_, i) => keep[i]),
    highlights: (response.highlights ?? []).filter((_, i) => keep[i]),
  }
}

export const getOpenSearchDatasets = async (q: string) => {
  const url = `${API_BETA_URL}/search/datasets?q=${q}`
  return genericFetchWrapper(url, { method: 'GET' }, 'fetchOpenSearchDatasets')
}
