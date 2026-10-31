// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { AXIS_NIGHT, DRAWER_WIDTH } from '../../helpers/theme'
import { AppBar, Toolbar } from '@mui/material'
import { Link } from 'react-router-dom'
import { createTheme } from '@mui/material/styles'
import { useTheme } from '@emotion/react'
import Box from '@mui/material/Box'
import React, { ReactElement } from 'react'
import Search from '../search/Search'

const MUTED = '#9a8fab'
const TEXT = '#ece6f2'

/** Axis lineage branding: "axis lineage", the stock search, "by Xebia" on the right. */
const Header = (): ReactElement => {
  const theme = createTheme(useTheme())

  return (
    <AppBar
      position='fixed'
      elevation={0}
      sx={{
        zIndex: theme.zIndex.drawer + 1,
        backgroundColor: AXIS_NIGHT,
        backgroundImage: 'none',
        borderBottom: '1px solid #34274a',
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
            color: TEXT,
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          <Box component='span' sx={{ fontWeight: 600, fontSize: 20, letterSpacing: '.2px' }}>
            axis
          </Box>
          <Box component='span' sx={{ color: MUTED, fontSize: 14 }}>
            lineage
          </Box>
        </Box>
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
        <Box sx={{ color: MUTED, fontSize: 13, whiteSpace: 'nowrap' }}>
          by{' '}
          <Box component='b' sx={{ color: TEXT }}>
            Xebia
          </Box>
        </Box>
      </Toolbar>
    </AppBar>
  )
}

export default Header
