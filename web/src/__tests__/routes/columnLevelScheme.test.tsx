// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react'
import { ColumnLineageDatasetNode } from '../../routes/column-level/ColumnLineageDatasetNode'
import { ColumnLineageGraph } from '../../types/api'
import { MUI_THEMES } from '../../helpers/theme'
import { MemoryRouter } from 'react-router-dom'
import { SCHEMES } from '../../theme/schemes'
import { ThemeProvider } from '@mui/material/styles'
import { createElkNodes } from '../../routes/column-level/layout'
import { render } from '@testing-library/react'

const node = (id: string, field: string, out: string[]) => ({
  id,
  type: 'DATASET_FIELD',
  data: { namespace: 'oracle', dataset: 't', field, fieldType: 'NUMBER' } as any,
  inEdges: [],
  outEdges: out.map((d) => ({ origin: id, destination: d })),
})

describe('column-level view in the active colour scheme', () => {
  it('colours edges with the colours it is given', () => {
    const graph = {
      graph: [
        node('datasetField:oracle:t:a', 'a', ['datasetField:oracle:t:b']),
        node('datasetField:oracle:t:b', 'b', []),
      ],
    } as unknown as ColumnLineageGraph
    const { edges } = createElkNodes(graph, 'datasetField:oracle:t:a', {
      highlight: SCHEMES.light.accent,
      muted: '#999999',
    })
    expect(edges.map((e) => e.color)).toEqual([SCHEMES.light.accent])
  })

  it('draws a dataset node in the provider scheme, not the static Dark theme', () => {
    const datasetNode = {
      id: 'dataset:oracle:t',
      kind: 'dataset',
      width: 200,
      height: 60,
      bottomLeftCorner: { x: 0, y: 0 },
      data: { namespace: 'oracle', dataset: 't' },
    }
    const { container } = render(
      <ThemeProvider theme={MUI_THEMES.light}>
        <MemoryRouter>
          <svg>
            <ColumnLineageDatasetNode node={datasetNode as any} />
          </svg>
        </MemoryRouter>
      </ThemeProvider>
    )
    // the dataset icon takes the theme's primary colour: the Light accent, not Dark's
    const icon = container.querySelector('svg[data-icon=database]') as SVGElement
    expect(icon.getAttribute('color')).toBe(SCHEMES.light.accent)
  })
})
