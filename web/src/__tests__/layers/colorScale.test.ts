// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { HEAT_STOPS, heatColor, mix, scaleColor, scaleFraction } from '../../layers'

describe('heatColor', () => {
  it('hits each stop exactly', () => {
    expect(HEAT_STOPS.map(([t]) => heatColor(t))).toEqual([
      '#2563eb',
      '#06b6d4',
      '#22c55e',
      '#eab308',
      '#f97316',
      '#dc2626',
    ])
  })

  it('interpolates in RGB between stops', () => {
    // halfway between #2563eb (37,99,235) and #06b6d4 (6,182,212)
    expect(heatColor(0.1)).toBe('#168de0')
  })

  it('clamps below 0, above 1 and non-numbers', () => {
    expect(heatColor(-3)).toBe('#2563eb')
    expect(heatColor(7)).toBe('#dc2626')
    expect(heatColor(NaN)).toBe('#2563eb')
  })
})

describe('scaleFraction', () => {
  it('is linear over min..max', () => {
    expect(scaleFraction({ min: 0, max: 1 }, 0.64)).toBeCloseTo(0.64)
    expect(scaleFraction({ scale: 'linear', min: 10, max: 20 }, 15)).toBeCloseTo(0.5)
  })

  it('uses log1p over min..max for log scales', () => {
    const spec = { scale: 'log' as const, min: 0, max: 8400 }
    expect(scaleFraction(spec, 0)).toBe(0)
    expect(scaleFraction(spec, 8400)).toBe(1)
    expect(scaleFraction(spec, 420)).toBeCloseTo(Math.log1p(420) / Math.log1p(8400))
    expect(scaleFraction(spec, 12)).toBeLessThan(0.3)
  })

  it('clamps values outside the range', () => {
    expect(scaleFraction({ min: 0, max: 1 }, 1.7)).toBe(1)
    expect(scaleFraction({ min: 0, max: 1 }, -2)).toBe(0)
    expect(scaleFraction({ scale: 'log', min: 0, max: 100 }, 1e6)).toBe(1)
  })

  it('copes with an empty range', () => {
    expect(scaleFraction({ min: 5, max: 5 }, 5)).toBe(1)
    expect(scaleFraction({ min: 5, max: 5 }, 4)).toBe(0)
  })
})

describe('scaleColor and mix', () => {
  it('colours the hottest value red and the coldest blue', () => {
    const heat = { scale: 'log' as const, min: 0, max: 8400 }
    expect(scaleColor(heat, 8400)).toBe('#dc2626')
    expect(scaleColor(heat, 0)).toBe('#2563eb')
  })

  it('mixes like color-mix in srgb', () => {
    expect(mix('#ffffff', '#000000', 0.5)).toBe('#808080')
    expect(mix('#3fa7d6', '#2a2038', 1)).toBe('#3fa7d6')
    expect(mix('#3fa7d6', '#2a2038', 0)).toBe('#2a2038')
  })
})
