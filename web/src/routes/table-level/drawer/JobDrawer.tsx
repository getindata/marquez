// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { AxisTokens, useAxisTokens } from '../../../theme'
import { CloseButton, DrawerTabs } from './DrawerParts'
import { DRAWER_WIDE } from './TableDrawer'
import { DatasetLinks } from './LineageTab'
import { FillChip, MeterRow, nodeUrl, tailFit } from '../cardParts'
import { JobCode, jobCodeBlocks } from './JobCode'
import { JobTypeTile, LayerCatalog, OrchestratorBadge, jobTypeOf } from '../../../layers'
import { LineageGraph, Run } from '../../../types/api'
import { LineageJob, LineageNode } from '../../../types/lineage'
import { Link, useSearchParams } from 'react-router-dom'
import { allMarks } from './marks'
import { formatUpdatedAt } from '../../../helpers'
import { getRuns } from '../../../store/requests/jobs'
import { jobDatasets } from './neighbours'
import { stopWatchDuration } from '../../../helpers/time'
import MqJsonView from '../../../components/core/json-view/MqJsonView'
import React, { CSSProperties, ReactNode, useEffect, useState } from 'react'

/**
 * The Axis job drawer, laid out like the table drawer: a header with the job's marks and its
 * latest run, then Code (its SQL and source code, drawn like a DDL), Lineage (what it reads and
 * writes, and its parent job), Runs and Facets (raw). A job with no code opens on Lineage.
 */

type Tab = 'code' | 'lineage' | 'runs' | 'facets'

const TAB_LABELS: Record<Tab, string> = {
  code: 'Code',
  lineage: 'Lineage',
  runs: 'Runs',
  facets: 'Facets (raw)',
}

/** How many runs the Runs tab asks for. */
export const RUNS_LIMIT = 20

const stateColor = (t: AxisTokens, state?: string) =>
  state === 'COMPLETED'
    ? t.done
    : state === 'FAILED' || state === 'ABORTED'
    ? t.gapText
    : state === 'RUNNING'
    ? t.accent
    : t.muted

const RunState = ({ state }: { state?: string }) => {
  const t = useAxisTokens()
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
      <span
        style={{ width: 8, height: 8, borderRadius: '50%', background: stateColor(t, state) }}
      />
      <b style={{ color: t.text, fontWeight: 600 }}>{state ?? 'no run'}</b>
    </span>
  )
}

/**
 * A run's time: its start, else its end ("ended …"). A producer that sends only completion
 * events (the Axis Oracle one) gives no start; `createdAt` is when Marquez stored the run.
 */
const runTime = (r: Run) =>
  r.startedAt
    ? formatUpdatedAt(r.startedAt)
    : r.endedAt
    ? `ended ${formatUpdatedAt(r.endedAt)}`
    : formatUpdatedAt(r.createdAt)

const runInstant = (r: Run) => Date.parse(r.startedAt || r.endedAt || r.createdAt) || 0

/** `durationMs`, else end minus start; a run with no start has no duration. */
const duration = (r: Run) => {
  if (typeof r.durationMs === 'number') return stopWatchDuration(r.durationMs)
  const start = Date.parse(r.startedAt)
  const end = Date.parse(r.endedAt)
  return start && end && end >= start ? stopWatchDuration(end - start) : '–'
}

const Header = ({
  job,
  catalog,
  onClose,
}: {
  job: LineageJob
  catalog: LayerCatalog | null
  onClose: () => void
}) => {
  const t = useAxisTokens()
  const jobType = jobTypeOf(job.facets)
  const marks = allMarks(catalog, 'job', job.facets)
  const latest = job.latestRun
  return (
    <div data-testid='job-drawer-header' style={{ borderBottom: `1px solid ${t.line}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 18px 10px' }}>
        <span style={{ position: 'relative', flex: 'none', width: 34, height: 34 }}>
          <JobTypeTile glyph={jobType.glyph} neutral={{ tile: t.cardHeader, glyph: t.muted }} />
          {marks.badge && (
            <span style={{ position: 'absolute', right: -6, bottom: -6 }}>
              <OrchestratorBadge icon={marks.badge.icon} size={17} ring={t.drawer} />
            </span>
          )}
        </span>
        <div style={{ minWidth: 0 }}>
          <div
            title={job.name}
            style={{
              fontFamily: t.mono,
              fontWeight: 600,
              fontSize: 17,
              color: t.text,
              wordBreak: 'break-all',
            }}
          >
            {job.name}
          </div>
          <div style={{ color: t.muted, fontSize: 12 }}>
            {[job.namespace, marks.badge?.label].filter(Boolean).join(' · ')}
          </div>
        </div>
        {marks.fill ? <FillChip fill={marks.fill} /> : <span style={{ marginLeft: 'auto' }} />}
        <CloseButton onClose={onClose} />
      </div>
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
        <span>{jobType.caption}</span>
        {marks.meter && <MeterRow meter={marks.meter} style={{ fontSize: 12 }} />}
        <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
          latest run <RunState state={latest?.state} />
          {latest && <span>{runTime(latest)}</span>}
        </span>
      </div>
    </div>
  )
}

const section: CSSProperties = { marginBottom: 18 }
const sectionHead: CSSProperties = { marginBottom: 8, fontSize: 13 }

const Box = ({
  testid,
  title,
  children,
}: {
  testid: string
  title: string
  children: ReactNode
}) => {
  const t = useAxisTokens()
  return (
    <section data-testid={testid} style={section}>
      <div style={sectionHead}>
        <b>{title}</b>
      </div>
      <div
        style={{
          padding: '10px 12px',
          border: `1px solid ${t.line}`,
          borderRadius: 9,
          background: t.meterRow,
        }}
      >
        {children}
      </div>
    </section>
  )
}

const JobLineage = ({ node, lineage }: { node: LineageNode; lineage: LineageGraph }) => {
  const t = useAxisTokens()
  const [searchParams] = useSearchParams()
  const job = node.data as LineageJob
  const byId = new Map(lineage.graph.map((n) => [n.id, n]))
  const reads = jobDatasets(node, byId, 'inputs')
  const writes = jobDatasets(node, byId, 'outputs')
  const empty = (text: string) => <span style={{ color: t.muted, fontSize: 12.5 }}>{text}</span>
  return (
    <div data-testid='job-lineage'>
      {job.parentJobName && (
        <Box testid='job-parent-box' title='Part of'>
          <Link
            data-testid='job-parent'
            to={nodeUrl(
              'job',
              job.namespace,
              job.parentJobName,
              `job:${job.namespace}:${job.parentJobName}`,
              searchParams
            )}
            title={`${job.namespace} · ${job.parentJobName}`}
            style={{ color: t.link, fontFamily: t.mono, fontSize: 12, textDecoration: 'none' }}
          >
            {tailFit(job.parentJobName, 70)}
          </Link>
        </Box>
      )}
      <Box testid='job-reads' title={`Reads${reads.length ? ` · ${reads.length}` : ''}`}>
        {reads.length ? <DatasetLinks datasets={reads} /> : empty('Reads no datasets')}
      </Box>
      <Box testid='job-writes' title={`Writes${writes.length ? ` · ${writes.length}` : ''}`}>
        {writes.length ? <DatasetLinks datasets={writes} /> : empty('Writes no datasets')}
      </Box>
    </div>
  )
}

const JobRuns = ({ job }: { job: LineageJob }) => {
  const t = useAxisTokens()
  const [runs, setRuns] = useState<Run[] | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let live = true
    getRuns(job.name, job.namespace, RUNS_LIMIT, 0)
      .then(
        (r: { runs: Run[] }) =>
          live && setRuns([...(r?.runs ?? [])].sort((a, b) => runInstant(b) - runInstant(a)))
      )
      .catch(() => live && setFailed(true))
    return () => {
      live = false
    }
  }, [job.namespace, job.name])
  if (failed) return <div style={{ color: t.muted }}>Runs could not be loaded.</div>
  if (!runs) return <div style={{ color: t.muted }}>Loading runs…</div>
  if (!runs.length) return <div style={{ color: t.muted }}>No runs.</div>
  const cell: CSSProperties = {
    padding: '7px 10px',
    borderBottom: `1px solid ${t.line}`,
    textAlign: 'left',
  }
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
      <thead>
        <tr style={{ color: t.muted }}>
          <th style={{ ...cell, fontWeight: 400 }}>State</th>
          <th style={{ ...cell, fontWeight: 400 }}>Time</th>
          <th style={{ ...cell, fontWeight: 400 }}>Duration</th>
          <th style={{ ...cell, fontWeight: 400 }}>Run</th>
        </tr>
      </thead>
      <tbody>
        {runs.map((r) => (
          <tr key={r.id} data-testid='run-row' data-run={r.id}>
            <td style={cell}>
              <RunState state={r.state} />
            </td>
            <td style={cell}>{runTime(r)}</td>
            <td style={cell}>{duration(r)}</td>
            <td style={{ ...cell, fontFamily: t.mono, color: t.muted }} title={r.id}>
              {r.id.slice(0, 8)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export interface JobDrawerProps {
  node: LineageNode
  lineage: LineageGraph
  catalog: LayerCatalog | null
  onClose: () => void
}

export const JobDrawer = ({ node, lineage, catalog, onClose }: JobDrawerProps) => {
  const t = useAxisTokens()
  const job = node.data as LineageJob
  const hasCode = jobCodeBlocks(job.facets).length > 0
  const tabs: Tab[] = [...(hasCode ? ['code' as Tab] : []), 'lineage', 'runs', 'facets']
  const [tab, setTab] = useState<Tab>(tabs[0])
  const runFacets = job.latestRun?.facets

  return (
    <div
      data-testid='job-drawer'
      style={{
        width: DRAWER_WIDE,
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
      <Header job={job} catalog={catalog} onClose={onClose} />
      <DrawerTabs tabs={tabs} labels={TAB_LABELS} value={tab} onChange={setTab} />
      <div role='tabpanel' style={{ overflow: 'auto', padding: '14px 18px 24px', flex: 1 }}>
        {tab === 'code' && <JobCode facets={job.facets} />}
        {tab === 'lineage' && <JobLineage node={node} lineage={lineage} />}
        {tab === 'runs' && <JobRuns job={job} />}
        {tab === 'facets' && (
          <>
            <MqJsonView data={(job.facets as object) ?? {}} />
            {runFacets && Object.keys(runFacets).length > 0 && (
              <>
                <div style={{ ...sectionHead, margin: '18px 0 8px' }}>
                  <b>Latest run facets</b>
                </div>
                <MqJsonView data={runFacets} />
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
