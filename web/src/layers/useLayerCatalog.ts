// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { CATALOG_JOB_NAME, LayerCatalog, catalogFromJobFacets } from './catalog'
import { getJob } from '../store/requests/jobs'
import { useEffect, useState } from 'react'

/**
 * The layer catalog of a namespace: the `axisLayerCatalog` facet of its hidden job
 * `axis.layers`, read through the jobs API (its current facets). Null while loading and when
 * the namespace has none.
 */
export const useLayerCatalog = (namespace: string | undefined): LayerCatalog | null => {
  const [catalog, setCatalog] = useState<LayerCatalog | null>(null)
  useEffect(() => {
    let cancelled = false
    setCatalog(null)
    if (!namespace) return
    getJob(namespace, CATALOG_JOB_NAME)
      .then((job: { facets?: unknown }) => {
        if (cancelled) return
        const { catalog, problems } = catalogFromJobFacets(job?.facets)
        if (problems.length) console.warn(`axis layer catalog of ${namespace}:`, problems)
        setCatalog(catalog)
      })
      .catch(() => {
        // No catalog job in this namespace: no Layers button, no layer marks.
        if (!cancelled) setCatalog(null)
      })
    return () => {
      cancelled = true
    }
  }, [namespace])
  return catalog
}
