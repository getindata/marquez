// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { AXIS, LAYERS_PARAM, NodeMarks, mix } from '../../layers'
import { NODE_OVERHANG } from './sizes'
import React, { CSSProperties, ReactNode } from 'react'

/**
 * Draws a node's HTML card inside the SVG graph. The foreignObject reaches NODE_OVERHANG past
 * the node's box so the selection ring and glow are not clipped; only the card takes clicks.
 */
export const NodeFrame = ({
  width,
  height,
  children,
}: {
  width: number
  height: number
  children: ReactNode
}) => (
  <foreignObject
    x={-NODE_OVERHANG}
    y={-NODE_OVERHANG}
    width={width + 2 * NODE_OVERHANG}
    height={height + 2 * NODE_OVERHANG}
    style={{ pointerEvents: 'none' }}
  >
    <div
      style={{
        padding: NODE_OVERHANG,
        boxSizing: 'border-box',
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    >
      {children}
    </div>
  </foreignObject>
)

export const ellipsis: CSSProperties = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

/** The wave chip: never wraps, right-aligned, in the wave colour. */
export const FillChip = ({ fill }: { fill: NonNullable<NodeMarks['fill']> }) => (
  <span
    data-testid='wave-chip'
    style={{
      flex: 'none',
      marginLeft: 'auto',
      fontSize: 10,
      lineHeight: '14px',
      padding: '1px 6px',
      borderRadius: 10,
      whiteSpace: 'nowrap',
      color: '#fff',
      background: mix(fill.color, AXIS.cardHeader, 0.45),
    }}
  >
    {fill.chip}
  </span>
)

/** The 4px left accent in the wave colour. */
export const FillAccent = ({ color, radius }: { color: string; radius: string }) => (
  <span
    data-testid='wave-accent'
    style={{
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 4,
      borderRadius: radius,
      background: color,
    }}
  />
)

/** The meter row: the label, a 44px bar filled to the value, the value, in the heat-map colour. */
export const MeterRow = ({
  meter,
  style,
}: {
  meter: NonNullable<NodeMarks['meter']>
  style?: CSSProperties
}) => (
  <div
    data-testid='meter-row'
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      fontSize: 9.5,
      color: AXIS.muted,
      boxSizing: 'border-box',
      ...style,
    }}
  >
    {meter.label}
    <b
      style={{
        position: 'relative',
        width: 44,
        height: 4,
        borderRadius: 2,
        background: AXIS.track,
        overflow: 'hidden',
        display: 'inline-block',
      }}
    >
      <span
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: `${Math.round(meter.fraction * 100)}%`,
          borderRadius: 2,
          background: meter.color,
        }}
      />
    </b>
    <em style={{ fontStyle: 'normal', fontWeight: 600, color: meter.color }}>{meter.text}</em>
  </div>
)

/** A node's lineage URL; keeps the viewer's layer choice so the next graph looks the same. */
export const nodeUrl = (
  kind: 'job' | 'dataset',
  namespace: string,
  name: string,
  nodeId: string,
  searchParams: URLSearchParams
) => {
  const params = new URLSearchParams({ tableLevelNode: nodeId })
  const layers = searchParams.get(LAYERS_PARAM)
  if (layers !== null) params.set(LAYERS_PARAM, layers)
  return `/lineage/${kind}/${encodeURIComponent(namespace)}/${encodeURIComponent(
    name
  )}?${params.toString()}`
}

/** One line of a node tooltip. */
export const TooltipLine = ({ label, children }: { label: string; children: ReactNode }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24, fontSize: 13 }}>
    <b>{label}</b>
    <span style={{ fontFamily: AXIS.mono, textAlign: 'right' }}>{children}</span>
  </div>
)
