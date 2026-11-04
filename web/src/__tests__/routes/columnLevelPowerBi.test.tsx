// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react'
import { ColumnLineageDatasetNode } from '../../routes/column-level/ColumnLineageDatasetNode'
import { MUI_THEMES } from '../../helpers/theme'
import { MemoryRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import { ThemeProvider } from '@mui/material/styles'
import { createStore } from 'redux'
import { render } from '@testing-library/react'
import ColumnLevelDrawer from '../../routes/column-level/ColumnLevelDrawer'

/** The column-level view draws a powerbi:// dataset with the Power BI mark, not the database icon. */

const PBI = 'powerbi://shop-report'

const renderNode = (namespace: string) =>
  render(
    <ThemeProvider theme={MUI_THEMES.xebia}>
      <MemoryRouter>
        <svg>
          <ColumnLineageDatasetNode
            node={
              {
                id: `dataset:${namespace}:t`,
                kind: 'dataset',
                width: 200,
                height: 60,
                bottomLeftCorner: { x: 0, y: 0 },
                data: { namespace, dataset: 't' },
              } as any
            }
          />
        </svg>
      </MemoryRouter>
    </ThemeProvider>
  )

const renderDrawer = (namespace: string) => {
  const store = createStore(() => ({
    dataset: { result: null, isLoading: true },
    columnLineage: { columnLineage: { graph: [] } },
  }))
  return render(
    <Provider store={store}>
      <ThemeProvider theme={MUI_THEMES.xebia}>
        <MemoryRouter
          initialEntries={[
            `/datasets/column-level/x/t?dataset=t&namespace=${encodeURIComponent(namespace)}`,
          ]}
        >
          <ColumnLevelDrawer />
        </MemoryRouter>
      </ThemeProvider>
    </Provider>
  )
}

const database = (container: HTMLElement) => container.querySelector('svg[data-icon=database]')
const mark = (container: HTMLElement) =>
  container.querySelector('[data-testid="powerbi-mark"] [data-glyph="powerbi"]')

describe('the Power BI mark in the column-level view', () => {
  it('draws a powerbi:// dataset node with the Power BI mark, not the database icon', () => {
    const { container } = renderNode(PBI)
    expect(mark(container)).toBeTruthy()
    expect(database(container)).toBeNull()
  })

  it('keeps the database icon on an Oracle dataset node', () => {
    const { container } = renderNode('oracle')
    expect(database(container)).toBeTruthy()
    expect(mark(container)).toBeNull()
  })

  it('heads the drawer of a powerbi:// dataset with the Power BI mark, not the database icon', () => {
    const { container } = renderDrawer(PBI)
    expect(mark(container)).toBeTruthy()
    expect(database(container)).toBeNull()
  })

  it('keeps the database icon in the drawer of an Oracle dataset', () => {
    const { container } = renderDrawer('oracle')
    expect(database(container)).toBeTruthy()
    expect(mark(container)).toBeNull()
  })
})
