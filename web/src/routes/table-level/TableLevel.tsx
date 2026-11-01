import * as Redux from 'redux'
import { ActionBar } from './ActionBar'
import { Box } from '@mui/system'
import { Drawer } from '@mui/material'
import { Graph, ZoomPanControls } from '../../../libs/graph'
import { HEADER_HEIGHT } from '../../helpers/theme'
import { IState } from '../../store/reducers'
import { JobOrDataset } from '../../types/lineage'
import {
  LayerNodeKind,
  LayerView,
  LayersPanel,
  activeLayersFromParams,
  layersForGraph,
  toggleLayer,
  useLayerCatalog,
  withActiveLayers,
} from '../../layers'
import { LineageGraph } from '../../types/api'
import { MiniMapPlacement } from '../../../libs/graph/src/components/ZoomPanSvg/MiniMap'
import { TABLE_LEVEL_LAYOUT_OPTIONS, createElkNodes } from './layout'
import { TableLevelNodeData, tableLevelNodeRenderer } from './nodes'
import { TableZoomControls } from './TableZoomControls'
import { bindActionCreators } from 'redux'
import { collapsedLineage, lineageFetchDepth } from './collapse'
import { connect } from 'react-redux'
import { fetchLineage } from '../../store/actionCreators'
import { useAxisTokens } from '../../theme'
import { useCallbackRef } from '../../helpers/hooks'
import { useCloseDrawer } from './useCloseDrawer'
import { useLineageFetch } from './useLineageFetch'
import { useParams, useSearchParams } from 'react-router-dom'
import ParentSize from '@visx/responsive/lib/components/ParentSize'
import React, { useCallback, useMemo, useRef, useState } from 'react'
import TableLevelDrawer from './TableLevelDrawer'

interface StateProps {
  lineage: LineageGraph
}

interface DispatchProps {
  fetchLineage: typeof fetchLineage
}

type ColumnLevelProps = StateProps & DispatchProps

/** The strip on the right that holds the stock zoom controls (40px wide, 8px margins). */
const ZOOM_GUTTER = 56

/** The scale a card's name is still legible at: the graph opens no smaller than this. */
const READABLE_SCALE = 0.6

/** The minimap, when shown: a twelfth of the graph area, in the bottom right corner. */
const MINIMAP_SCALE = 1 / 12
const MINIMAP_KEY = 'axis.lineage.minimap'

const readMapOpen = () => {
  try {
    return window.localStorage.getItem(MINIMAP_KEY) === 'open'
  } catch {
    return false
  }
}

const zoomInFactor = 1.5
const zoomOutFactor = 1 / zoomInFactor

const ColumnLevel: React.FC<ColumnLevelProps> = ({
  fetchLineage: fetchLineage,
  lineage: lineage,
}: ColumnLevelProps) => {
  const t = useAxisTokens()
  const { nodeType, namespace, name } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()

  const [depth, setDepth] = useState(Number(searchParams.get('depth')) || 2)

  const [isCompact, setIsCompact] = useState(searchParams.get('isCompact') === 'true')
  const [isFull, setIsFull] = useState(searchParams.get('isFull') === 'true')
  const [layersOpen, setLayersOpen] = useState(false)
  const [mapOpen, setMapOpen] = useState(readMapOpen)
  const toggleMap = () =>
    setMapOpen((open) => {
      try {
        window.localStorage.setItem(MINIMAP_KEY, open ? 'closed' : 'open')
      } catch {
        // storage blocked: the choice lasts for this page only
      }
      return !open
    })

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
  const closeDrawer = useCloseDrawer()

  // one hop more than shown, cut on the collapsed graph; Full graph asks for at least
  // FULL_GRAPH_DEPTH hops, more if Depth asks for more
  useLineageFetch(fetchLineage, nodeType, namespace, name, lineageFetchDepth(depth, isFull))

  const setGraphControls = useCallbackRef((zoomControls) => {
    graphControls.current = zoomControls
  })

  // each table's or view's own job is hidden, its inputs drawn straight into the dataset
  const view = lineage
    ? collapsedLineage(lineage, `${nodeType}:${namespace}:${name}`, depth, isFull)
    : undefined
  const selectedId = view?.selected ?? `${nodeType}:${namespace}:${name}`

  const { nodes, edges } = view
    ? createElkNodes(view.graph, selectedId, isCompact, isFull, collapsedNodes, layerView, {
        highlight: t.accent,
        muted: t.edge,
      })
    : { nodes: [], edges: [] }

  if (!lineage) {
    return <div />
  }

  const handleScaleZoom = (inOrOut: 'in' | 'out') => {
    graphControls.current?.scaleZoom(inOrOut === 'in' ? zoomInFactor : zoomOutFactor)
  }

  const handleFitAll = () => {
    graphControls.current?.fitContent()
  }

  const handleCenterOnNode = () => {
    graphControls.current?.centerOnPositionedNode(selectedId, Math.max(1, READABLE_SCALE))
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
        sx={{ background: t.canvas }}
      >
        <Drawer
          anchor={'right'}
          open={!!searchParams.get('tableLevelNode')}
          onClose={closeDrawer}
          PaperProps={{
            sx: {
              backgroundColor: t.drawer,
              backgroundImage: 'none',
              mt: `${HEADER_HEIGHT}px`,
              height: `calc(100vh - ${HEADER_HEIGHT}px)`,
            },
          }}
        >
          <Box height='100%'>
            <TableLevelDrawer catalog={catalog} onClose={closeDrawer} />
          </Box>
        </Drawer>
        <TableZoomControls
          onZoom={handleScaleZoom}
          onFitAll={handleFitAll}
          onCenter={handleCenterOnNode}
          mapOpen={mapOpen}
          onToggleMap={toggleMap}
        />
        {layersOpen && panelLayers.length > 0 && (
          <LayersPanel
            layers={panelLayers}
            active={layerView.active}
            onToggle={handleToggleLayer}
            onClose={closeLayers}
          />
        )}
        {/* the graph stops short of the zoom controls' strip, so fit-to-view never puts a
            node under them */}
        <Box position='absolute' top={0} bottom={0} left={0} right={`${ZOOM_GUTTER}px`}>
          <ParentSize>
            {(parent) => (
              <Graph<JobOrDataset, TableLevelNodeData>
                id='column-level-graph'
                backgroundColor={t.canvas}
                dotGridColor={t.dotGrid}
                height={parent.height}
                width={parent.width}
                nodes={nodes}
                edges={edges}
                direction='right'
                layoutOptions={TABLE_LEVEL_LAYOUT_OPTIONS}
                focusNodeId={selectedId}
                focusMinScale={READABLE_SCALE}
                miniMapPlacement={mapOpen ? MiniMapPlacement.BottomRight : MiniMapPlacement.None}
                miniMapScale={MINIMAP_SCALE}
                nodeRenderers={tableLevelNodeRenderer}
                setZoomPanControls={setGraphControls}
              />
            )}
          </ParentSize>
        </Box>
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
