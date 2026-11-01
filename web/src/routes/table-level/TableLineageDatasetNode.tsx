import { ChevronLeft } from '@mui/icons-material'
import {
  DATASET_HEADER_HEIGHT,
  FIELD_ROW_HEIGHT,
  MAX_FIELD_ROWS,
  METER_ROW_HEIGHT,
  MORE_ROW_HEIGHT,
} from './sizes'
import { Dataset } from '../../types/api'
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
import { IState } from '../../store/reducers'
import { LineageDataset } from '../../types/lineage'
import { PositionedNode } from '../../../libs/graph'
import { TableLineageDatasetNodeData } from './nodes'
import { connect } from 'react-redux'
import { datasetFields } from './layout'
import { mix } from '../../layers'
import { selectedRing, useAxisTokens } from '../../theme'
import { useDrawerLinkState } from './drawer/drawerHistory'

import * as Redux from 'redux'
import { bindActionCreators } from 'redux'
import { datasetFacetsQualityAssertions, datasetFacetsStatus } from '../../helpers/nodes'
import { fetchDataset, resetDataset } from '../../store/actionCreators'
import { formatUpdatedAt } from '../../helpers'
import { truncateTextFront } from '../../helpers/text'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import IconButton from '@mui/material/IconButton'
import MQTooltip from '../../components/core/tooltip/MQTooltip'
import MqStatus from '../../components/core/status/MqStatus'
import React from 'react'

interface DispatchProps {
  fetchDataset: typeof fetchDataset
  resetDataset: typeof resetDataset
}

interface StateProps {
  dataset?: Dataset
}

interface TableLineageDatasetNodeProps {
  node: PositionedNode<'DATASET', TableLineageDatasetNodeData>
  isMiniMap?: boolean
}

/** `table`, `view`… from the standard `datasetType` facet, else from Marquez's dataset type. */
export const datasetTypeOf = (dataset: LineageDataset) => {
  const facet = (dataset.facets as Record<string, any> | undefined)?.datasetType
  const given = typeof facet?.datasetType === 'string' ? facet.datasetType : ''
  if (given) return given.toLowerCase().replace(/_/g, ' ')
  return dataset.type === 'STREAM' ? 'stream' : 'table'
}

export const TableLineageDatasetNode = ({
  node,
  isMiniMap,
  dataset,
  fetchDataset,
}: TableLineageDatasetNodeProps & StateProps & Partial<DispatchProps>) => {
  const t = useAxisTokens()
  const navigate = useNavigate()
  const { nodeType, name, namespace } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const linkState = useDrawerLinkState()
  const lineageDataset = node.data.dataset
  const { marks, showFields } = node.data
  // the node type counts too: Axis names a table's own job after the table
  const isSelected =
    node.data.selected ??
    (nodeType?.toLowerCase() === 'dataset' &&
      name === lineageDataset.name &&
      namespace === lineageDataset.namespace)
  const isCollapsed = searchParams.get('collapsedNodes')?.split(',').includes(node.id)
  const wave = marks.fill

  if (isMiniMap) {
    return (
      <rect
        width={node.width}
        height={node.height}
        rx={8}
        fill={wave ? wave.color : t.cardHeader}
      />
    )
  }

  const handleClick = () => {
    navigate(
      nodeUrl('dataset', lineageDataset.namespace, lineageDataset.name, node.id, searchParams),
      { state: linkState(node.id) }
    )
  }

  const toggleCollapsed = (event: React.MouseEvent) => {
    event.stopPropagation()
    const collapsed = (searchParams.get('collapsedNodes') || '').split(',').filter(Boolean)
    const next = collapsed.includes(node.id)
      ? collapsed.filter((id) => id !== node.id)
      : [...collapsed, node.id]
    searchParams.set('collapsedNodes', next.toString())
    // keep the history state, so the drawer's Back survives it
    setSearchParams(searchParams, { state: location.state })
  }

  const tooltip = (
    <div>
      <TooltipLine label='Namespace:'>
        {truncateTextFront(lineageDataset.namespace, 40)}
      </TooltipLine>
      <TooltipLine label='Name:'>{truncateTextFront(lineageDataset.name, 40)}</TooltipLine>
      {lineageDataset.description && (
        <TooltipLine label='Description:'>{lineageDataset.description}</TooltipLine>
      )}
      <TooltipLine label='Updated at:'>{formatUpdatedAt(lineageDataset.updatedAt)}</TooltipLine>
      {wave && <TooltipLine label='Layer:'>{wave.tooltip}</TooltipLine>}
      {marks.markers.map((m) => (
        <TooltipLine key={m.layerId} label='Flag:'>
          {m.tooltip}
        </TooltipLine>
      ))}
      {dataset && datasetFacetsStatus(dataset.facets) && (
        <>
          <Divider sx={{ my: 1 }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24 }}>
            <b>Quality:</b>
            <MqStatus
              label={
                datasetFacetsQualityAssertions(dataset.facets).find((a) => !a.success)
                  ? 'UNHEALTHY'
                  : 'HEALTHY'
              }
              color={datasetFacetsStatus(dataset.facets)}
            />
          </div>
        </>
      )}
    </div>
  )

  const fields = datasetFields(lineageDataset)
  const shownFields = showFields ? fields.slice(0, MAX_FIELD_ROWS) : []
  const moreFields = showFields ? fields.length - shownFields.length : 0
  const rowLine = `1px solid ${t.rowLine}`

  return (
    <g>
      <NodeFrame width={node.width} height={node.height}>
        <div
          data-testid='dataset-card'
          data-selected={isSelected ? 'true' : 'false'}
          onClick={handleClick}
          style={{
            position: 'relative',
            width: node.width,
            height: node.height,
            boxSizing: 'border-box',
            border: `1px solid ${wave ? wave.color : t.line}`,
            borderRadius: 8,
            background: t.card,
            boxShadow: isSelected ? selectedRing(t) : t.cardShadow,
            color: t.text,
            fontFamily: t.font,
            fontSize: 13,
            lineHeight: 1.35,
            overflow: 'hidden',
            cursor: 'pointer',
            pointerEvents: 'auto',
          }}
        >
          <div
            style={{
              position: 'relative',
              height: DATASET_HEADER_HEIGHT,
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 10px 6px 12px',
              background: wave ? mix(wave.color, t.cardHeader, 0.22) : t.cardHeader,
              borderBottom: showFields || marks.meter ? `1px solid ${t.line}` : 'none',
            }}
          >
            {wave && <FillAccent color={wave.color} radius='8px 0 0 0' />}
            {marks.dot && (
              <MQTooltip title={marks.dot.tooltip} placement='top'>
                <span
                  data-testid='heat-dot'
                  style={{
                    width: 12,
                    height: 12,
                    flex: 'none',
                    borderRadius: '50%',
                    background: marks.dot.color,
                  }}
                />
              </MQTooltip>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <MQTooltip
                onOpen={() => fetchDataset?.(lineageDataset.namespace, lineageDataset.name)}
                placement='right-start'
                title={tooltip}
              >
                <div
                  style={{
                    ...ellipsis,
                    fontFamily: t.mono,
                    fontWeight: 600,
                    fontSize: 12,
                    paddingRight: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  <span style={ellipsis}>
                    {tailFit(
                      lineageDataset.name,
                      monoChars(
                        node.width - 48 - (marks.dot ? 20 : 0) - marks.markers.length * 12,
                        12
                      )
                    )}
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
              </MQTooltip>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  color: t.muted,
                  fontSize: 10.5,
                  minWidth: 0,
                }}
              >
                <span style={ellipsis}>
                  {lineageDataset.namespace} · {datasetTypeOf(lineageDataset)}
                </span>
                {wave && <FillChip fill={wave} />}
              </div>
            </div>
            <MQTooltip title={isCollapsed ? 'Expand' : 'Collapse'} placement='top'>
              <IconButton
                aria-label={isCollapsed ? 'Expand' : 'Collapse'}
                onClick={toggleCollapsed}
                sx={{
                  position: 'absolute',
                  top: 3,
                  right: 3,
                  width: 14,
                  height: 14,
                  p: 0,
                  color: t.muted,
                  opacity: 0.6,
                  '&:hover': { opacity: 1 },
                }}
              >
                <ChevronLeft
                  sx={{
                    width: 12,
                    height: 12,
                    rotate: !isCollapsed ? '-90deg' : 0,
                    transition: 'rotate .3s',
                  }}
                />
              </IconButton>
            </MQTooltip>
          </div>
          {marks.meter && (
            <MeterRow
              meter={marks.meter}
              style={{
                height: METER_ROW_HEIGHT,
                padding: '0 10px 0 12px',
                background: t.meterRow,
                borderBottom: shownFields.length ? rowLine : 'none',
              }}
            />
          )}
          {shownFields.map((field, index) => (
            <div
              key={field.name}
              data-testid='field-row'
              style={{
                height: FIELD_ROW_HEIGHT,
                boxSizing: 'border-box',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                padding: '0 10px 0 12px',
                fontSize: 11,
                borderTop: index > 0 ? rowLine : 'none',
              }}
            >
              <span style={ellipsis}>{field.name}</span>
              {field.type && (
                <i
                  style={{
                    ...ellipsis,
                    fontStyle: 'normal',
                    color: t.muted,
                    fontFamily: t.mono,
                    fontSize: 10,
                  }}
                >
                  {field.type.toLowerCase()}
                </i>
              )}
            </div>
          ))}
          {moreFields > 0 && (
            <div
              data-testid='more-fields'
              style={{
                height: MORE_ROW_HEIGHT,
                boxSizing: 'border-box',
                textAlign: 'center',
                color: t.muted,
                fontSize: 10,
                lineHeight: `${MORE_ROW_HEIGHT - 1}px`,
                borderTop: rowLine,
              }}
            >
              + {moreFields} more field{moreFields === 1 ? '' : 's'}
            </div>
          )}
        </div>
      </NodeFrame>
    </g>
  )
}

TableLineageDatasetNode.getLayoutOptions = (node: TableLineageDatasetNodeProps['node']) => ({
  ...node,
})

const mapStateToProps = (state: IState) => ({
  dataset: state.dataset.result,
})

const mapDispatchToProps = (dispatch: Redux.Dispatch) =>
  bindActionCreators(
    {
      fetchDataset: fetchDataset,
      resetDataset: resetDataset,
    },
    dispatch
  )

export default connect(mapStateToProps, mapDispatchToProps)(TableLineageDatasetNode)
