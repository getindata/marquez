import * as Redux from 'redux'
import { IState } from '../../store/reducers'
import { JobDrawer } from './drawer/JobDrawer'
import { LayerCatalog } from '../../layers'
import { LineageGraph } from '../../types/api'
import { TableDrawer } from './drawer/TableDrawer'
import { bindActionCreators } from 'redux'
import { connect } from 'react-redux'
import { useSearchParams } from 'react-router-dom'
import React from 'react'

interface OwnProps {
  /** The namespace's layer catalog, for the table drawer's heat, wave and complexity. */
  catalog: LayerCatalog | null
  onClose: () => void
}
interface StateProps {
  lineageGraph: LineageGraph
}
interface DispatchProps {}

/** A dataset opens the Axis table drawer (design §7.4), a job the Axis job drawer. */
const TableLevelDrawer = ({
  lineageGraph,
  catalog,
  onClose,
}: OwnProps & StateProps & DispatchProps) => {
  const [searchParams] = useSearchParams()

  const node = lineageGraph.graph.find(
    (node) => node.id === searchParams.get('tableLevelNode') || ''
  )

  if (node?.type === 'DATASET') {
    return (
      <TableDrawer
        key={node.id}
        node={node}
        lineage={lineageGraph}
        catalog={catalog}
        onClose={onClose}
      />
    )
  }
  if (node?.type === 'JOB') {
    return (
      <JobDrawer
        key={node.id}
        node={node}
        lineage={lineageGraph}
        catalog={catalog}
        onClose={onClose}
      />
    )
  }
  return null
}

const mapStateToProps = (state: IState) => ({
  lineageGraph: state.lineage.lineage,
})

const mapDispatchToProps = (dispatch: Redux.Dispatch) => bindActionCreators({}, dispatch)
export default connect(mapStateToProps, mapDispatchToProps)(TableLevelDrawer)
