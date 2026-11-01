// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { NODE_OVERHANG } from './sizes'
import { NodeMarks, mix } from '../../layers'
import { useAxisTokens } from '../../theme'
import MQTooltip from '../../components/core/tooltip/MQTooltip'
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

/**
 * A long name cut from the front so its end, the part that tells nodes apart, stays visible:
 * `freepdb1.bl_3nf.table.ce_customers` in 19 characters is `…table.ce_customers`. It cuts at a
 * dot when the rest still fits, else mid-word. Names that fit are unchanged.
 */
export const tailFit = (name: string, maxChars: number): string => {
  if (name.length <= maxChars) return name
  const room = Math.max(1, maxChars - 1) // one character for the ellipsis
  const start = name.length - room
  // the first part boundary (just after a dot) inside the room, else a hard cut
  for (let k = start; k < name.length; k++) {
    if (name[k - 1] === '.') return '…' + name.slice(k)
  }
  return '…' + name.slice(start)
}

/** How many monospace characters fit in `width` px at `fontSize` px (about 0.6 em each). */
export const monoChars = (width: number, fontSize: number) =>
  Math.max(4, Math.floor(width / (fontSize * 0.6)))

export const ellipsis: CSSProperties = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

/** The wave chip: never wraps, right-aligned, in the wave colour. */
export const FillChip = ({ fill }: { fill: NonNullable<NodeMarks['fill']> }) => {
  const t = useAxisTokens()
  return (
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
        color: t.chipText,
        background: mix(fill.color, t.chipBase, t.chipWeight),
      }}
    >
      {fill.chip}
    </span>
  )
}

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
}) => {
  const t = useAxisTokens()
  return (
    <div
      data-testid='meter-row'
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 9.5,
        color: t.muted,
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
          background: t.track,
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
}

/**
 * A node's lineage URL. It keeps the current query (layers, theme, depth…) so the next graph
 * looks the same, points `tableLevelNode` at the node and drops `drawerTab`, so the node opens
 * on its default tab.
 */
export const nodeUrl = (
  kind: 'job' | 'dataset',
  namespace: string,
  name: string,
  nodeId: string,
  searchParams: URLSearchParams
) => {
  const params = new URLSearchParams(searchParams)
  params.set('tableLevelNode', nodeId)
  // the next node opens on its own default tab
  params.delete('drawerTab')
  return `/lineage/${kind}/${encodeURIComponent(namespace)}/${encodeURIComponent(
    name
  )}?${params.toString()}`
}

/** One line of a node tooltip. */
export const TooltipLine = ({ label, children }: { label: string; children: ReactNode }) => {
  const t = useAxisTokens()
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24, fontSize: 13 }}>
      <b>{label}</b>
      <span style={{ fontFamily: t.mono, textAlign: 'right' }}>{children}</span>
    </div>
  )
}

/**
 * The zone chip (`tag` slot): outlined in the zone colour, so it never reads as the wave. With
 * `maxWidth` (on the 190px card) a longer zone ends in an ellipsis; the tooltip has it whole.
 */
export const TagChip = ({
  tag,
  maxWidth,
}: {
  tag: NonNullable<NodeMarks['tag']>
  maxWidth?: number
}) => {
  const t = useAxisTokens()
  return (
    <span
      data-testid='tag-chip'
      style={{
        ...(maxWidth
          ? {
              flex: '0 1 auto',
              minWidth: 0,
              maxWidth,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }
          : { flex: 'none' }),
        fontSize: 10,
        lineHeight: '12px',
        padding: '0 5px',
        borderRadius: 10,
        whiteSpace: 'nowrap',
        border: `1px solid ${tag.color}`,
        color: t.text,
        background: mix(tag.color, t.card, 0.18),
      }}
    >
      {tag.text}
    </span>
  )
}

/**
 * The status dot (`status` slot): 8px in the status colour. It has its own tooltip unless it
 * sits inside a card that has one (a job's), which then lists the status.
 */
export const StatusDot = ({
  status,
  ownTooltip = true,
}: {
  status: NonNullable<NodeMarks['status']>
  ownTooltip?: boolean
}) => {
  const dot = (
    <span
      data-testid='status-dot'
      aria-label={status.tooltip}
      style={{
        flex: 'none',
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: status.color,
      }}
    />
  )
  return ownTooltip ? (
    <MQTooltip title={status.tooltip} placement='top'>
      {dot}
    </MQTooltip>
  ) : (
    dot
  )
}

/** The PII marker on a column row: a small shield, the kind in its label and the row tooltip. */
export const PiiShield = ({ label, size = 11 }: { label: string; size?: number }) => {
  const t = useAxisTokens()
  return (
    <svg
      data-testid='pii-marker'
      role='img'
      aria-label={label}
      width={size}
      height={size}
      viewBox='0 0 16 16'
      style={{ flex: 'none', display: 'block' }}
    >
      <path
        d='M8 1.2 2.5 3.3v4.2c0 3.4 2.3 6.2 5.5 7.3 3.2-1.1 5.5-3.9 5.5-7.3V3.3z'
        fill={mix(t.pii, t.card, 0.3)}
        stroke={t.pii}
        strokeWidth='1.4'
        strokeLinejoin='round'
      />
      <path
        d='M5.6 8.1 7.3 9.8l3.2-3.4'
        fill='none'
        stroke={t.card}
        strokeWidth='1.5'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </svg>
  )
}

/** A description in a tooltip: wrapped prose, not a right-aligned value. */
export const TooltipDescription = ({ children }: { children: ReactNode }) => (
  <div
    data-testid='tooltip-description'
    style={{ maxWidth: 380, margin: '6px 0', fontSize: 13, lineHeight: 1.45, whiteSpace: 'normal' }}
  >
    {children}
  </div>
)
