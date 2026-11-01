// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { Box } from '@mui/system'
import { DRAWER_NODE_PARAM, useCloseDrawer } from './useCloseDrawer'
import { Drawer } from '@mui/material'
import { HEADER_HEIGHT } from '../../helpers/theme'
import { LayerCatalog } from '../../layers'
import { useAxisTokens } from '../../theme'
import { useSearchParams } from 'react-router-dom'
import React, { useEffect } from 'react'
import TableLevelDrawer from './TableLevelDrawer'

/**
 * The table-level view's drawer: the open node's table or job drawer, on the right. It is not
 * modal (MUI's persistent variant): there is no backdrop over the graph, so a card click with the
 * drawer open reaches the card and opens that node, with Back to the one before. The drawer
 * closes from its ✕ or Escape; a click on the graph's background leaves it open.
 */
export const GraphDrawer = ({ catalog }: { catalog: LayerCatalog | null }) => {
  const t = useAxisTokens()
  const [searchParams] = useSearchParams()
  const closeDrawer = useCloseDrawer()
  const open = !!searchParams.get(DRAWER_NODE_PARAM)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDrawer()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, closeDrawer])
  return (
    <Drawer
      anchor={'right'}
      variant='persistent'
      open={open}
      PaperProps={{
        sx: {
          backgroundColor: t.drawer,
          backgroundImage: 'none',
          mt: `${HEADER_HEIGHT}px`,
          height: `calc(100vh - ${HEADER_HEIGHT}px)`,
        },
      }}
    >
      <Box height='100%'>
        <TableLevelDrawer catalog={catalog} onClose={closeDrawer} />
      </Box>
    </Drawer>
  )
}
