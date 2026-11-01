// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import {
  DatasetRef,
  LineageSide,
  NeighbourJob,
  columnLineageUrl,
  tableNeighbours,
} from './neighbours'
import { FillChip, nodeUrl, tailFit } from '../cardParts'
import { JobTypeTile, LayerCatalog, OrchestratorBadge, jobTypeOf } from '../../../layers'
import { LineageDataset, LineageNode } from '../../../types/lineage'
import { LineageGraph } from '../../../types/api'
import { Link, useSearchParams } from 'react-router-dom'
import { allMarks } from './marks'
import { useAxisTokens } from '../../../theme'
import React, { CSSProperties, ReactNode } from 'react'

/**
 * The drawer's Lineage tab: the jobs that write the table (each with what it reads) and the
 * jobs that read it (each with what it writes), from the graph already loaded. Own (DDL) jobs
 * are collapsed as on the graph. Every name focuses its node in the graph, as a card click does.
 */

/** Names are cut from the front to fit the 640px drawer, a job's beside its wave chip. */
const JOB_CHARS = 60
const DATASET_CHARS = 56

export const DatasetLinks = ({ lead, datasets }: { lead?: ReactNode; datasets: DatasetRef[] }) => {
  const t = useAxisTokens()
  const [searchParams] = useSearchParams()
  if (!datasets.length && !lead) return null
  return (
    <div style={{ marginTop: 4, fontSize: 12, color: t.muted, lineHeight: 1.6 }}>
      {lead}
      {datasets.map((d, i) => (
        <React.Fragment key={d.id}>
          {i > 0 && ', '}
          <Link
            data-testid='lineage-dataset'
            to={nodeUrl('dataset', d.namespace, d.name, d.id, searchParams)}
            title={`${d.namespace} · ${d.name}`}
            style={linkStyle(t.link, t.mono)}
          >
            {tailFit(d.name, DATASET_CHARS)}
          </Link>
        </React.Fragment>
      ))}
    </div>
  )
}

const linkStyle = (color: string, font: string): CSSProperties => ({
  color,
  fontFamily: font,
  fontSize: 12,
  textDecoration: 'none',
  whiteSpace: 'nowrap',
})

const Row = ({ icon, children }: { icon: ReactNode; children: ReactNode }) => {
  const t = useAxisTokens()
  return (
    <div
      data-testid='lineage-row'
      style={{
        display: 'flex',
        gap: 12,
        padding: '10px 12px',
        marginBottom: 8,
        border: `1px solid ${t.line}`,
        borderRadius: 9,
        background: t.meterRow,
      }}
    >
      <span style={{ position: 'relative', width: 28, height: 28, flex: 'none' }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  )
}

const JobRow = ({
  entry,
  verb,
  catalog,
}: {
  entry: NeighbourJob
  verb: string
  catalog: LayerCatalog | null
}) => {
  const t = useAxisTokens()
  const [searchParams] = useSearchParams()
  const { job } = entry
  const jobType = jobTypeOf(job.facets)
  const marks = allMarks(catalog, 'job', job.facets)
  return (
    <Row
      icon={
        <>
          <JobTypeTile
            glyph={jobType.glyph}
            size={28}
            neutral={{ tile: t.cardHeader, glyph: t.muted }}
          />
          {marks.badge && (
            <span style={{ position: 'absolute', right: -6, bottom: -6 }}>
              <OrchestratorBadge icon={marks.badge.icon} size={15} ring={t.meterRow} />
            </span>
          )}
        </>
      }
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <Link
          data-testid='lineage-job'
          to={nodeUrl('job', job.namespace, job.name, entry.id, searchParams)}
          title={`${job.namespace} · ${job.name}`}
          style={{
            ...linkStyle(t.link, t.mono),
            fontWeight: 600,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {tailFit(job.name, JOB_CHARS)}
        </Link>
        {marks.fill && <FillChip fill={marks.fill} />}
      </div>
      <DatasetLinks
        lead={
          <>
            <span data-testid='job-type-caption'>{jobType.caption}</span>
            {entry.datasets.length > 0 && ` · ${verb} `}
          </>
        }
        datasets={entry.datasets}
      />
    </Row>
  )
}

const DirectRow = ({ label, datasets }: { label: string; datasets: DatasetRef[] }) => {
  const t = useAxisTokens()
  return (
    <Row
      icon={<JobTypeTile glyph='sql' size={28} neutral={{ tile: t.cardHeader, glyph: t.muted }} />}
    >
      <div data-testid='lineage-direct' style={{ fontSize: 12.5, color: t.text }}>
        {label}
      </div>
      <DatasetLinks datasets={datasets} />
    </Row>
  )
}

const Side = ({
  title,
  side,
  verb,
  directLabel,
  empty,
  catalog,
}: {
  title: string
  side: LineageSide
  verb: string
  directLabel: string
  empty: string
  catalog: LayerCatalog | null
}) => {
  const t = useAxisTokens()
  const count = side.jobs.length
  return (
    <section data-testid={`lineage-${title.toLowerCase()}`} style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8, fontSize: 13 }}>
        <b>{title}</b>
        {count > 0 && (
          <span style={{ marginLeft: 'auto', color: t.muted, fontSize: 12 }}>
            {count} {count === 1 ? 'job' : 'jobs'}
          </span>
        )}
      </div>
      {side.direct.length > 0 && <DirectRow label={directLabel} datasets={side.direct} />}
      {side.jobs.map((j) => (
        <JobRow key={j.id} entry={j} verb={verb} catalog={catalog} />
      ))}
      {!count && !side.direct.length && (
        <div data-testid='lineage-empty' style={{ color: t.muted, fontSize: 12.5 }}>
          {empty}
        </div>
      )}
    </section>
  )
}

export const LineageTab = ({
  node,
  lineage,
  catalog,
}: {
  node: LineageNode
  lineage: LineageGraph
  catalog: LayerCatalog | null
}) => {
  const t = useAxisTokens()
  const [searchParams] = useSearchParams()
  const dataset = node.data as LineageDataset
  const { upstream, downstream } = tableNeighbours(node, lineage)
  return (
    <div data-testid='lineage-tab'>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
        <Link
          data-testid='column-lineage'
          to={columnLineageUrl(dataset, searchParams)}
          style={{ color: t.link, fontSize: 12.5, textDecoration: 'none' }}
        >
          Column lineage →
        </Link>
      </div>
      <Side
        title='Upstream'
        side={upstream}
        verb='reads'
        directLabel='Its own DDL reads'
        empty='No upstream jobs'
        catalog={catalog}
      />
      <Side
        title='Downstream'
        side={downstream}
        verb='writes'
        directLabel='Read by the DDL of'
        empty='No downstream jobs'
        catalog={catalog}
      />
    </div>
  )
}
