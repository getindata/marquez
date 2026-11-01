// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { DRAWER_NODE_PARAM } from '../useCloseDrawer'
import { useLocation, useSearchParams } from 'react-router-dom'

/**
 * Back in the drawer. Moving from one open drawer to another node (a drawer link or a card
 * click) pushes a browser history entry whose `location.state` lists the nodes before it, each
 * with its path and tab. The drawer's Back button goes to the last of them, on that tab, with
 * the query as it is now: a scheme, layer, Depth or Compact change made since is kept, where
 * the browser's own Back would bring back that entry's old query. Every query write in the
 * table-level view (theme, layers, Depth, Full graph, Compact nodes, collapsed nodes, the tab)
 * passes `location.state` on, so the list survives it. Closing the drawer pushes an entry
 * without it, which ends the history. The URL never carries the history, so a shared link
 * opens one node, with no Back.
 */

/** The query parameter that keeps the open drawer's tab, e.g. `drawerTab=lineage`. */
export const DRAWER_TAB_PARAM = 'drawerTab'

/** A node to go back to: its id, the path it was open on, and its tab then. */
export interface BackEntry {
  id: string
  pathname: string
  tab: string | null
}

export interface DrawerHistoryState {
  drawerBack: BackEntry[]
}

const isEntry = (e: unknown): e is BackEntry =>
  typeof e === 'object' &&
  e !== null &&
  typeof (e as BackEntry).id === 'string' &&
  typeof (e as BackEntry).pathname === 'string' &&
  ((e as BackEntry).tab === null || typeof (e as BackEntry).tab === 'string')

/** The nodes before the open one, oldest first. */
export const backStack = (state: unknown): BackEntry[] => {
  const back = (state as Partial<DrawerHistoryState> | null)?.drawerBack
  return Array.isArray(back) ? back.filter(isEntry) : []
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
    const here = { id: open, pathname: location.pathname, tab: searchParams.get(DRAWER_TAB_PARAM) }
    return { drawerBack: [...stack, here] }
  }
}

/** Where Back goes: the entry's path, node and tab, on the current query. */
export const backUrl = (entry: BackEntry, search: string) => {
  const params = new URLSearchParams(search)
  params.set(DRAWER_NODE_PARAM, entry.id)
  if (entry.tab) params.set(DRAWER_TAB_PARAM, entry.tab)
  else params.delete(DRAWER_TAB_PARAM)
  return `${entry.pathname}?${params.toString()}`
}

/** A node's short name for the Back button: the last part of its dotted name. */
export const shortName = (name: string) => name.split('.').filter(Boolean).pop() ?? name
