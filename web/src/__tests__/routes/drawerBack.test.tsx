// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react'
import { DESIGN_CATALOG } from '../layers/fixtures'
import { JOB_ID, jobGraph } from './jobDrawer.fixtures'
import { LayerCatalog, jobTypeOf, parseLayerCatalog, resolveNodeMarks } from '../../layers'
import { LineageDataset, LineageJob } from '../../types/lineage'
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { Provider } from 'react-redux'
import { TableLineageDatasetNode } from '../../routes/table-level/TableLineageDatasetNode'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { createStore } from 'redux'
import { GraphDrawer } from '../../routes/table-level/GraphDrawer'
import TableLineageJobNode from '../../routes/table-level/TableLineageJobNode'

jest.mock('../../store/requests/jobs', () => ({
  getRuns: jest.fn(() => Promise.resolve({ totalCount: 0, runs: [] })),
}))

/**
 * Owner: "when I click on the Lineage subtab and then pick another node in the graph, have a
 * Back button to return to the previous one".
 */

const catalog = parseLayerCatalog(DESIGN_CATALOG).catalog as LayerCatalog
const TABLE_ID = 'dataset:oracle:dw.fact_sales'
const QUERY = 'theme=xebia&layers=wave%2Ccomplexity&depth=3'

const graph = () => {
  const { lineage } = jobGraph()
  lineage.graph = lineage.graph.map((n) =>
    n.id === TABLE_ID ? { ...n, inEdges: [{ origin: JOB_ID, destination: TABLE_ID }] } : n
  )
  return lineage
}

const Page = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const lineage = graph()
  const job = lineage.graph.find((n) => n.id === JOB_ID)?.data as LineageJob
  const table = lineage.graph.find((n) => n.id === TABLE_ID)?.data as LineageDataset
  const view = { catalog, active: new Set<string>() }
  return (
    <>
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
      <button type='button' onClick={() => navigate(-1)}>
        browser back
      </button>
      {/* the view's real MUI drawer, as TableLevel renders it */}
      <GraphDrawer catalog={catalog} />
      <output data-testid='search'>{location.search}</output>
    </>
  )
}

const renderPage = () => {
  const store = createStore(() => ({ lineage: { lineage: graph() } }))
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[`/lineage/dataset/oracle/dw.fact_sales?${QUERY}`]}>
        <Routes>
          <Route path='/lineage/:nodeType/:namespace/:name' element={<Page />} />
        </Routes>
      </MemoryRouter>
    </Provider>
  )
}

const search = () => new URLSearchParams(screen.getByTestId('search').textContent as string)
/** The open drawer's paper; MUI renders it in a portal for a modal drawer, in place otherwise. */
const drawer = () => within(document.querySelector('.MuiDrawer-paper') as HTMLElement)
const click = async (el: Element) => {
  await act(async () => {
    fireEvent.click(el)
  })
}
const openTable = () => click(screen.getAllByText('dw.fact_sales')[0])
const tab = (name: string) => click(drawer().getByRole('tab', { name }))
const selectedTab = () => drawer().getByRole('tab', { selected: true }).textContent
const back = () => drawer().queryByRole('button', { name: /^← Back to/ })

const expectQueryKept = () => {
  expect(search().get('theme')).toBe('xebia')
  expect(search().get('layers')).toBe('wave,complexity')
  expect(search().get('depth')).toBe('3')
}

describe('Back in the drawer', () => {
  it('keeps the tab in the URL, and has no Back button on the first node', async () => {
    renderPage()
    await openTable()
    expect(back()).toBeNull()
    await tab('Lineage')
    expect(search().get('drawerTab')).toBe('lineage')
    expect(selectedTab()).toBe('Lineage')
    expectQueryKept()
  })

  it('returns from a Lineage-tab link to the first node, on its Lineage tab', async () => {
    renderPage()
    await openTable()
    await tab('Lineage')
    await click(drawer().getByTestId('lineage-job'))
    expect(search().get('tableLevelNode')).toBe(JOB_ID)
    // the next node opens on its own default tab
    expect(search().get('drawerTab')).toBeNull()
    expect(selectedTab()).toBe('Code')
    expect(back()?.textContent).toBe('← Back to fact_sales')
    await click(back() as Element)
    expect(search().get('tableLevelNode')).toBe(TABLE_ID)
    expect(search().get('drawerTab')).toBe('lineage')
    expect(selectedTab()).toBe('Lineage')
    expect(back()).toBeNull()
    expectQueryKept()
  })

  it('goes back two hops, one at a time', async () => {
    renderPage()
    await openTable()
    await tab('Lineage')
    await click(drawer().getByTestId('lineage-job'))
    await tab('Lineage')
    const raw = drawer()
      .getAllByTestId('lineage-dataset')
      .find((a) => a.textContent === 'stg.sales_raw') as HTMLElement
    await click(raw)
    expect(search().get('tableLevelNode')).toBe('dataset:oracle:stg.sales_raw')
    expect(back()?.textContent).toBe('← Back to load_sales')
    await click(back() as Element)
    expect(search().get('tableLevelNode')).toBe(JOB_ID)
    expect(selectedTab()).toBe('Lineage')
    expect(back()?.textContent).toBe('← Back to fact_sales')
    await click(back() as Element)
    expect(search().get('tableLevelNode')).toBe(TABLE_ID)
    expect(selectedTab()).toBe('Lineage')
    expect(back()).toBeNull()
    expectQueryKept()
  })

  it('leaves the graph usable while open: no backdrop over it, nothing hidden from it', async () => {
    renderPage()
    await openTable()
    expect(drawer().getByTestId('table-drawer')).toBeTruthy()
    // a modal drawer's backdrop covers the graph, so a pointer click on a card closes the
    // drawer instead of reaching the card (Playwright: "MuiBackdrop-root … intercepts pointer
    // events"); a modal also marks the rest of the page aria-hidden
    expect(document.querySelector('.MuiBackdrop-root')).toBeNull()
    expect(document.querySelector('.MuiModal-root')).toBeNull()
    expect(screen.getByTestId('job-card').closest('[aria-hidden="true"]')).toBeNull()
  })

  it('closes on Escape, keeping the query', async () => {
    renderPage()
    await openTable()
    await tab('Lineage')
    await act(async () => {
      fireEvent.keyDown(document.body, { key: 'Escape' })
    })
    expect(search().get('tableLevelNode')).toBeNull()
    expectQueryKept()
  })

  it('also takes a card click in the graph as a step to go back from', async () => {
    renderPage()
    await openTable()
    await tab('Lineage')
    await click(screen.getByTestId('job-card'))
    expect(back()?.textContent).toBe('← Back to fact_sales')
    await click(back() as Element)
    expect(selectedTab()).toBe('Lineage')
  })

  it('gives the browser’s Back the same result as the button', async () => {
    renderPage()
    await openTable()
    await tab('Lineage')
    await click(drawer().getByTestId('lineage-job'))
    await click(screen.getByRole('button', { name: 'browser back' }))
    expect(search().get('tableLevelNode')).toBe(TABLE_ID)
    expect(selectedTab()).toBe('Lineage')
    expect(back()).toBeNull()
  })

  it('forgets the history when the drawer is closed', async () => {
    renderPage()
    await openTable()
    await tab('Lineage')
    await click(drawer().getByTestId('lineage-job'))
    await click(drawer().getByRole('button', { name: 'Close' }))
    expect(search().get('tableLevelNode')).toBeNull()
    expect(search().get('drawerTab')).toBeNull()
    await openTable()
    expect(back()).toBeNull()
    expectQueryKept()
  })
})
