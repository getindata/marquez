// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react'
import { DESIGN_CATALOG } from '../layers/fixtures'
import { JOB_ID, JOB_NAME, LATEST, SOURCE, jobGraph, run } from './jobDrawer.fixtures'
import { JobDrawer } from '../../routes/table-level/drawer/JobDrawer'
import { LayerCatalog, parseLayerCatalog } from '../../layers'
import { MemoryRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import { SCHEMES, SchemeContext, SchemeName } from '../../theme'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { createStore } from 'redux'
import { getRuns } from '../../store/requests/jobs'
import TableLevelDrawer from '../../routes/table-level/TableLevelDrawer'

jest.mock('../../store/requests/jobs', () => ({ getRuns: jest.fn() }))
jest.mock('../../components/jobs/JobDetailPage', () => ({
  __esModule: true,
  default: () => <div data-testid='stock-job-drawer' />,
}))

const RUNS = [
  LATEST,
  run('run-1', 'FAILED', '2026-10-30T08:00:00.000Z', 61000),
  run('run-0', 'COMPLETED', '2026-10-29T08:00:00.000Z', 0),
]

const catalog = parseLayerCatalog(DESIGN_CATALOG).catalog as LayerCatalog

const GRAPH_URL = `/lineage/job/oracle/${JOB_NAME}?theme=xebia&layers=wave&depth=3&tableLevelNode=${encodeURIComponent(
  JOB_ID
)}`

const renderDrawer = (scheme: SchemeName = 'dark', facets?: object) => {
  const { node, lineage } = jobGraph(facets)
  const onClose = jest.fn()
  const utils = render(
    <MemoryRouter initialEntries={[GRAPH_URL]}>
      <SchemeContext.Provider
        value={{ scheme, tokens: SCHEMES[scheme], setScheme: () => undefined }}
      >
        <JobDrawer node={node} lineage={lineage} catalog={catalog} onClose={onClose} />
      </SchemeContext.Provider>
    </MemoryRouter>
  )
  return { ...utils, onClose }
}

const tab = (name: string) => screen.getByRole('tab', { name })
const queryOf = (el: HTMLElement) =>
  new URLSearchParams((el.getAttribute('href') as string).split('?')[1])

beforeEach(() => {
  ;(getRuns as jest.Mock).mockReset()
  ;(getRuns as jest.Mock).mockResolvedValue({ totalCount: RUNS.length, runs: RUNS })
})

describe('the job drawer header', () => {
  it('shows the name, job type, orchestrator, wave, complexity and the latest run', () => {
    renderDrawer()
    const header = screen.getByTestId('job-drawer-header')
    expect(within(header).getByText(JOB_NAME)).toBeTruthy()
    expect(header.querySelector('[data-glyph="plsql"]')).toBeTruthy()
    expect(within(header).getByTestId('orchestrator-badge')).toBeTruthy()
    expect(within(header).getByTestId('wave-chip').textContent).toBe('Wave 1')
    expect(within(header).getByTestId('meter-row').textContent).toContain('0.64')
    const meta = screen.getByTestId('drawer-meta').textContent
    expect(meta).toContain('PL/SQL procedure')
    expect(meta).toContain('COMPLETED')
    expect(meta).toContain('Oct 31, 2026')
  })

  it.each(['light', 'dark', 'xebia'] as const)(
    'draws the name in the scheme’s text colour in %s, so it is readable',
    (scheme) => {
      renderDrawer(scheme)
      const name = within(screen.getByTestId('job-drawer-header')).getByText(JOB_NAME)
      const hex = SCHEMES[scheme].text.replace('#', '')
      const rgb = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ')
      expect(name.style.color).toBe(`rgb(${rgb})`)
    }
  )

  it('closes from its ✕, and has no Edit tag, tag search or DELETE', () => {
    const { onClose } = renderDrawer()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalled()
    expect(screen.queryByText(/edit tag/i)).toBeNull()
    expect(screen.queryByText(/search tags/i)).toBeNull()
    expect(screen.queryByText(/delete/i)).toBeNull()
  })
})

describe('the job drawer tabs', () => {
  it('opens on Code, with the source code and without the duplicate sql block', () => {
    renderDrawer()
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual([
      'Code',
      'Lineage',
      'Runs',
      'Facets (raw)',
    ])
    expect(tab('Code').getAttribute('aria-selected')).toBe('true')
    expect(screen.queryByTestId('job-code-sql')).toBeNull()
    const source = screen.getByTestId('job-code-sourceCode')
    expect(within(source).getByTestId('ddl-code').textContent).toContain('PROCEDURE load_sales')
    const writeText = jest.fn(() => Promise.resolve())
    Object.assign(navigator, { clipboard: { writeText } })
    fireEvent.click(within(source).getByRole('button', { name: 'Copy' }))
    expect(writeText).toHaveBeenCalledWith(SOURCE)
  })

  it('has no Code tab without code facets, and opens on Lineage', () => {
    renderDrawer('dark', { sql: undefined, sourceCode: undefined })
    expect(screen.queryByRole('tab', { name: 'Code' })).toBeNull()
    expect(tab('Lineage').getAttribute('aria-selected')).toBe('true')
    expect(screen.getByTestId('job-lineage')).toBeTruthy()
  })

  it('lists what the job reads and writes and its parent job, linked with the query kept', () => {
    renderDrawer()
    fireEvent.click(tab('Lineage'))
    const reads = within(screen.getByTestId('job-reads')).getAllByTestId('lineage-dataset')
    expect(reads.map((a) => a.textContent)).toEqual(['stg.channels', 'stg.sales_raw'])
    const writes = within(screen.getByTestId('job-writes')).getAllByTestId('lineage-dataset')
    expect(writes.map((a) => a.textContent)).toEqual(['dw.fact_sales'])
    expect(writes[0].getAttribute('href')?.split('?')[0]).toBe(
      '/lineage/dataset/oracle/dw.fact_sales'
    )
    const parent = screen.getByTestId('job-parent')
    expect(parent.textContent).toBe('etl.pkg_sales')
    expect(parent.getAttribute('href')?.split('?')[0]).toBe('/lineage/job/oracle/etl.pkg_sales')
    for (const link of [writes[0], parent]) {
      const q = queryOf(link)
      expect(q.get('theme')).toBe('xebia')
      expect(q.get('layers')).toBe('wave')
      expect(q.get('depth')).toBe('3')
    }
    expect(queryOf(parent).get('tableLevelNode')).toBe('job:oracle:etl.pkg_sales')
  })

  it('lists the runs with state, start and duration', async () => {
    renderDrawer()
    await act(async () => {
      fireEvent.click(tab('Runs'))
    })
    expect(getRuns).toHaveBeenCalledWith(JOB_NAME, 'oracle', 20, 0)
    const rows = screen.getAllByTestId('run-row')
    expect(rows).toHaveLength(3)
    expect(rows[0].textContent).toContain('COMPLETED')
    expect(rows[0].textContent).toContain('Oct 31, 2026')
    expect(rows[1].textContent).toContain('FAILED')
    expect(rows[1].textContent).toContain('1m 01s')
  })

  it('shows the job facets, and the latest run’s facets under their own heading', () => {
    renderDrawer()
    fireEvent.click(tab('Facets (raw)'))
    const panel = screen.getByRole('tabpanel')
    expect(panel.textContent).toContain('sourceCode')
    expect(within(panel).getByText('Latest run facets')).toBeTruthy()
    expect(panel.textContent).toContain('parent')
  })
})

describe('the table-level drawer host, for a job', () => {
  it('opens the Axis job drawer, not the stock one', () => {
    const { lineage } = jobGraph()
    const store = createStore(() => ({ lineage: { lineage } }))
    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={[GRAPH_URL]}>
          <TableLevelDrawer catalog={catalog} onClose={() => undefined} />
        </MemoryRouter>
      </Provider>
    )
    expect(screen.getByTestId('job-drawer')).toBeTruthy()
    expect(screen.queryByTestId('stock-job-drawer')).toBeNull()
  })
})
