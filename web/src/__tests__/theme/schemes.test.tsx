// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react'
import { DESIGN_CATALOG, axisLayers } from '../layers/fixtures'
import {
  LayerCatalog,
  LayerView,
  jobTypeOf,
  parseLayerCatalog,
  resolveNodeMarks,
} from '../../layers'
import { LineageDataset, LineageJob } from '../../types/lineage'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import {
  SCHEMES,
  SCHEME_NAMES,
  SCHEME_STORAGE_KEY,
  SchemeContext,
  SchemeName,
  SchemeProvider,
  SchemeSwitch,
  cssVariables,
  resolveScheme,
  selectedRing,
  useScheme,
} from '../../theme'
import { TableLineageDatasetNode } from '../../routes/table-level/TableLineageDatasetNode'
import { act, fireEvent, render } from '@testing-library/react'
import TableLineageJobNode from '../../routes/table-level/TableLineageJobNode'

describe('resolveScheme', () => {
  it('takes the URL first', () => {
    expect(resolveScheme({ urlParam: 'xebia', stored: 'light', prefersLight: true })).toBe('xebia')
  })

  it('then the stored choice', () => {
    expect(resolveScheme({ urlParam: null, stored: 'light', prefersLight: false })).toBe('light')
    expect(resolveScheme({ urlParam: 'bogus', stored: 'xebia', prefersLight: true })).toBe('xebia')
  })

  it('then prefers-color-scheme between Dark and Light', () => {
    expect(resolveScheme({ prefersLight: true })).toBe('light')
    expect(resolveScheme({ stored: 'nope', prefersLight: false })).toBe('dark')
  })

  it('is Dark with nothing to go on, never Xebia', () => {
    expect(resolveScheme({})).toBe('dark')
    expect(resolveScheme({ urlParam: null, stored: null, prefersLight: null })).toBe('dark')
  })
})

describe('scheme tokens', () => {
  it('uses a blue accent in Dark and Light, magenta only in Xebia', () => {
    expect(SCHEMES.dark.accent).toBe('#5aa2e6')
    expect(SCHEMES.light.accent).toBe('#2f6fb3')
    expect(SCHEMES.xebia.accent).toBe('#E331D0')
  })

  it('gives every scheme the same token names', () => {
    const keys = Object.keys(SCHEMES.dark).sort()
    SCHEME_NAMES.forEach((n) => expect(Object.keys(SCHEMES[n]).sort()).toEqual(keys))
  })

  it('maps tokens to --axis-* CSS variables', () => {
    const vars = cssVariables(SCHEMES.dark)
    expect(vars['--axis-canvas']).toBe('#1e2127')
    expect(vars['--axis-card-header']).toBe('#2b2f37')
    expect(vars['--axis-scheme']).toBeUndefined()
  })

  it('draws the selection ring in the accent, outside a gap in the canvas colour', () => {
    expect(selectedRing(SCHEMES.xebia)).toBe(
      '0 0 0 3px #0e0718, 0 0 0 5px #E331D0, 0 0 18px rgba(227,49,208,.45)'
    )
  })
})

const ShowScheme = () => <span data-testid='scheme'>{useScheme().scheme}</span>

const app = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <SchemeProvider>
        <SchemeSwitch />
        <ShowScheme />
      </SchemeProvider>
    </MemoryRouter>
  )

describe('SchemeProvider', () => {
  beforeEach(() => window.localStorage.clear())

  it('defaults to Dark and marks <html>', () => {
    const { getByTestId } = app('/')
    expect(getByTestId('scheme').textContent).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(document.documentElement.style.getPropertyValue('--axis-canvas')).toBe('#1e2127')
  })

  it('remembers a choice from the switch', () => {
    const { getByTestId, container } = app('/')
    act(() => {
      fireEvent.click(container.querySelector('[data-scheme=light]') as Element)
    })
    expect(getByTestId('scheme').textContent).toBe('light')
    expect(window.localStorage.getItem(SCHEME_STORAGE_KEY)).toBe('light')
  })

  it('reads the stored choice, and lets ?theme= win over it', () => {
    window.localStorage.setItem(SCHEME_STORAGE_KEY, 'light')
    expect(app('/').getByTestId('scheme').textContent).toBe('light')
    expect(app('/?theme=xebia').getAllByTestId('scheme')[1].textContent).toBe('xebia')
  })
})

const catalog = parseLayerCatalog(DESIGN_CATALOG).catalog as LayerCatalog
const ALL_ON: LayerView = { catalog, active: new Set(['wave', 'orchestrator', 'complexity']) }
const JOB_FACETS = {
  jobType: { integration: 'ORACLE', jobType: 'procedure' },
  ...axisLayers({ wave: 1, orchestrator: 'oracle', complexity: 0.5 }),
}

const inScheme = (scheme: SchemeName, ui: React.ReactElement, path: string) =>
  render(
    <SchemeContext.Provider value={{ scheme, tokens: SCHEMES[scheme], setScheme: () => undefined }}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path='/lineage/:nodeType/:namespace/:name' element={<svg>{ui}</svg>} />
        </Routes>
      </MemoryRouter>
    </SchemeContext.Provider>
  )

const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16)
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`
}

describe.each(SCHEME_NAMES)('nodes in the %s scheme', (scheme) => {
  const t = SCHEMES[scheme]

  it('draws a selected job in the scheme, keeping the wave border', () => {
    const node = {
      id: 'job:oracle:etl.load_sales',
      kind: 'JOB' as const,
      width: 180,
      height: 64,
      bottomLeftCorner: { x: 0, y: 0 },
      data: {
        job: {
          name: 'etl.load_sales',
          namespace: 'oracle',
          latestRun: null,
          facets: JOB_FACETS,
        } as unknown as LineageJob,
        jobType: jobTypeOf(JOB_FACETS),
        marks: resolveNodeMarks(ALL_ON, 'job', JOB_FACETS),
      },
    }
    const { container } = inScheme(
      scheme,
      <TableLineageJobNode node={node} />,
      '/lineage/job/oracle/etl.load_sales'
    )
    const card = container.querySelector('[data-testid=job-card]') as HTMLElement
    expect(card.style.border).toBe('1px solid #3fa7d6') // the data colour, in every scheme
    expect(card.style.boxShadow).toContain(`0 0 0 5px ${t.accent}`)
    expect(card.style.color).toBe(rgb(t.text))
  })

  it('draws a dataset without layers on the scheme card and line colours', () => {
    const node = {
      id: 'dataset:oracle:dw.fact_sales',
      kind: 'DATASET' as const,
      width: 190,
      height: 100,
      bottomLeftCorner: { x: 0, y: 0 },
      data: {
        dataset: {
          name: 'dw.fact_sales',
          namespace: 'oracle',
          type: 'DB_TABLE',
          fields: [{ name: 'id', type: 'NUMBER', tags: [], description: '' }],
          facets: {},
        } as unknown as LineageDataset,
        marks: { markers: [] },
        showFields: true,
      },
    }
    const { container } = inScheme(
      scheme,
      <TableLineageDatasetNode node={node} />,
      '/lineage/dataset/oracle/other'
    )
    const card = container.querySelector('[data-testid=dataset-card]') as HTMLElement
    expect(card.style.border).toBe(`1px solid ${t.line}`)
    expect(card.style.background).toBe(rgb(t.card))
    expect(card.dataset.selected).toBe('false')
  })
})
