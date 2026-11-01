// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import {
  AxisMigration,
  DrawerColumn,
  MigrationGap,
  MigrationRule,
  StatusPart,
  drawerColumns,
  drawerStatus,
  platformLabel,
  readAxisDdl,
  readAxisMigration,
  referenceLabel,
  sourceColumns,
  splitEffect,
} from './axisFacets'
import { AxisTokens, useAxisTokens } from '../../../theme'
import { CloseButton, DrawerTabs } from './DrawerParts'
import { CopyButton } from './CopyButton'
import { DdlCode, SideBySide } from './DdlCode'
import { FillChip, MeterRow, tailFit } from '../cardParts'
import { LayerCatalog, NodeMarks } from '../../../layers'
import { LineageDataset, LineageJob, LineageNode } from '../../../types/lineage'
import { LineageGraph } from '../../../types/api'
import { LineageTab } from './LineageTab'
import { allMarks } from './marks'
import { datasetTypeOf } from '../TableLineageDatasetNode'
import { isOwnDatasetJob } from '../collapse'
import MqJsonView from '../../../components/core/json-view/MqJsonView'
import React, { CSSProperties, ReactNode, useState } from 'react'

/**
 * The table drawer of design §7.4: the table's facts, its DDL highlighted (source, target, side
 * by side) with the migration rules for the target, the column type mapping, the table's
 * upstream and downstream jobs (Lineage) and the raw facets. A missing `axisDdl` or
 * `axisMigration` hides its sections.
 */

export const DRAWER_WIDTH = 640
/** Side by side needs room for two editors. */
export const DRAWER_WIDE = 1080

type Tab = 'ddl' | 'columns' | 'lineage' | 'facets'
type DdlView = 'source' | 'target' | 'side'

const TAB_LABELS: Record<Tab, string> = {
  ddl: 'DDL',
  columns: 'Columns',
  lineage: 'Lineage',
  facets: 'Facets (raw)',
}

const STATE_LABELS: Record<MigrationRule['state'], string> = {
  will_apply: 'will apply',
  applied: 'applied',
  unknown: 'unknown',
}

/** The real jobs that write a dataset: its in-edges, without the table's own (DDL) job. */
export const writersOf = (node: LineageNode, lineage: LineageGraph): string[] => {
  const byId = new Map(lineage.graph.map((n) => [n.id, n]))
  return node.inEdges
    .map((e) => byId.get(e.origin))
    .filter((n): n is LineageNode => !!n && n.type === 'JOB' && !isOwnDatasetJob(n, byId))
    .map((n) => (n.data as LineageJob).name)
}

const Chip = ({ bg, color, children }: { bg: string; color: string; children: ReactNode }) => (
  <span style={{ padding: '1px 7px', borderRadius: 10, background: bg, color }}>{children}</span>
)

const kindChip = (t: AxisTokens, kind: string) => {
  const k = kind.toLowerCase()
  if (k === 'deterministic') return [t.deterministicBg, t.deterministicText]
  if (k === 'agent') return [t.agentBg, t.agentText]
  return [t.tagBg, t.tagText]
}

const code = (t: AxisTokens): CSSProperties => ({
  fontFamily: t.mono,
  fontSize: 11.5,
  color: t.code,
})

const cardStyle = (t: AxisTokens, dashed = false): CSSProperties => ({
  border: `1px ${dashed ? 'dashed' : 'solid'} ${t.line}`,
  borderRadius: 9,
  padding: '10px 12px',
  marginBottom: 8,
  background: t.meterRow,
})

const cardHead: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 7,
  flexWrap: 'wrap',
  fontSize: 11,
}

export const RuleCard = ({ rule }: { rule: MigrationRule }) => {
  const t = useAxisTokens()
  const [kindBg, kindText] = kindChip(t, rule.kind)
  const effect = splitEffect(rule.effect)
  return (
    <div data-testid='rule-card' data-rule={rule.id} style={cardStyle(t)}>
      <div style={cardHead}>
        <code style={{ fontFamily: t.mono, fontSize: 12, color: t.text, fontWeight: 600 }}>
          {rule.id}
        </code>
        {rule.category && (
          <Chip bg={t.tagBg} color={t.tagText}>
            {rule.category}
          </Chip>
        )}
        {rule.kind && (
          <Chip bg={kindBg} color={kindText}>
            {rule.kind}
          </Chip>
        )}
        {rule.status && (
          <Chip
            bg={rule.status === 'verified' ? t.verifiedBg : t.tagBg}
            color={rule.status === 'verified' ? t.verifiedText : t.tagText}
          >
            {rule.status}
          </Chip>
        )}
        <span
          data-testid='rule-state'
          title={rule.state === 'unknown' ? 'The facet gives no known state' : undefined}
          style={{
            marginLeft: 'auto',
            fontWeight: rule.state === 'unknown' ? 400 : 600,
            color: rule.state === 'applied' ? t.done : t.muted,
          }}
        >
          {STATE_LABELS[rule.state]}
        </span>
      </div>
      {rule.title && <div style={{ marginTop: 6, fontSize: 13, color: t.text }}>{rule.title}</div>}
      {rule.effect && (
        <div style={{ marginTop: 4, fontSize: 12, color: t.muted }}>
          On this table:{' '}
          {effect ? (
            <>
              <code style={code(t)}>{effect[0]}</code> becomes{' '}
              <code style={code(t)}>{effect[1]}</code>
            </>
          ) : (
            <code style={code(t)}>{rule.effect}</code>
          )}
        </div>
      )}
      {rule.references.length > 0 && (
        <div style={{ marginTop: 6, fontSize: 11.5 }}>
          {rule.references.map((url) => (
            <a
              key={url}
              href={url}
              target='_blank'
              rel='noopener noreferrer'
              style={{ color: t.link, marginRight: 10, textDecoration: 'none' }}
            >
              {referenceLabel(url)} ↗
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

export const GapCard = ({ gap }: { gap: MigrationGap }) => {
  const t = useAxisTokens()
  return (
    <div data-testid='gap-card' style={cardStyle(t, true)}>
      <div style={cardHead}>
        <code style={{ fontFamily: t.mono, fontSize: 12, color: t.text, fontWeight: 600 }}>
          {gap.name}
        </code>
        {gap.category && (
          <Chip bg={t.tagBg} color={t.tagText}>
            {gap.category}
          </Chip>
        )}
        <Chip bg={t.gapBg} color={t.gapText}>
          gap
        </Chip>
      </div>
      {gap.note && <div style={{ marginTop: 6, fontSize: 13, color: t.text }}>{gap.note}</div>}
    </div>
  )
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

const RulesSection = ({ migration }: { migration: AxisMigration }) => {
  const t = useAxisTokens()
  const { rules, gaps } = migration
  if (!rules.length && !gaps.length) return null
  const known = rules.filter((r) => r.state !== 'unknown')
  const unknown = rules.length - known.length
  const count = [
    known.length
      ? `${known.length} ${known.every((r) => r.state === 'applied') ? 'applied' : 'apply'}`
      : '',
    unknown ? `${unknown} unknown` : '',
    gaps.length ? plural(gaps.length, 'gap', 'gaps') : '',
  ]
    .filter(Boolean)
    .join(' · ')
  return (
    <section data-testid='rules' style={{ marginBottom: 18 }}>
      <div style={sectionHead}>
        <b>Migration rules for {platformLabel(migration.target) || 'the target'}</b>
        <span style={{ marginLeft: 'auto', color: t.muted, fontSize: 12 }}>{count}</span>
      </div>
      {rules.map((r) => (
        <RuleCard key={r.id} rule={r} />
      ))}
      {gaps.map((g) => (
        <GapCard key={g.name} gap={g} />
      ))}
    </section>
  )
}

const sectionHead: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  marginBottom: 8,
  fontSize: 13,
}

const Segmented = <V extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: V; label: string }[]
  value: V
  onChange: (v: V) => void
}) => {
  const t = useAxisTokens()
  return (
    <span
      role='tablist'
      style={{
        display: 'inline-flex',
        border: `1px solid ${t.line}`,
        borderRadius: 6,
        overflow: 'hidden',
        fontSize: 11.5,
      }}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type='button'
          role='tab'
          aria-selected={o.value === value}
          onClick={() => onChange(o.value)}
          style={{
            border: 0,
            padding: '3px 9px',
            cursor: 'pointer',
            fontFamily: t.font,
            fontSize: 11.5,
            background: o.value === value ? t.accentFill : 'none',
            color: o.value === value ? t.accentFillText : t.muted,
          }}
        >
          {o.label}
        </button>
      ))}
    </span>
  )
}

const DdlTab = ({
  source,
  migration,
  view,
  onView,
}: {
  source: ReturnType<typeof readAxisDdl>
  migration: AxisMigration | null
  view: DdlView
  onView: (v: DdlView) => void
}) => {
  const t = useAxisTokens()
  const target = migration?.targetDdl ? migration.targetDdl : ''
  const sourceLabel = `${platformLabel(source?.dialect ?? '') || 'Source'} source`
  const targetLabel = `${platformLabel(migration?.target ?? '') || 'Target'} target`
  const shown: DdlView = !target ? 'source' : !source ? 'target' : view
  const options: { value: DdlView; label: string }[] = []
  if (source) options.push({ value: 'source', label: sourceLabel })
  if (target) options.push({ value: 'target', label: targetLabel })
  if (source && target) options.push({ value: 'side', label: 'Side by side' })
  const targetDialect = migration?.target ?? ''

  return (
    <>
      {(source || target) && (
        <section data-testid='ddl' style={{ marginBottom: 18 }}>
          <div style={sectionHead}>
            <b>DDL</b>
            {options.length > 1 ? (
              <Segmented options={options} value={shown} onChange={onView} />
            ) : (
              <span style={{ color: t.muted, fontSize: 12 }}>{options[0].label}</span>
            )}
            {shown !== 'side' && (
              <CopyButton key={shown} text={shown === 'target' ? target : source?.text ?? ''} />
            )}
          </div>
          {shown === 'source' && source && <DdlCode text={source.text} dialect={source.dialect} />}
          {shown === 'target' && <DdlCode text={target} dialect={targetDialect} />}
          {shown === 'side' && source && (
            <SideBySide
              source={{ label: sourceLabel, text: source.text, dialect: source.dialect }}
              target={{ label: targetLabel, text: target, dialect: targetDialect }}
            />
          )}
        </section>
      )}
      {migration && <RulesSection migration={migration} />}
    </>
  )
}

export const ColumnsTab = ({
  columns,
  migration,
}: {
  columns: DrawerColumn[]
  migration: AxisMigration | null
}) => {
  const t = useAxisTokens()
  const mapped = columns.some((c) => c.target !== undefined)
  const target = platformLabel(migration?.target ?? '') || 'Target'
  const cell: CSSProperties = {
    padding: '6px 8px',
    borderBottom: `1px solid ${t.rowLine}`,
    textAlign: 'left',
    verticalAlign: 'top',
  }
  const head: CSSProperties = { ...cell, color: t.muted, fontWeight: 600, fontSize: 12 }
  const mono: CSSProperties = { fontFamily: t.mono, fontSize: 12 }
  if (!columns.length) return <div style={{ color: t.muted }}>No columns recorded.</div>
  return (
    <table
      data-testid='columns'
      style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, color: t.text }}
    >
      <thead>
        <tr>
          <th style={head}>Column</th>
          <th style={head}>Source type</th>
          {mapped && <th style={head}>{target} type</th>}
          {mapped && <th style={head}>Mapping</th>}
        </tr>
      </thead>
      <tbody>
        {columns.map((c) => (
          <tr key={c.name} data-testid='column-row'>
            <td style={{ ...cell, ...mono }}>{c.name}</td>
            <td style={{ ...cell, ...mono, color: t.muted }}>{c.source || '—'}</td>
            {mapped && <td style={{ ...cell, ...mono }}>{c.target || '—'}</td>}
            {mapped && (
              <td style={cell}>
                {c.target === undefined ? null : c.exact ? (
                  <Chip bg={t.verifiedBg} color={t.verifiedText}>
                    exact
                  </Chip>
                ) : (
                  <Chip bg={t.agentBg} color={t.agentText}>
                    needs review
                  </Chip>
                )}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

const Header = ({
  dataset,
  marks,
  writers,
  status,
  onClose,
}: {
  dataset: LineageDataset
  marks: NodeMarks
  writers: string[]
  status: StatusPart[]
  onClose: () => void
}) => {
  const t = useAxisTokens()
  const sub = [dataset.namespace, datasetTypeOf(dataset), marks.dot?.label]
    .filter(Boolean)
    .join(' · ')
  const shownWriters = writers.slice(0, 3)
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 18px 10px' }}>
        {marks.dot && (
          <span
            data-testid='heat-dot'
            title={marks.dot.tooltip}
            style={{
              flex: 'none',
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: marks.dot.color,
            }}
          />
        )}
        <div style={{ minWidth: 0 }}>
          <div
            title={dataset.name}
            style={{
              fontFamily: t.mono,
              fontWeight: 600,
              fontSize: 17,
              color: t.text,
              wordBreak: 'break-all',
            }}
          >
            {dataset.name}
          </div>
          <div style={{ color: t.muted, fontSize: 12 }}>{sub}</div>
        </div>
        {marks.fill ? <FillChip fill={marks.fill} /> : <span style={{ marginLeft: 'auto' }} />}
        <CloseButton onClose={onClose} />
      </div>
      {(marks.meter || writers.length > 0 || status.length > 0) && (
        <div
          data-testid='drawer-meta'
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '6px 18px',
            padding: '0 18px 12px',
            fontSize: 12,
            color: t.muted,
          }}
        >
          {marks.meter && <MeterRow meter={marks.meter} style={{ fontSize: 12 }} />}
          {writers.length > 0 && (
            <span>
              written by{' '}
              {shownWriters.map((w, i) => (
                <React.Fragment key={w}>
                  {i > 0 && ', '}
                  <code title={w} style={{ ...code(t), whiteSpace: 'nowrap' }}>
                    {tailFit(w, 40)}
                  </code>
                </React.Fragment>
              ))}
              {writers.length > shownWriters.length &&
                ` + ${writers.length - shownWriters.length} more`}
            </span>
          )}
          {status.length > 0 && (
            <span>
              status{' '}
              <b data-testid='drawer-status' style={{ fontWeight: 600 }}>
                {status.map((part, i) => (
                  <React.Fragment key={part.text}>
                    {i > 0 && <span style={{ color: t.muted }}> · </span>}
                    <span
                      style={{
                        color:
                          part.tone === 'done'
                            ? t.done
                            : part.tone === 'failed'
                            ? t.gapText
                            : t.text,
                      }}
                    >
                      {part.text}
                    </span>
                  </React.Fragment>
                ))}
              </b>
            </span>
          )}
        </div>
      )}
    </>
  )
}

export interface TableDrawerProps {
  node: LineageNode
  lineage: LineageGraph
  catalog: LayerCatalog | null
  onClose: () => void
}

export const TableDrawer = ({ node, lineage, catalog, onClose }: TableDrawerProps) => {
  const t = useAxisTokens()
  const dataset = node.data as LineageDataset
  const facets = dataset.facets
  const ddl = readAxisDdl(facets)
  const migration = readAxisMigration(facets)
  const columns = drawerColumns(sourceColumns(facets, dataset.fields), migration)
  const hasDdlTab = !!ddl || !!migration
  const tabs: Tab[] = [...(hasDdlTab ? ['ddl' as Tab] : []), 'columns', 'lineage', 'facets']
  const [tab, setTab] = useState<Tab>(tabs[0])
  const [view, setView] = useState<DdlView>('source')
  const marks = allMarks(catalog, 'dataset', facets)
  const status = drawerStatus(facets, migration)
  const wide = tab === 'ddl' && view === 'side' && !!ddl && !!migration?.targetDdl

  return (
    <div
      data-testid='table-drawer'
      style={{
        width: wide ? DRAWER_WIDE : DRAWER_WIDTH,
        maxWidth: '92vw',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: t.drawer,
        color: t.text,
        fontFamily: t.font,
        fontSize: 13,
      }}
    >
      <div style={{ borderBottom: `1px solid ${t.line}` }}>
        <Header
          dataset={dataset}
          marks={marks}
          writers={writersOf(node, lineage)}
          status={status}
          onClose={onClose}
        />
      </div>
      <DrawerTabs tabs={tabs} labels={TAB_LABELS} value={tab} onChange={setTab} />
      <div role='tabpanel' style={{ overflow: 'auto', padding: '14px 18px 24px', flex: 1 }}>
        {tab === 'ddl' && (
          <DdlTab source={ddl} migration={migration} view={view} onView={setView} />
        )}
        {tab === 'columns' && <ColumnsTab columns={columns} migration={migration} />}
        {tab === 'lineage' && <LineageTab node={node} lineage={lineage} catalog={catalog} />}
        {tab === 'facets' && <MqJsonView data={(facets as object) ?? {}} />}
      </div>
    </div>
  )
}
