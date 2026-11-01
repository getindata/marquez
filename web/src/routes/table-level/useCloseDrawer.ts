// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

/** The query parameter that names the node whose drawer is open. */
export const DRAWER_NODE_PARAM = 'tableLevelNode'

/**
 * Closes the table-level drawer by removing only `tableLevelNode` from the current query, so the
 * active layers (`layers=`), theme, depth and the rest stay as they are. It builds a new query
 * from the latest one rather than mutating a `searchParams` object captured in an earlier render.
 */
export const useCloseDrawer = () => {
  const [, setSearchParams] = useSearchParams()
  return useCallback(
    () =>
      setSearchParams((current) => {
        const next = new URLSearchParams(current)
        next.delete(DRAWER_NODE_PARAM)
        return next
      }),
    [setSearchParams]
  )
}
