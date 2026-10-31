// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { AXIS } from './palette'
import { HEAT_GRADIENT } from './colorScale'
import { LayerDefinition, LayerSlot } from './catalog'
import { OrchestratorBadge } from './VendorMarks'
import Box from '@mui/material/Box'
import React, { useEffect } from 'react'

const SLOT_TEXT: Record<LayerSlot, string> = {
  fill: 'colour',
  dot: 'dot',
  meter: 'heat meter',
  badge: 'badge',
  marker: 'marker',
}

const compact = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 || n >= 10000 ? 0 : 1)}k` : `${n}`

const appliesText = (layer: LayerDefinition) =>
  layer.appliesTo.length > 1 ? 'tables and jobs' : layer.appliesTo[0] === 'job' ? 'jobs' : 'tables'

const Legend = ({ layer }: { layer: LayerDefinition }) => {
  const small = { fontSize: 10.5, color: AXIS.muted }
  switch (layer.kind) {
    case 'category':
      return (
        <Box display='flex' flexWrap='wrap' gap='5px 10px' mt='7px' sx={small}>
          {layer.legend.map((e) => (
            <Box key={String(e.value)} display='inline-flex' alignItems='center' gap='4px'>
              <Box
                component='i'
                sx={{ width: 10, height: 10, borderRadius: '2px', background: e.color }}
              />
              <span style={{ whiteSpace: 'nowrap' }}>{e.label}</span>
            </Box>
          ))}
        </Box>
      )
    case 'scale': {
      const min = layer.min ?? 0
      const max = layer.max ?? 1
      const middle = layer.window
        ? `${layer.window}${layer.scale === 'log' ? ', log' : ''}`
        : appliesText(layer)
      return (
        <>
          <Box sx={{ height: 8, borderRadius: '4px', mt: '7px', background: HEAT_GRADIENT }} />
          <Box
            display='flex'
            justifyContent='space-between'
            mt='3px'
            sx={{ ...small, fontSize: 10 }}
          >
            <span>
              {compact(min)}
              {layer.unit ? ` ${layer.unit}` : ''}
            </span>
            <span>{middle}</span>
            <span>
              {compact(max)}
              {max > 1 ? '+' : ''}
            </span>
          </Box>
        </>
      )
    }
    case 'icon':
      return (
        <Box display='flex' flexWrap='wrap' gap='5px 10px' mt='7px' sx={small}>
          {layer.legend.map((e) => (
            <Box key={String(e.value)} display='inline-flex' alignItems='center' gap='4px'>
              <OrchestratorBadge icon={e.icon} size={16} ring='transparent' />
              <span style={{ whiteSpace: 'nowrap' }}>{e.label}</span>
            </Box>
          ))}
        </Box>
      )
    default:
      return (
        <Box mt='7px' sx={small}>
          a mark beside the name of each flagged {appliesText(layer).replace('tables', 'table')}
        </Box>
      )
  }
}

interface LayersPanelProps {
  layers: LayerDefinition[]
  active: Set<string>
  onToggle: (id: string) => void
  onClose: () => void
}

/** The floating Layers card over the graph's right edge; Escape closes it. */
export const LayersPanel = ({ layers, active, onToggle, onClose }: LayersPanelProps) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <Box
      component='aside'
      role='dialog'
      aria-label='Layers'
      data-testid='layers-panel'
      sx={{
        position: 'absolute',
        top: 10,
        right: 56, // leaves the zoom controls at the right edge usable
        maxHeight: 'calc(100% - 20px)',
        width: 290,
        zIndex: 5,
        overflow: 'auto',
        p: '14px',
        background: AXIS.panel,
        border: `1px solid ${AXIS.line}`,
        borderRadius: '10px',
        boxShadow: '0 12px 32px rgba(0,0,0,.5)',
        color: AXIS.text,
        fontFamily: AXIS.font,
        fontSize: 13,
      }}
    >
      <Box
        component='h4'
        sx={{
          m: '0 0 8px',
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '.8px',
          color: AXIS.muted,
        }}
      >
        Layers
      </Box>
      {layers.map((layer) => (
        <Box
          key={layer.id}
          sx={{
            border: `1px solid ${AXIS.line}`,
            borderRadius: '8px',
            p: '9px 10px',
            mb: '9px',
            background: AXIS.panelEntry,
          }}
        >
          <Box
            component='label'
            sx={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}
            style={{ cursor: 'pointer' }}
          >
            <input
              type='checkbox'
              checked={active.has(layer.id)}
              onChange={() => onToggle(layer.id)}
              data-layer={layer.id}
              style={{ accentColor: AXIS.magenta, width: 15, height: 15, margin: 0 }}
            />
            {layer.title}
            <Box
              component='small'
              sx={{ ml: 'auto', fontWeight: 400, color: AXIS.muted, fontSize: 10 }}
            >
              {SLOT_TEXT[layer.slot]}
            </Box>
          </Box>
          <Legend layer={layer} />
        </Box>
      ))}
    </Box>
  )
}
