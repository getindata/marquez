import { Edge, Node as ElkNode } from '../../../libs/graph'
import { LineageGraph } from '../../types/api'

import { AXIS, LayerView, NO_LAYERS, jobTypeOf, resolveNodeMarks } from '../../layers'
import { DATASET_WIDTH, JOB_WIDTH, datasetHeight, jobHeight } from './sizes'
import { JobOrDataset, LineageDataset, LineageJob, LineageNode } from '../../types/lineage'
import { Nullable } from '../../types/util/Nullable'
import { TableLevelNodeData } from './nodes'

/**
 * Recursively trace the `inEdges` and `outEdges` of the current node to find all connected downstream column nodes
 * @param lineageGraph
 * @param currentGraphNode
 */
export const findDownstreamNodes = (
  lineageGraph: LineageGraph,
  currentGraphNode: Nullable<string>
): LineageNode[] => {
  if (!currentGraphNode) return []
  const currentNode = lineageGraph.graph.find((node) => node.id === currentGraphNode)
  if (!currentNode) return []
  const connectedNodes: LineageNode[] = []
  const visitedNodes: string[] = []
  const queue: LineageNode[] = [currentNode]

  while (queue.length) {
    const currentNode = queue.shift()
    if (!currentNode) continue
    if (visitedNodes.includes(currentNode.id)) continue
    visitedNodes.push(currentNode.id)
    connectedNodes.push(currentNode)
    queue.push(
      ...currentNode.outEdges
        .map((edge) => lineageGraph.graph.find((n) => n.id === edge.destination))
        .filter((item): item is LineageNode => !!item)
    )
  }
  return connectedNodes
}
/**
 * Recursively trace the `inEdges` and `outEdges` of the current node to find all connected upstream column nodes
 * @param lineageGraph
 * @param currentGraphNode
 */
export const findUpstreamNodes = (
  lineageGraph: LineageGraph,
  currentGraphNode: Nullable<string>
): LineageNode[] => {
  if (!currentGraphNode) return []
  const currentNode = lineageGraph.graph.find((node) => node.id === currentGraphNode)
  if (!currentNode) return []
  const connectedNodes: LineageNode[] = []
  const visitedNodes: string[] = []
  const queue: LineageNode[] = [currentNode]

  while (queue.length) {
    const currentNode = queue.shift()
    if (!currentNode) continue
    if (visitedNodes.includes(currentNode.id)) continue
    visitedNodes.push(currentNode.id)
    connectedNodes.push(currentNode)
    queue.push(
      ...currentNode.inEdges
        .map((edge) => lineageGraph.graph.find((n) => n.id === edge.origin))
        .filter((item): item is LineageNode => !!item)
    )
  }
  return connectedNodes
}

/**
 * A dataset's columns: Marquez's `fields`, else the standard `schema` facet of the node's
 * `data.facets` (the fork's lineage response); none when neither is there.
 */
export const datasetFields = (dataset: LineageDataset): { name: string; type?: string }[] => {
  if (dataset.fields?.length) {
    return dataset.fields.map((f) => ({ name: f.name, type: f.type ?? undefined }))
  }
  const schema = (dataset.facets as Record<string, any> | undefined)?.schema
  if (!Array.isArray(schema?.fields)) return []
  return schema.fields
    .filter((f: any) => f && typeof f.name === 'string')
    .map((f: any) => ({ name: f.name, type: typeof f.type === 'string' ? f.type : undefined }))
}

/**
 * The table-level graph's ELK options over the library's layered defaults (design §7.3):
 * layer sweep and Brandes-Koepf for aligned columns and straighter runs. Greedy cycle breaking
 * replaces the library's INTERACTIVE one, which reads the (all zero) input positions and so
 * reverses edges at random, putting jobs and tables in the wrong columns.
 */
export const TABLE_LEVEL_LAYOUT_OPTIONS: Record<string, string> = {
  'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
  'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
  'elk.layered.cycleBreaking.strategy': 'GREEDY',
  'elk.layered.spacing.nodeNodeBetweenLayers': '70',
  'elk.spacing.nodeNode': '28',
}

/** Edges on the selected node's up- or downstream flow are magenta, the rest grey. */
export const EDGE_HIGHLIGHT = AXIS.magenta
export const EDGE_MUTED = AXIS.edge

export const createElkNodes = (
  lineageGraph: LineageGraph,
  currentGraphNode: Nullable<string>,
  isCompact: boolean,
  isFull: boolean,
  collapsedNodes: Nullable<string>,
  layerView: LayerView = NO_LAYERS
) => {
  const downstreamNodes = findDownstreamNodes(lineageGraph, currentGraphNode)
  const upstreamNodes = findUpstreamNodes(lineageGraph, currentGraphNode)
  const downstreamIds = new Set(downstreamNodes.map((n) => n.id))
  const upstreamIds = new Set(upstreamNodes.map((n) => n.id))

  const nodes: ElkNode<JobOrDataset, TableLevelNodeData>[] = []
  const edges: Edge[] = []

  const collapsedNodesAsArray = collapsedNodes?.split(',')

  const filteredGraph = lineageGraph.graph.filter((node) => {
    // the Axis layer catalog job (`axis.layers`) is never drawn
    if (node.type === 'JOB' && jobTypeOf((node.data as LineageJob).facets).hidden) return false
    if (isFull) return true
    return downstreamIds.has(node.id) || upstreamIds.has(node.id) || node.id === currentGraphNode
  })
  const drawnIds = new Set(filteredGraph.map((n) => n.id))

  for (const node of filteredGraph) {
    edges.push(
      ...node.outEdges
        .filter((edge) => drawnIds.has(edge.destination))
        .map((edge) => {
          const onFlow =
            (upstreamIds.has(edge.origin) && upstreamIds.has(edge.destination)) ||
            (downstreamIds.has(edge.origin) && downstreamIds.has(edge.destination))
          return {
            id: `${edge.origin}:${edge.destination}`,
            sourceNodeId: edge.origin,
            targetNodeId: edge.destination,
            color: onFlow ? EDGE_HIGHLIGHT : EDGE_MUTED,
            strokeWidth: 1.8,
            strokeDasharray: '0.1 5',
            animatedStrokeWidth: 5,
            isAnimated: true,
          }
        })
    )

    if (node.type === 'JOB') {
      const job = node.data as LineageJob
      const marks = resolveNodeMarks(layerView, 'job', job.facets)
      nodes.push({
        id: node.id,
        kind: node.type,
        width: JOB_WIDTH,
        height: jobHeight(!!marks.meter),
        data: {
          job,
          jobType: jobTypeOf(job.facets),
          marks,
        },
      })
    } else if (node.type === 'DATASET') {
      const data = node.data as LineageDataset
      const marks = resolveNodeMarks(layerView, 'dataset', data.facets)
      const showFields = !isCompact && !collapsedNodesAsArray?.includes(node.id)
      nodes.push({
        id: node.id,
        kind: node.type,
        width: DATASET_WIDTH,
        height: datasetHeight({
          fieldCount: datasetFields(data).length,
          showFields,
          hasMeter: !!marks.meter,
        }),
        data: {
          dataset: data,
          marks,
          showFields,
        },
      })
    }
  }
  return { nodes, edges }
}
