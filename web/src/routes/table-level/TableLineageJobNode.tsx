import { Divider } from '@mui/material'
import {
  FillAccent,
  FillChip,
  MeterRow,
  NodeFrame,
  TooltipLine,
  ellipsis,
  monoChars,
  nodeUrl,
  tailFit,
} from './cardParts'
import { JobTypeTile, OrchestratorBadge, mix } from '../../layers'
import { PositionedNode } from '../../../libs/graph'
import { TableLineageJobNodeData } from './nodes'
import { formatUpdatedAt } from '../../helpers'
import { runStateColor } from '../../helpers/nodes'
import { selectedRing, useAxisTokens } from '../../theme'
import { theme } from '../../helpers/theme'
import { truncateTextFront } from '../../helpers/text'
import { useDrawerLinkState } from './drawer/drawerHistory'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import MQTooltip from '../../components/core/tooltip/MQTooltip'
import MqStatus from '../../components/core/status/MqStatus'
import React from 'react'

interface TableLineageJobNodeProps {
  node: PositionedNode<'JOB', TableLineageJobNodeData>
  isMiniMap?: boolean
}

const TableLineageJobNode = ({ node, isMiniMap }: TableLineageJobNodeProps) => {
  const t = useAxisTokens()
  const navigate = useNavigate()
  const { nodeType, name, namespace } = useParams()
  const [searchParams] = useSearchParams()
  const linkState = useDrawerLinkState()
  const { job, jobType, marks } = node.data
  // the node type counts too: Axis names a table's own job after the table
  const isSelected =
    node.data.selected ??
    (nodeType?.toLowerCase() === 'job' && name === job.name && namespace === job.namespace)
  const wave = marks.fill

  if (isMiniMap) {
    return (
      <rect
        width={node.width}
        height={node.height}
        rx={10}
        fill={wave ? mix(wave.color, t.jobBg, 0.5) : t.jobBg}
      />
    )
  }

  const handleClick = () => {
    navigate(nodeUrl('job', job.namespace, job.name, node.id, searchParams), {
      state: linkState(node.id),
    })
  }

  const latestRun = job.latestRun
  const tooltip = (
    <div>
      <TooltipLine label='Namespace:'>{truncateTextFront(job.namespace, 40)}</TooltipLine>
      <TooltipLine label='Name:'>{truncateTextFront(job.name, 40)}</TooltipLine>
      <TooltipLine label='Type:'>{jobType.caption}</TooltipLine>
      {job.description && <TooltipLine label='Description:'>{job.description}</TooltipLine>}
      <TooltipLine label='Updated at:'>{formatUpdatedAt(job.updatedAt)}</TooltipLine>
      {wave && <TooltipLine label='Layer:'>{wave.tooltip}</TooltipLine>}
      {marks.badge && <TooltipLine label='Layer:'>{marks.badge.tooltip}</TooltipLine>}
      {marks.meter && (
        <TooltipLine label='Layer:'>
          {marks.meter.label} {marks.meter.text}
        </TooltipLine>
      )}
      {marks.markers.map((m) => (
        <TooltipLine key={m.layerId} label='Flag:'>
          {m.tooltip}
        </TooltipLine>
      ))}
      <Divider sx={{ my: 1 }} />
      <div
        data-testid='latest-run'
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 24 }}
      >
        <b>Latest Run:</b>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <MqStatus
            label={latestRun?.state || 'N/A'}
            color={latestRun?.state ? runStateColor(latestRun.state) : theme.palette.secondary.main}
          />
          {latestRun && (
            <span style={{ fontFamily: t.mono, fontSize: 12 }}>
              {formatUpdatedAt(latestRun.endedAt || latestRun.updatedAt)}
            </span>
          )}
        </span>
      </div>
    </div>
  )

  return (
    <g>
      <NodeFrame width={node.width} height={node.height}>
        <MQTooltip title={tooltip} placement='right-start'>
          <div
            data-testid='job-card'
            data-selected={isSelected ? 'true' : 'false'}
            onClick={handleClick}
            style={{
              position: 'relative',
              width: node.width,
              height: node.height,
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 10px 8px 12px',
              border: `1px solid ${wave ? wave.color : t.line}`,
              borderRadius: 10,
              background: wave ? mix(wave.color, t.jobBg, 0.16) : t.jobBg,
              boxShadow: isSelected ? selectedRing(t) : 'none',
              color: t.text,
              fontFamily: t.font,
              fontSize: 13,
              lineHeight: 1.35,
              cursor: 'pointer',
              pointerEvents: 'auto',
            }}
          >
            {wave && <FillAccent color={wave.color} radius='10px 0 0 10px' />}
            <span style={{ position: 'relative', width: 34, height: 34, flex: 'none' }}>
              <JobTypeTile glyph={jobType.glyph} neutral={{ tile: t.cardHeader, glyph: t.muted }} />
              {marks.badge && (
                <span style={{ position: 'absolute', right: -7, bottom: -7 }}>
                  <OrchestratorBadge
                    icon={marks.badge.icon}
                    ring={wave ? mix(wave.color, t.jobBg, 0.16) : t.jobBg}
                  />
                </span>
              )}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  fontFamily: t.mono,
                  fontSize: 11.5,
                  fontWeight: 600,
                }}
              >
                <span style={ellipsis}>
                  {tailFit(job.name, monoChars(node.width - 68 - marks.markers.length * 12, 11.5))}
                </span>
                {marks.markers.map((m) => (
                  <span
                    key={m.layerId}
                    data-testid='flag-marker'
                    style={{
                      flex: 'none',
                      width: 7,
                      height: 7,
                      transform: 'rotate(45deg)',
                      background: t.accent,
                    }}
                  />
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                <span
                  data-testid='job-type-caption'
                  style={{ ...ellipsis, color: t.muted, fontSize: 10.5 }}
                >
                  {jobType.caption}
                </span>
                {wave && <FillChip fill={wave} />}
              </div>
              {marks.meter && <MeterRow meter={marks.meter} style={{ marginTop: 2 }} />}
            </div>
          </div>
        </MQTooltip>
      </NodeFrame>
    </g>
  )
}

TableLineageJobNode.getLayoutOptions = (node: TableLineageJobNodeProps['node']) => ({
  ...node,
})

export default TableLineageJobNode
