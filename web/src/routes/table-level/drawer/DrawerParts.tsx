// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { DRAWER_TAB_PARAM, backStack, shortName } from './drawerHistory'
import { LineageGraph } from '../../../types/api'
import { useAxisTokens } from '../../../theme'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import React from 'react'

/** The drawers' close button. */
export const CloseButton = ({ onClose }: { onClose: () => void }) => {
  const t = useAxisTokens()
  return (
    <button
      type='button'
      aria-label='Close'
      onClick={onClose}
      style={{ border: 0, background: 'none', color: t.muted, fontSize: 18, cursor: 'pointer' }}
    >
      ✕
    </button>
  )
}

/** The drawers' tab bar: the selected tab is underlined in the scheme's accent. */
export const DrawerTabs = <K extends string>({
  tabs,
  labels,
  value,
  onChange,
}: {
  tabs: K[]
  labels: Record<K, string>
  value: K
  onChange: (tab: K) => void
}) => {
  const t = useAxisTokens()
  return (
    <div
      role='tablist'
      style={{
        display: 'flex',
        gap: 4,
        padding: '8px 14px 0',
        borderBottom: `1px solid ${t.line}`,
      }}
    >
      {tabs.map((k) => (
        <button
          key={k}
          type='button'
          role='tab'
          aria-selected={value === k}
          onClick={() => onChange(k)}
          style={{
            border: 0,
            background: 'none',
            padding: '7px 12px',
            cursor: 'pointer',
            fontFamily: t.font,
            fontSize: 13,
            color: value === k ? t.text : t.muted,
            fontWeight: value === k ? 600 : 400,
            borderBottom: `2px solid ${value === k ? t.accent : 'transparent'}`,
          }}
        >
          {labels[k]}
        </button>
      ))}
    </div>
  )
}

/**
 * The drawer's tab, kept in the URL (`drawerTab=`) so Back and a shared link land on it: the
 * URL's tab when this drawer has it, else the first. Switching tabs replaces the history entry
 * and keeps its drawer history.
 */
export const useDrawerTab = <K extends string>(tabs: K[]): [K, (tab: K) => void] => {
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const asked = searchParams.get(DRAWER_TAB_PARAM) as K | null
  const tab = asked && tabs.includes(asked) ? asked : tabs[0]
  const setTab = (next: K) =>
    setSearchParams(
      (current) => {
        const params = new URLSearchParams(current)
        params.set(DRAWER_TAB_PARAM, next)
        return params
      },
      { replace: true, state: location.state }
    )
  return [tab, setTab]
}

/** "← Back to <node>" while the drawer has a node to go back to; the same as the browser's Back. */
export const BackButton = ({ lineage }: { lineage: LineageGraph }) => {
  const t = useAxisTokens()
  const location = useLocation()
  const navigate = useNavigate()
  const stack = backStack(location.state)
  if (!stack.length) return null
  const previous = stack[stack.length - 1]
  const node = lineage.graph.find((n) => n.id === previous)
  const name = node ? node.data.name : previous.split(':').pop() ?? previous
  return (
    <div style={{ padding: '10px 18px 0' }}>
      <button
        type='button'
        title={name}
        onClick={() => navigate(-1)}
        style={{
          border: `1px solid ${t.line}`,
          background: 'none',
          color: t.link,
          borderRadius: 6,
          padding: '3px 10px',
          fontSize: 12,
          cursor: 'pointer',
          fontFamily: t.font,
        }}
      >
        ← Back to {shortName(name)}
      </button>
    </div>
  )
}
