import { JobOrDataset, LineageDataset, LineageJob } from '../../types/lineage'
import { JobTypeInfo, NodeMarks } from '../../layers'
import { NodeRendererMap } from '../../../libs/graph'
import TableLineageDatasetNode from './TableLineageDatasetNode'
import TableLineageJobNode from './TableLineageJobNode'

export interface TableLineageJobNodeData {
  job: LineageJob
  jobType: JobTypeInfo
  marks: NodeMarks
}

export interface TableLineageDatasetNodeData {
  dataset: LineageDataset
  marks: NodeMarks
  /** False when Compact nodes is on or the node is collapsed: the column rows are hidden. */
  showFields: boolean
}

export type TableLevelNodeData = TableLineageDatasetNodeData | TableLineageJobNodeData

export const tableLevelNodeRenderer: NodeRendererMap<JobOrDataset, TableLevelNodeData> = new Map()
  .set('JOB', TableLineageJobNode)
  .set('DATASET', TableLineageDatasetNode)
