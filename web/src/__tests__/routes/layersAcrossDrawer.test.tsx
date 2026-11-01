// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react'
import { DESIGN_CATALOG } from '../layers/fixtures'
import { JOB_ID, jobGraph } from './jobDrawer.fixtures'
import {
  LayerCatalog,
  activeLayersFromParams,
  jobTypeOf,
  parseLayerCatalog,
  resolveNodeMarks,
  toggleLayer,
  withActiveLayers,
} from '../../layers'
import { LineageDataset, LineageJob } from '../../types/lineage'
import { MemoryRouter, Route, Routes, useLocation, useSearchParams } from 'react-router-dom'
import { Provider } from 'react-redux'
import { TableLineageDatasetNode } from '../../routes/table-level/TableLineageDatasetNode'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { createStore } from 'redux'
import { useCloseDrawer } from '../../routes/table-level/useCloseDrawer'
import TableLevelDrawer from '../../routes/table-level/TableLevelDrawer'
import TableLineageJobNode from '../../routes/table-level/TableLineageJobNode'

jest.mock('../../store/requests/jobs', () => ({
  getRuns: jest.fn(() => Promise.resolve({ totalCount: 0, runs: [] })),
}))

/**
 * Owner bug: turn Complexity on (3 layers), click a PL/SQL job card, close the drawer, and only
 * the 2 default layers were on again. The active layers live in `layers=`; every path through
 * the drawer must keep it.
 */

const catalog = parseLayerCatalog(DESIGN_CATALOG).catalog as LayerCatalog
const TABLE_ID = 'dataset:oracle:dw.fact_sales'

const graph = () => {
  const { lineage } = jobGraph()
  // the table is written by the job, so its Lineage tab lists the job
  lineage.graph = lineage.graph.map((n) =>
    n.id === TABLE_ID ? { ...n, inEdges: [{ origin: JOB_ID, destination: TABLE_ID }] } : n
  )
  return lineage
}

const Page = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const onClose = useCloseDrawer()
  const location = useLocation()
  const lineage = graph()
  const job = lineage.graph.find((n) => n.id === JOB_ID)?.data as LineageJob
  const table = lineage.graph.find((n) => n.id === TABLE_ID)?.data as LineageDataset
  const view = { catalog, active: activeLayersFromParams(searchParams, catalog) }
  return (
    <>
      <button
        type='button'
        onClick={() =>
          setSearchParams(
            withActiveLayers(searchParams, toggleLayer(view.active, 'complexity'), catalog)
          )
        }
      >
        toggle complexity
      </button>
      <svg>
        <TableLineageJobNode
          node={{
            id: JOB_ID,
            kind: 'JOB',
            width: 190,
            height: 80,
            bottomLeftCorner: { x: 0, y: 0 },
            data: {
              job,
              jobType: jobTypeOf(job.facets),
              marks: resolveNodeMarks(view, 'job', job.facets),
            },
          }}
        />
        <TableLineageDatasetNode
          node={{
            id: TABLE_ID,
            kind: 'DATASET',
            width: 190,
            height: 80,
            bottomLeftCorner: { x: 0, y: 0 },
            data: {
              dataset: table,
              marks: resolveNodeMarks(view, 'dataset', table.facets),
              showFields: false,
            },
          }}
        />
      </svg>
      <div data-testid='drawer'>
        <TableLevelDrawer catalog={catalog} onClose={onClose} />
      </div>
      <output data-testid='search'>{location.search}</output>
      <output data-testid='path'>{location.pathname}</output>
    </>
  )
}

const renderPage = () => {
  const lineage = graph()
  const job = lineage.graph.find((n) => n.id === JOB_ID)?.data as LineageJob
  // enough store for the stock job drawer too, so this runs against either drawer
  const store = createStore(() => ({
    lineage: { lineage, tabIndex: 0 },
    job: { result: { ...job, latestRuns: [], tags: [] }, isLoading: false },
    jobs: { deletedJobName: null, result: [] },
    runs: { latestRuns: [], isLatestRunsLoading: false, result: [] },
    display: { dialogIsOpen: false },
    facets: { result: {} },
    tags: { tags: [] },
  }))
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/lineage/dataset/oracle/dw.fact_sales?theme=xebia&depth=3']}>
        <Routes>
          <Route path='/lineage/:nodeType/:namespace/:name' element={<Page />} />
        </Routes>
      </MemoryRouter>
    </Provider>
  )
}

const search = () => new URLSearchParams(screen.getByTestId('search').textContent as string)
const active = () => Array.from(activeLayersFromParams(search(), catalog)).sort()
const THREE = ['complexity', 'heat', 'orchestrator', 'wave'].sort()

/** The drawer's close button: the Axis drawers' ✕, or the stock drawer's close icon. */
const close = async () => {
  const drawer = screen.getByTestId('drawer')
  const button =
    drawer.querySelector('button[aria-label="Close"]') ??
    drawer.querySelector('[data-testid="CloseIcon"]')?.closest('button')
  expect(button).toBeTruthy()
  await act(async () => {
    fireEvent.click(button as Element)
  })
}

const turnComplexityOn = () => {
  expect(active()).toEqual(['heat', 'orchestrator', 'wave'])
  fireEvent.click(screen.getByRole('button', { name: 'toggle complexity' }))
  expect(active()).toEqual(THREE)
}

const openTab = async (name: string) => {
  await act(async () => {
    fireEvent.click(within(screen.getByTestId('drawer')).getByRole('tab', { name }))
  })
}

describe('the active layers across the drawer', () => {
  it('stay on after a job card is clicked and its drawer closed', async () => {
    renderPage()
    turnComplexityOn()
    await act(async () => {
      fireEvent.click(screen.getByTestId('job-card'))
    })
    expect(search().get('tableLevelNode')).toBe(JOB_ID)
    expect(active()).toEqual(THREE)
    await close()
    expect(search().get('tableLevelNode')).toBeNull()
    expect(active()).toEqual(THREE)
    expect(search().get('theme')).toBe('xebia')
    expect(search().get('depth')).toBe('3')
  })

  it('stay on after a dataset card is clicked and its drawer closed', async () => {
    renderPage()
    turnComplexityOn()
    await act(async () => {
      fireEvent.click(screen.getAllByText('dw.fact_sales')[0])
    })
    expect(search().get('tableLevelNode')).toBe(TABLE_ID)
    await close()
    expect(active()).toEqual(THREE)
    expect(search().get('theme')).toBe('xebia')
  })

  it('stay on through a Lineage-tab link to the job and the job drawer’s close', async () => {
    renderPage()
    turnComplexityOn()
    await act(async () => {
      fireEvent.click(screen.getAllByText('dw.fact_sales')[0])
    })
    await openTab('Lineage')
    await act(async () => {
      fireEvent.click(within(screen.getByTestId('drawer')).getByTestId('lineage-job'))
    })
    expect(search().get('tableLevelNode')).toBe(JOB_ID)
    expect(screen.getByTestId('path').textContent).toBe(
      '/lineage/job/oracle/etl.pkg_sales.load_sales'
    )
    expect(active()).toEqual(THREE)
    await close()
    expect(active()).toEqual(THREE)
  })
})
