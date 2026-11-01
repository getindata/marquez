// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { useAxisTokens } from '../../../theme'
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
