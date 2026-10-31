// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { SCHEME_LABELS, SCHEME_NAMES } from './schemes'
import { useScheme } from './SchemeContext'
import React from 'react'

/** The header's segmented control: Dark · Light · Xebia. */
export const SchemeSwitch = () => {
  const { scheme, tokens: t, setScheme } = useScheme()
  return (
    <span
      role='radiogroup'
      aria-label='Colour scheme'
      data-testid='scheme-switch'
      style={{
        display: 'inline-flex',
        border: `1px solid ${t.line}`,
        borderRadius: 7,
        overflow: 'hidden',
        fontSize: 12,
        fontFamily: t.font,
        flex: 'none',
      }}
    >
      {SCHEME_NAMES.map((name) => {
        const on = name === scheme
        return (
          <button
            key={name}
            type='button'
            role='radio'
            aria-checked={on}
            data-scheme={name}
            onClick={() => setScheme(name)}
            style={{
              padding: '4px 10px',
              border: 0,
              font: 'inherit',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              color: on ? t.accentFillText : t.muted,
              background: on ? t.accentFill : 'transparent',
            }}
          >
            {SCHEME_LABELS[name]}
          </button>
        )
      })}
    </span>
  )
}
