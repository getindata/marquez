// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { AppBar, Toolbar } from '@mui/material'
import { DRAWER_WIDTH } from '../../helpers/theme'
import { Link } from 'react-router-dom'
import { SchemeSwitch, useAxisTokens } from '../../theme'
import { createTheme } from '@mui/material/styles'
import { useTheme } from '@emotion/react'
import Box from '@mui/material/Box'
import React, { ReactElement } from 'react'
import Search from '../search/Search'

/**
 * Axis lineage branding: "axis lineage", the colour scheme switch, the stock search and
 * "by Xebia" on the right.
 */
const Header = (): ReactElement => {
  const theme = createTheme(useTheme())
  const t = useAxisTokens()

  return (
    <AppBar
      position='fixed'
      elevation={0}
      sx={{
        zIndex: theme.zIndex.drawer + 1,
        backgroundColor: t.night,
        backgroundImage: 'none',
        borderBottom: `1px solid ${t.line}`,
        left: `${DRAWER_WIDTH + 1}px`,
        width: `calc(100% - ${DRAWER_WIDTH + 1}px)`,
      }}
    >
      <Toolbar disableGutters sx={{ gap: 2, pr: 3 }}>
        <Box
          component={Link}
          to='/'
          sx={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '6px',
            pl: 1,
            color: t.text,
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          <Box component='span' sx={{ fontWeight: 600, fontSize: 20, letterSpacing: '.2px' }}>
            axis
          </Box>
          <Box component='span' sx={{ color: t.muted, fontSize: 14 }}>
            lineage
          </Box>
        </Box>
        <SchemeSwitch />
        <Box
          flex={1}
          minWidth={0}
          sx={{
            '& #searchContainer': { width: '100%' },
            '& .MuiInputBase-root': { bgcolor: 'transparent' },
          }}
        >
          <Search />
        </Box>
        <Box sx={{ color: t.muted, fontSize: 13, whiteSpace: 'nowrap' }}>
          by{' '}
          <Box component='b' sx={{ color: t.text }}>
            Xebia
          </Box>
        </Box>
      </Toolbar>
    </AppBar>
  )
}

export default Header
