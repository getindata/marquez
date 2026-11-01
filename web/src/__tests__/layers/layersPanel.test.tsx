// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react'
import { FULL_CATALOG } from './fixtures'
import { LayerCatalog, LayersPanel, parseLayerCatalog } from '../../layers'
import { fireEvent, render } from '@testing-library/react'

const catalog = parseLayerCatalog(FULL_CATALOG).catalog as LayerCatalog

const renderPanel = (onToggle = jest.fn()) => {
  const { container } = render(
    <LayersPanel
      layers={catalog.layers}
      active={new Set(['zone', 'status'])}
      onToggle={onToggle}
      onClose={jest.fn()}
    />
  )
  const entry = (id: string) =>
    container.querySelector(`[data-layer="${id}"]`)?.closest('[data-testid="layer-entry"]') as
      | HTMLElement
      | undefined
  return { container, entry, onToggle }
}

describe('LayersPanel, the LAY-10 layers', () => {
  it('lists each new layer with its title, where it is drawn, and its checkbox state', () => {
    const { entry } = renderPanel()
    const slots = {
      zone: ['Data zone', 'chip', true],
      size: ['Table size', 'label', false],
      status: ['Migration status', 'status dot', true],
      decommission: ['Decommission candidate', 'marker', false],
    } as const
    for (const [id, [title, slot, on]] of Object.entries(slots)) {
      const e = entry(id)!
      expect(e.querySelector('label')?.textContent).toBe(`${title}${slot}`)
      expect((e.querySelector('input') as HTMLInputElement).checked).toBe(on)
    }
  })

  it('shows the zones as outlined chips in their colours', () => {
    const chips = Array.from(
      renderPanel().entry('zone')!.querySelectorAll('[data-testid="legend-tag"]')
    ) as HTMLElement[]
    expect(chips.map((c) => c.textContent)).toEqual(['staging', 'core', 'mart'])
    expect(chips[1].style.border).toBe('1px solid #8b5cf6')
  })

  it('shows the statuses as dots in their colours', () => {
    const dots = Array.from(
      renderPanel().entry('status')!.querySelectorAll('[data-testid="legend-status"]')
    ) as HTMLElement[]
    expect(dots.map((d) => d.parentElement?.textContent)).toEqual([
      'pending',
      'converted',
      'reconciled',
      'failed',
    ])
    expect(dots[2].style.background).toBe('rgb(34, 197, 94)')
  })

  it('shows the size range in bytes on the heat-map bar', () => {
    const text = renderPanel().entry('size')!.textContent
    expect(text).toContain('0 B')
    expect(text).toContain('10 GB+')
  })

  it('shows the decommission mark as drawn beside a name', () => {
    const e = renderPanel().entry('decommission')!
    expect(e.querySelector('[data-testid="legend-marker"]')).not.toBeNull()
    expect(e.textContent).toContain('beside the name of each flagged table')
  })

  it('toggles a layer by its checkbox', () => {
    const { entry, onToggle } = renderPanel()
    fireEvent.click(entry('size')!.querySelector('input')!)
    expect(onToggle).toHaveBeenCalledWith('size')
  })
})
