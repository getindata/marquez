import * as Redux from 'redux'
import {
  AXIS,
  LayerNodeKind,
  LayerView,
  LayersPanel,
  activeLayersFromParams,
  layersForGraph,
  toggleLayer,
  useLayerCatalog,
  withActiveLayers,
} from '../../layers'
import { ActionBar } from './ActionBar'
import { Box } from '@mui/system'
import { DEFAULT_MAX_SCALE, Graph, ZoomPanControls } from '../../../libs/graph'
import { Drawer } from '@mui/material'
import { HEADER_HEIGHT, theme } from '../../helpers/theme'
import { IState } from '../../store/reducers'
import { JobOrDataset } from '../../types/lineage'
import { LineageGraph } from '../../types/api'
import { TABLE_LEVEL_LAYOUT_OPTIONS, createElkNodes } from './layout'
import { TableLevelNodeData, tableLevelNodeRenderer } from './nodes'
import { ZoomControls } from '../column-level/ZoomControls'
import { bindActionCreators } from 'redux'
import { connect } from 'react-redux'
import { fetchLineage } from '../../store/actionCreators'
import { useCallbackRef } from '../../helpers/hooks'
import { useParams, useSearchParams } from 'react-router-dom'
import ParentSize from '@visx/responsive/lib/components/ParentSize'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import TableLevelDrawer from './TableLevelDrawer'

interface StateProps {
  lineage: LineageGraph
}

interface DispatchProps {
  fetchLineage: typeof fetchLineage
}

type ColumnLevelProps = StateProps & DispatchProps

const zoomInFactor = 1.5
const zoomOutFactor = 1 / zoomInFactor

const ColumnLevel: React.FC<ColumnLevelProps> = ({
  fetchLineage: fetchLineage,
  lineage: lineage,
}: ColumnLevelProps) => {
  const { nodeType, namespace, name } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()

  const [depth, setDepth] = useState(Number(searchParams.get('depth')) || 2)

  const [isCompact, setIsCompact] = useState(searchParams.get('isCompact') === 'true')
  const [isFull, setIsFull] = useState(searchParams.get('isFull') === 'true')
  const [layersOpen, setLayersOpen] = useState(false)

  const graphControls = useRef<ZoomPanControls>()

  const collapsedNodes = searchParams.get('collapsedNodes')

  // Axis lineage layers: the namespace's catalog, and the active layers kept in `layers=`.
  const catalog = useLayerCatalog(namespace)
  const layersParam = searchParams.get('layers')
  const layerView: LayerView = useMemo(
    () => ({ catalog, active: activeLayersFromParams(searchParams, catalog) }),
    [catalog, layersParam]
  )
  const closeLayers = useCallback(() => setLayersOpen(false), [])

  useEffect(() => {
    if (name && namespace && nodeType) {
      fetchLineage(nodeType as JobOrDataset, namespace, name, depth)
    }
  }, [name, namespace, depth])

  const setGraphControls = useCallbackRef((zoomControls) => {
    graphControls.current = zoomControls
  })

  const { nodes, edges } = lineage
    ? createElkNodes(
        lineage,
        `${nodeType}:${namespace}:${name}`,
        isCompact,
        isFull,
        collapsedNodes,
        layerView
      )
    : { nodes: [], edges: [] }

  useEffect(() => {
    setTimeout(() => {
      graphControls.current?.fitContent()
    }, 300)
  }, [nodes.length, isCompact])

  if (!lineage) {
    return <div />
  }

  const handleScaleZoom = (inOrOut: 'in' | 'out') => {
    graphControls.current?.scaleZoom(inOrOut === 'in' ? zoomInFactor : zoomOutFactor)
  }

  const handleResetZoom = () => {
    graphControls.current?.fitContent()
  }

  const handleCenterOnNode = () => {
    graphControls.current?.centerOnPositionedNode(
      `${nodeType}:${namespace}:${name}`,
      DEFAULT_MAX_SCALE
    )
  }

  const graphKinds = new Set<LayerNodeKind>(
    nodes.map((n) => (n.kind === 'JOB' ? 'job' : 'dataset') as LayerNodeKind)
  )
  const panelLayers = layersForGraph(catalog, graphKinds)
  const activeCount = panelLayers.filter((l) => layerView.active.has(l.id)).length

  const handleToggleLayer = (id: string) => {
    if (!catalog) return
    setSearchParams(withActiveLayers(searchParams, toggleLayer(layerView.active, id), catalog))
  }

  return (
    <>
      <ActionBar
        nodeType={nodeType?.toUpperCase() as JobOrDataset}
        fetchLineage={fetchLineage}
        depth={depth}
        setDepth={setDepth}
        isCompact={isCompact}
        setIsCompact={setIsCompact}
        isFull={isFull}
        setIsFull={setIsFull}
        showLayers={panelLayers.length > 0}
        activeLayerCount={activeCount}
        layersOpen={layersOpen}
        onToggleLayers={() => setLayersOpen((open) => !open)}
      />
      <Box
        height={`calc(100vh - ${HEADER_HEIGHT}px - ${HEADER_HEIGHT}px - 1px)`}
        position='relative'
        sx={{ background: AXIS.canvas }}
      >
        <Drawer
          anchor={'right'}
          open={!!searchParams.get('tableLevelNode')}
          onClose={() => {
            searchParams.delete('tableLevelNode')
            setSearchParams(searchParams)
          }}
          PaperProps={{
            sx: {
              backgroundColor: theme.palette.background.default,
              backgroundImage: 'none',
              mt: `${HEADER_HEIGHT}px`,
              height: `calc(100vh - ${HEADER_HEIGHT}px)`,
            },
          }}
        >
          <Box>
            <TableLevelDrawer />
          </Box>
        </Drawer>
        <ZoomControls
          handleCenterOnNode={handleCenterOnNode}
          handleScaleZoom={handleScaleZoom}
          handleResetZoom={handleResetZoom}
        />
        {layersOpen && panelLayers.length > 0 && (
          <LayersPanel
            layers={panelLayers}
            active={layerView.active}
            onToggle={handleToggleLayer}
            onClose={closeLayers}
          />
        )}
        <ParentSize>
          {(parent) => (
            <Graph<JobOrDataset, TableLevelNodeData>
              id='column-level-graph'
              backgroundColor={AXIS.canvas}
              dotGridColor={AXIS.dotGrid}
              height={parent.height}
              width={parent.width}
              nodes={nodes}
              edges={edges}
              direction='right'
              layoutOptions={TABLE_LEVEL_LAYOUT_OPTIONS}
              nodeRenderers={tableLevelNodeRenderer}
              setZoomPanControls={setGraphControls}
            />
          )}
        </ParentSize>
      </Box>
    </>
  )
}

const mapStateToProps = (state: IState) => ({
  lineage: state.lineage.lineage,
})

const mapDispatchToProps = (dispatch: Redux.Dispatch) =>
  bindActionCreators(
    {
      fetchLineage: fetchLineage,
    },
    dispatch
  )

export default connect(mapStateToProps, mapDispatchToProps)(ColumnLevel)
