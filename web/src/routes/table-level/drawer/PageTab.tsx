// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import {
  PowerBiPage,
  PowerBiVisual,
  VisualGlyph,
  fieldParts,
  visualGlyphOf,
  visualTypeLabel,
} from '../powerbi'
import { useAxisTokens } from '../../../theme'
import React, { CSSProperties, ReactNode, useState } from 'react'

/**
 * A Power BI page drawn as its report: each visual a box at its position, scaled to the
 * drawer's width with the page's aspect ratio, in `z` order, with its type glyph, title and
 * fields as chips. Visuals with no position are listed under the page, then the page's fields.
 * Hovering a chip or a field highlights that field everywhere on the tab. The wireframe shows
 * structure, not data.
 */

const GLYPH_PATHS: Record<VisualGlyph, ReactNode> = {
  card: (
    <>
      <rect x='1.5' y='3.5' width='13' height='9' rx='1.5' fill='none' />
      <path d='M5 8h6' strokeWidth='2' strokeLinecap='round' />
    </>
  ),
  table: (
    <>
      <rect x='1.5' y='2.5' width='13' height='11' rx='1' fill='none' />
      <path d='M1.5 6h13M1.5 9.5h13M6 2.5v11' />
    </>
  ),
  line: <path d='M1.5 12.5 6 7.5l3 3 5.5-6' fill='none' strokeLinejoin='round' />,
  column: <path d='M3.5 13.5v-4M8 13.5v-9M12.5 13.5V7' strokeWidth='2.4' />,
  pie: (
    <>
      <circle cx='8' cy='8' r='6' fill='none' />
      <path d='M8 2v6h6' fill='none' />
    </>
  ),
  slicer: <path d='M2 3h12l-4.5 5.5v5l-3-1.5v-3.5z' fill='none' strokeLinejoin='round' />,
  generic: (
    <rect x='2.5' y='2.5' width='11' height='11' rx='2' fill='none' strokeDasharray='2 1.6' />
  ),
}

export const VisualGlyphIcon = ({ glyph, color }: { glyph: VisualGlyph; color: string }) => (
  <svg
    width={12}
    height={12}
    viewBox='0 0 16 16'
    stroke={color}
    strokeWidth={1.4}
    data-visual-glyph={glyph}
    aria-hidden='true'
    style={{ flex: 'none' }}
  >
    {GLYPH_PATHS[glyph]}
  </svg>
)

const FieldChip = ({
  field,
  hovered,
  onHover,
}: {
  field: string
  hovered: string | null
  onHover: (field: string | null) => void
}) => {
  const t = useAxisTokens()
  const on = hovered === field
  return (
    <span
      data-testid='field-chip'
      data-field={field}
      data-highlighted={on ? 'true' : undefined}
      title={field}
      onMouseEnter={() => onHover(field)}
      onMouseLeave={() => onHover(null)}
      style={{
        maxWidth: '100%',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        padding: '0 5px',
        borderRadius: 7,
        fontSize: 10,
        lineHeight: '14px',
        fontFamily: t.mono,
        background: on ? t.accentFill : t.tagBg,
        color: on ? t.accentFillText : t.tagText,
        cursor: 'default',
      }}
    >
      {fieldParts(field).name}
    </span>
  )
}

const visualName = (v: PowerBiVisual) => v.title || visualTypeLabel(v.type)

const VisualHead = ({ visual }: { visual: PowerBiVisual }) => {
  const t = useAxisTokens()
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
      <VisualGlyphIcon glyph={visualGlyphOf(visual.type)} color={t.muted} />
      <span
        data-testid='visual-title'
        style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontWeight: 600,
          color: t.text,
        }}
      >
        {visualName(visual)}
      </span>
    </div>
  )
}

const chips: CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 4 }

const sectionHead: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  marginBottom: 8,
  fontSize: 13,
}

const pct = (part: number, whole: number) => `${(part / whole) * 100}%`

export const PageTab = ({ page, fields }: { page: PowerBiPage; fields: string[] }) => {
  const t = useAxisTokens()
  const [hovered, setHovered] = useState<string | null>(null)
  const { width, height } = page
  const placed =
    width && height
      ? page.visuals
          .filter((v) => v.position)
          .sort((a, b) => (a.position?.z ?? 0) - (b.position?.z ?? 0))
      : []
  const unplaced = page.visuals.filter((v) => !placed.includes(v))
  const used = new Set(page.visuals.flatMap((v) => v.fields))
  const listed = [...fields, ...Array.from(used).filter((f) => !fields.includes(f))]
  const byTable = new Map<string, string[]>()
  listed.forEach((f) => {
    const { table } = fieldParts(f)
    byTable.set(table, [...(byTable.get(table) ?? []), f])
  })
  const visualCount = `${page.visuals.length} ${page.visuals.length === 1 ? 'visual' : 'visuals'}`

  return (
    <div data-testid='page-tab'>
      <section style={{ marginBottom: 18 }}>
        <div style={sectionHead}>
          <b>Page</b>
          <span style={{ color: t.muted, fontSize: 12 }}>
            {[width && height ? `${width} × ${height}` : '', visualCount]
              .filter(Boolean)
              .join(' · ')}
          </span>
        </div>
        {width && height && placed.length > 0 ? (
          <div
            data-testid='page-wireframe'
            style={{
              position: 'relative',
              width: '100%',
              paddingTop: pct(height, width),
              background: t.meterRow,
              border: `1px solid ${t.line}`,
              borderRadius: 6,
              boxSizing: 'border-box',
            }}
          >
            {placed.map((v, i) => {
              const p = v.position as NonNullable<PowerBiVisual['position']>
              return (
                <div
                  key={i}
                  data-testid='page-visual'
                  data-visual-type={v.type}
                  title={`${visualName(v)} · ${visualTypeLabel(v.type)}`}
                  style={{
                    position: 'absolute',
                    left: pct(p.x, width),
                    top: pct(p.y, height),
                    width: pct(p.width, width),
                    height: pct(p.height, height),
                    zIndex: i + 1,
                    boxSizing: 'border-box',
                    padding: '4px 6px',
                    overflow: 'hidden',
                    background: t.card,
                    border: `1px solid ${t.line}`,
                    borderRadius: 4,
                    boxShadow: t.cardShadow,
                    fontSize: 11,
                    lineHeight: 1.3,
                  }}
                >
                  <VisualHead visual={v} />
                  <div style={chips}>
                    {v.fields.map((f) => (
                      <FieldChip key={f} field={f} hovered={hovered} onHover={setHovered} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div style={{ color: t.muted, fontSize: 12.5 }}>
            The report layout gives no positions for this page’s visuals.
          </div>
        )}
      </section>
      {unplaced.length > 0 && (
        <section data-testid='unplaced-visuals' style={{ marginBottom: 18 }}>
          <div style={sectionHead}>
            <b>{placed.length ? 'Not placed on the page' : 'Visuals'}</b>
            <span style={{ color: t.muted, fontSize: 12 }}>{unplaced.length}</span>
          </div>
          {unplaced.map((v, i) => (
            <div
              key={i}
              data-testid='unplaced-visual'
              data-visual-type={v.type}
              style={{
                padding: '8px 10px',
                marginBottom: 6,
                border: `1px dashed ${t.line}`,
                borderRadius: 8,
                background: t.meterRow,
                fontSize: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <VisualHead visual={v} />
                <span style={{ color: t.muted, fontSize: 11 }}>{visualTypeLabel(v.type)}</span>
              </div>
              <div style={chips}>
                {v.fields.map((f) => (
                  <FieldChip key={f} field={f} hovered={hovered} onHover={setHovered} />
                ))}
              </div>
            </div>
          ))}
        </section>
      )}
      {listed.length > 0 && (
        <section data-testid='page-fields'>
          <div style={sectionHead}>
            <b>Fields</b>
            <span style={{ color: t.muted, fontSize: 12 }}>{listed.length}</span>
          </div>
          {Array.from(byTable.entries()).map(([table, names]) => (
            <div key={table} style={{ display: 'flex', gap: 10, marginBottom: 6, fontSize: 12 }}>
              <span style={{ flex: '0 0 120px', color: t.muted, fontFamily: t.mono }}>
                {table || '—'}
              </span>
              <span style={{ display: 'flex', flexWrap: 'wrap', gap: 4, minWidth: 0 }}>
                {names.map((f) => (
                  <span
                    key={f}
                    data-testid='page-field'
                    data-field={f}
                    data-highlighted={hovered === f ? 'true' : undefined}
                    onMouseEnter={() => setHovered(f)}
                    onMouseLeave={() => setHovered(null)}
                    style={{
                      padding: '1px 7px',
                      borderRadius: 6,
                      fontFamily: t.mono,
                      fontSize: 11.5,
                      border: `1px solid ${hovered === f ? t.accent : t.line}`,
                      background: hovered === f ? t.accentFill : 'none',
                      color: hovered === f ? t.accentFillText : t.text,
                    }}
                  >
                    {fieldParts(f).name}
                  </span>
                ))}
              </span>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
