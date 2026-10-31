import { API_URL } from '../../globals'
import { genericFetchWrapper } from './index'
import { hiddenJobIndex } from './jobs'

export interface IntervalMetric {
  startInterval: string
  endInterval: string
  count: number
}

export const getIntervalMetrics = async (payload: {
  asset: 'jobs' | 'datasets' | 'sources'
  unit: 'day' | 'week'
}) => {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const url = `${API_URL}/stats/${
    payload.asset
  }?period=${payload.unit.toUpperCase()}&timezone=${timezone}`
  const metrics: IntervalMetric[] = await genericFetchWrapper(
    url,
    { method: 'GET' },
    'fetchIntervalMetrics'
  )
  if (payload.asset !== 'jobs' || !Array.isArray(metrics)) return metrics
  return withoutHiddenJobs(metrics, (await hiddenJobIndex()).createdAt)
}

/**
 * The cumulative job counts less the hidden jobs: the API counts every job created before each
 * interval's end, so each count drops by the hidden jobs created before that end.
 */
export const withoutHiddenJobs = (metrics: IntervalMetric[], hiddenCreatedAt: number[]) =>
  metrics.map((m) => {
    const end = Date.parse(m.endInterval)
    const hidden = hiddenCreatedAt.filter((t) => t < end).length
    return { ...m, count: Math.max(0, m.count - hidden) }
  })
