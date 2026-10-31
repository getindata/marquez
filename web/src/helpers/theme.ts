// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { AxisTokens, SCHEMES, SchemeName } from '../theme/schemes'
import { Theme, createTheme } from '@mui/material'

/** The MUI theme of an Axis colour scheme (src/theme/schemes.ts). */
export const createAxisMuiTheme = (t: AxisTokens) =>
  createTheme({
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          '@global': {
            body: {
              color: t.text,
            },
          },
          '.MuiInputBase-root': {
            paddingTop: '0',
            paddingBottom: '0',
          },
        },
      },
    },
    typography: {
      fontFamily: t.font,
      h1: {
        fontSize: '2.5rem',
        fontWeight: 600,
      },
      h3: {
        fontSize: '1rem',
        fontWeight: 600,
      },
      fontSize: 14,
    },
    palette: {
      mode: t.mode,
      primary: {
        // the scheme's accent: calm blue in Dark and Light, Xebia magenta in the demo scheme
        main: t.accent,
      },
      error: {
        main: '#ee7b7b',
      },
      warning: {
        main: '#FFB74D',
      },
      success: {
        main: '#4CAF50',
      },
      info: {
        main: '#9c98ec',
      },
      background: {
        default: t.page,
        paper: t.card,
      },
      secondary: {
        main: t.scheme === 'xebia' ? '#454f5b' : t.line,
      },
      text: {
        primary: t.text,
        secondary: t.muted,
      },
    },
    zIndex: {
      snackbar: 9999,
    },
  })

export const MUI_THEMES: Record<SchemeName, Theme> = {
  dark: createAxisMuiTheme(SCHEMES.dark),
  light: createAxisMuiTheme(SCHEMES.light),
  xebia: createAxisMuiTheme(SCHEMES.xebia),
}

/** The default scheme's MUI theme, for code that reads the theme statically. */
export const theme = MUI_THEMES.dark

export const THEME_EXTRA = {
  typography: {
    subdued: '#abb1bd',
    disabled: '#8d9499',
  },
}

// 1px for bottom border
export const HEADER_HEIGHT = 64 + 1
export const DRAWER_WIDTH = 80
