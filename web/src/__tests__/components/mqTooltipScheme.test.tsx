// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react'
import { MUI_THEMES } from '../../helpers/theme'
import { SCHEMES, SchemeName } from '../../theme/schemes'
import { ThemeProvider } from '@mui/material/styles'
import { fireEvent, render, screen } from '@testing-library/react'
import MQTooltip from '../../components/core/tooltip/MQTooltip'

const hex = (rgb: string) =>
  '#' +
  (rgb.match(/\d+/g) ?? [])
    .slice(0, 3)
    .map((n) => Number(n).toString(16).padStart(2, '0'))
    .join('')

describe('MQTooltip in each colour scheme', () => {
  it.each(['dark', 'light', 'xebia'] as SchemeName[])(
    "writes in the %s scheme's text colour, not white, so it reads on Light's pale tooltip",
    async (scheme) => {
      render(
        <ThemeProvider theme={MUI_THEMES[scheme]}>
          <MQTooltip title='A description'>
            <span>hover me</span>
          </MQTooltip>
        </ThemeProvider>
      )
      fireEvent.mouseOver(screen.getByText('hover me'))
      const tip = (await screen.findByRole('tooltip')).querySelector(
        '.MuiTooltip-tooltip'
      ) as HTMLElement
      expect(hex(getComputedStyle(tip).color)).toBe(SCHEMES[scheme].text.toLowerCase())
    }
  )
})
