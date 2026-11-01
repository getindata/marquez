// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { DRAWER_NODE_PARAM } from '../useCloseDrawer'
import { useLocation, useSearchParams } from 'react-router-dom'

/**
 * Back in the drawer. Moving from one open drawer to another node (a drawer link or a card
 * click) pushes a browser history entry whose `location.state` carries the ids of the nodes
 * before it. The drawer's Back button is `navigate(-1)`, so it and the browser's Back land on
 * the same entry: the previous node, on the tab its URL keeps in `drawerTab=`. Closing the
 * drawer pushes an entry without that state, which ends the history. The URL itself never
 * carries the history, so a shared link opens one node, with no Back.
 */

/** The query parameter that keeps the open drawer's tab, e.g. `drawerTab=lineage`. */
export const DRAWER_TAB_PARAM = 'drawerTab'

export interface DrawerHistoryState {
  drawerBack: string[]
}

/** The ids of the nodes before the open one, oldest first. */
export const backStack = (state: unknown): string[] => {
  const back = (state as Partial<DrawerHistoryState> | null)?.drawerBack
  return Array.isArray(back) ? back.filter((id): id is string => typeof id === 'string') : []
}

/**
 * The `location.state` for a link to `targetId`: the open node pushed onto the history, or no
 * history when no drawer is open. A link to the open node itself keeps the history as it is.
 */
export const useDrawerLinkState = () => {
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const open = searchParams.get(DRAWER_NODE_PARAM)
  return (targetId: string): DrawerHistoryState => {
    const stack = backStack(location.state)
    if (!open) return { drawerBack: [] }
    if (open === targetId) return { drawerBack: stack }
    return { drawerBack: [...stack, open] }
  }
}

/** A node's short name for the Back button: the last part of its dotted name. */
export const shortName = (name: string) => name.split('.').filter(Boolean).pop() ?? name
