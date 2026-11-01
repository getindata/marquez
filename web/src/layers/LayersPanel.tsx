// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { HEAT_GRADIENT } from './colorScale'
import { LayerDefinition, LayerSlot } from './catalog'
import { OrchestratorBadge } from './VendorMarks'
import { formatLayerAmount } from './nodeMarks'
import { mix } from './colorScale'
import { useAxisTokens } from '../theme'
import Box from '@mui/material/Box'
import React, { useEffect } from 'react'

const SLOT_TEXT: Record<LayerSlot, string> = {
  fill: 'colour',
  dot: 'dot',
  meter: 'heat meter',
  badge: 'badge',
  marker: 'marker',
  tag: 'chip',
  label: 'label',
  status: 'status dot',
}

const compact = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 || n >= 10000 ? 0 : 1)}k` : `${n}`

const appliesText = (layer: LayerDefinition) =>
  layer.appliesTo.length > 1 ? 'tables and jobs' : layer.appliesTo[0] === 'job' ? 'jobs' : 'tables'

const Legend = ({ layer }: { layer: LayerDefinition }) => {
  const t = useAxisTokens()
  const small = { fontSize: 10.5, color: t.muted }
  switch (layer.kind) {
    case 'category':
      if (layer.slot === 'tag') {
        // outlined chips, as on the cards
        return (
          <Box display='flex' flexWrap='wrap' gap='5px 6px' mt='7px' sx={small}>
            {layer.legend.map((e) => (
              <span
                key={String(e.value)}
                data-testid='legend-tag'
                style={{
                  padding: '0 6px',
                  borderRadius: 10,
                  whiteSpace: 'nowrap',
                  border: `1px solid ${e.color ?? t.muted}`,
                  color: t.text,
                  background: mix(e.color ?? t.muted, t.panelEntry, 0.18),
                }}
              >
                {e.label}
              </span>
            ))}
          </Box>
        )
      }
      return (
        <Box display='flex' flexWrap='wrap' gap='5px 10px' mt='7px' sx={small}>
          {layer.legend.map((e) => (
            <Box key={String(e.value)} display='inline-flex' alignItems='center' gap='4px'>
              <Box
                component='i'
                data-testid={layer.slot === 'status' ? 'legend-status' : undefined}
                style={{ background: e.color }}
                sx={
                  layer.slot === 'status'
                    ? { width: 8, height: 8, borderRadius: '50%' }
                    : { width: 10, height: 10, borderRadius: '2px' }
                }
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
      // a label shows an amount (bytes, rows): its range reads the same
      const ends =
        layer.slot === 'label'
          ? [formatLayerAmount(min, layer.unit), `${formatLayerAmount(max, layer.unit)}+`]
          : [
              `${compact(min)}${layer.unit ? ` ${layer.unit}` : ''}`,
              `${compact(max)}${max > 1 ? '+' : ''}`,
            ]
      return (
        <>
          <Box sx={{ height: 8, borderRadius: '4px', mt: '7px', background: HEAT_GRADIENT }} />
          <Box
            display='flex'
            justifyContent='space-between'
            mt='3px'
            sx={{ ...small, fontSize: 10 }}
          >
            <span>{ends[0]}</span>
            <span>{middle}</span>
            <span>{ends[1]}</span>
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
        <Box mt='7px' display='flex' alignItems='center' gap='7px' sx={small}>
          <Box
            component='i'
            data-testid='legend-marker'
            sx={{
              flex: 'none',
              width: 7,
              height: 7,
              transform: 'rotate(45deg)',
              background: t.accent,
            }}
          />
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

/**
 * The floating Layers card over the graph's right edge. While it is open, Escape is its own,
 * wherever focus is (its toolbar button keeps focus on open): it closes the panel and marks the
 * key handled, so the drawer under it stays open.
 */
export const LayersPanel = ({ layers, active, onToggle, onClose }: LayersPanelProps) => {
  const t = useAxisTokens()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return
      e.preventDefault()
      onClose()
    }
    // the capture phase on window runs before any document listener, the drawer's included
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
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
        background: t.panel,
        border: `1px solid ${t.line}`,
        borderRadius: '10px',
        boxShadow: t.panelShadow,
        color: t.text,
        fontFamily: t.font,
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
          color: t.muted,
        }}
      >
        Layers
      </Box>
      {layers.map((layer) => (
        <Box
          key={layer.id}
          data-testid='layer-entry'
          sx={{
            border: `1px solid ${t.line}`,
            borderRadius: '8px',
            p: '9px 10px',
            mb: '9px',
            background: t.panelEntry,
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
              style={{ accentColor: t.accent, width: 15, height: 15, margin: 0 }}
            />
            {layer.title}
            <Box
              component='small'
              sx={{ ml: 'auto', fontWeight: 400, color: t.muted, fontSize: 10 }}
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
