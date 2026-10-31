// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { CenterFocusStrong, MapOutlined, ZoomIn, ZoomOut } from '@mui/icons-material'
import { useAxisTokens } from '../../theme'
import IconButton from '@mui/material/IconButton'
import MQTooltip from '../../components/core/tooltip/MQTooltip'
import React from 'react'

interface TableZoomControlsProps {
  onZoom: (inOrOut: 'in' | 'out') => void
  onFitAll: () => void
  onCenter: () => void
  mapOpen: boolean
  onToggleMap: () => void
}

/**
 * The table-level graph's controls, in the strip the graph keeps free on its right: zoom in and
 * out, centre on the selected node, Fit all, and the minimap switch.
 */
export const TableZoomControls = ({
  onZoom,
  onFitAll,
  onCenter,
  mapOpen,
  onToggleMap,
}: TableZoomControlsProps) => {
  const t = useAxisTokens()
  const button = { color: t.muted, '&:hover': { color: t.text } }
  return (
    <div
      data-testid='zoom-controls'
      style={{
        position: 'absolute',
        top: 8,
        right: 8,
        width: 40,
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        border: `1px solid ${t.line}`,
        borderRadius: 6,
        background: t.actionBar,
        fontFamily: t.font,
      }}
    >
      <MQTooltip title='Zoom in' placement='left'>
        <IconButton size='small' sx={button} onClick={() => onZoom('in')} aria-label='Zoom in'>
          <ZoomIn />
        </IconButton>
      </MQTooltip>
      <MQTooltip title='Zoom out' placement='left'>
        <IconButton size='small' sx={button} onClick={() => onZoom('out')} aria-label='Zoom out'>
          <ZoomOut />
        </IconButton>
      </MQTooltip>
      <MQTooltip title='Center on selected node' placement='left'>
        <IconButton
          size='small'
          sx={button}
          onClick={onCenter}
          aria-label='Center on selected node'
        >
          <CenterFocusStrong />
        </IconButton>
      </MQTooltip>
      <MQTooltip title='Show the whole graph' placement='left'>
        <button
          type='button'
          onClick={onFitAll}
          aria-label='Fit all'
          style={{
            width: 36,
            margin: '2px 0 4px',
            padding: '3px 0',
            border: `1px solid ${t.line}`,
            borderRadius: 4,
            background: 'none',
            color: t.text,
            font: 'inherit',
            fontSize: 10,
            lineHeight: 1.15,
            cursor: 'pointer',
          }}
        >
          Fit all
        </button>
      </MQTooltip>
      <MQTooltip title={mapOpen ? 'Hide the minimap' : 'Show the minimap'} placement='left'>
        <IconButton
          size='small'
          aria-label='Minimap'
          aria-pressed={mapOpen}
          onClick={onToggleMap}
          sx={{ ...button, color: mapOpen ? t.accent : t.muted }}
        >
          <MapOutlined />
        </IconButton>
      </MQTooltip>
    </div>
  )
}
