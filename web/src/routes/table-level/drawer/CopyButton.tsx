// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { useAxisTokens } from '../../../theme'
import React, { useEffect, useState } from 'react'

const copyText = (text: string) => {
  try {
    void navigator.clipboard?.writeText(text)
  } catch {
    // no clipboard (insecure origin): nothing to do
  }
}

/** The drawer's Copy button: it reads Copied for a moment after a click. */
export const CopyButton = ({ text, label = 'Copy' }: { text: string; label?: string }) => {
  const t = useAxisTokens()
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(timer)
  }, [copied])
  return (
    <button
      type='button'
      onClick={() => {
        copyText(text)
        setCopied(true)
      }}
      style={{
        marginLeft: 'auto',
        border: `1px solid ${t.line}`,
        background: 'none',
        color: t.text,
        borderRadius: 6,
        padding: '3px 10px',
        fontSize: 11.5,
        cursor: 'pointer',
        fontFamily: t.font,
      }}
    >
      {copied ? 'Copied' : label}
    </button>
  )
}
