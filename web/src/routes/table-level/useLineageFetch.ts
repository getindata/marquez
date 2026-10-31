// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { JobOrDataset } from '../../types/lineage'
import { useEffect } from 'react'

/**
 * Fetches the lineage of a node at `fetchDepth`, again only when the node or that depth
 * changes: with Full graph on, moving Depth below the Full graph bound asks for nothing new.
 */
export const useLineageFetch = (
  fetchLineage: (nodeType: JobOrDataset, namespace: string, name: string, depth: number) => void,
  nodeType: string | undefined,
  namespace: string | undefined,
  name: string | undefined,
  fetchDepth: number
) => {
  useEffect(() => {
    if (name && namespace && nodeType) {
      fetchLineage(nodeType as JobOrDataset, namespace, name, fetchDepth)
    }
  }, [nodeType, namespace, name, fetchDepth])
}
