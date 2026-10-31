// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import {
  AxisTokens,
  SCHEMES,
  SCHEME_PARAM,
  SCHEME_STORAGE_KEY,
  SchemeName,
  cssVariables,
  resolveScheme,
} from './schemes'
import { MUI_THEMES } from '../helpers/theme'
import { ThemeProvider } from '@mui/material/styles'
import { useSearchParams } from 'react-router-dom'
import React, { ReactNode, createContext, useContext, useEffect, useMemo, useState } from 'react'

interface SchemeContextValue {
  scheme: SchemeName
  tokens: AxisTokens
  setScheme: (scheme: SchemeName) => void
}

/** Without a provider (tests, isolated renders) the UI is in the default Dark scheme. */
export const SchemeContext = createContext<SchemeContextValue>({
  scheme: 'dark',
  tokens: SCHEMES.dark,
  setScheme: () => undefined,
})

export const useScheme = () => useContext(SchemeContext)
export const useAxisTokens = () => useContext(SchemeContext).tokens

const readStored = (): string | null => {
  try {
    return window.localStorage.getItem(SCHEME_STORAGE_KEY)
  } catch {
    return null
  }
}

const writeStored = (scheme: SchemeName) => {
  try {
    window.localStorage.setItem(SCHEME_STORAGE_KEY, scheme)
  } catch {
    // storage blocked (private window, policy): the choice lasts for this page only
  }
}

const prefersLight = (): boolean => {
  try {
    return window.matchMedia?.('(prefers-color-scheme: light)').matches ?? false
  } catch {
    return false
  }
}

/**
 * Picks the colour scheme (URL `theme=`, then the stored choice, then the system preference,
 * else Dark), provides its tokens and MUI theme, and mirrors the tokens as `--axis-*` CSS
 * variables and `data-theme` on <html>.
 */
export const SchemeProvider = ({ children }: { children: ReactNode }) => {
  const [searchParams, setSearchParams] = useSearchParams()
  const urlParam = searchParams.get(SCHEME_PARAM)
  const [chosen, setChosen] = useState<string | null>(readStored)
  const [systemLight, setSystemLight] = useState<boolean>(prefersLight)

  useEffect(() => {
    let query: MediaQueryList | undefined
    try {
      query = window.matchMedia?.('(prefers-color-scheme: light)')
    } catch {
      query = undefined
    }
    if (!query?.addEventListener) return
    const onChange = (e: MediaQueryListEvent) => setSystemLight(e.matches)
    query.addEventListener('change', onChange)
    return () => query?.removeEventListener('change', onChange)
  }, [])

  const scheme = resolveScheme({ urlParam, stored: chosen, prefersLight: systemLight })
  const tokens = SCHEMES[scheme]

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = scheme
    Object.entries(cssVariables(tokens)).forEach(([name, value]) =>
      root.style.setProperty(name, value)
    )
  }, [scheme, tokens])

  const value = useMemo<SchemeContextValue>(
    () => ({
      scheme,
      tokens,
      setScheme: (next) => {
        writeStored(next)
        setChosen(next)
        // a URL that names a scheme would override the choice: keep it in step
        if (searchParams.has(SCHEME_PARAM)) {
          searchParams.set(SCHEME_PARAM, next)
          setSearchParams(searchParams)
        }
      },
    }),
    [scheme, tokens, searchParams, setSearchParams]
  )

  return (
    <SchemeContext.Provider value={value}>
      <ThemeProvider theme={MUI_THEMES[scheme]}>{children}</ThemeProvider>
    </SchemeContext.Provider>
  )
}
