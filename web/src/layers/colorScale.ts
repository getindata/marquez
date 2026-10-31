// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

/**
 * The natural heat map every `scale` layer is drawn on (Axis lineage layers design §4.2):
 * blue at 0, cyan, green, yellow, orange, red at 1, interpolated in RGB.
 */
export const HEAT_STOPS: ReadonlyArray<readonly [number, string]> = [
  [0, '#2563eb'],
  [0.2, '#06b6d4'],
  [0.4, '#22c55e'],
  [0.6, '#eab308'],
  [0.8, '#f97316'],
  [1, '#dc2626'],
]

type Rgb = [number, number, number]

export const hexToRgb = (hex: string): Rgb => {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.replace(/./g, (c) => c + c) : h
  const n = parseInt(full.slice(0, 6), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export const rgbToHex = ([r, g, b]: Rgb): string =>
  '#' +
  [r, g, b]
    .map((c) =>
      Math.max(0, Math.min(255, Math.round(c)))
        .toString(16)
        .padStart(2, '0')
    )
    .join('')

/** Mixes `a` into `b`: `weight` 1 gives `a`, 0 gives `b` (like CSS `color-mix(in srgb, a w%, b)`). */
export const mix = (a: string, b: string, weight: number): string => {
  const ca = hexToRgb(a)
  const cb = hexToRgb(b)
  return rgbToHex([0, 1, 2].map((i) => ca[i] * weight + cb[i] * (1 - weight)) as Rgb)
}

const clamp01 = (t: number) => (Number.isFinite(t) ? Math.min(1, Math.max(0, t)) : 0)

/** The heat-map colour at `t` in 0..1 (clamped), as `#rrggbb`. */
export const heatColor = (t: number): string => {
  const v = clamp01(t)
  for (let i = 1; i < HEAT_STOPS.length; i++) {
    const [b, cb] = HEAT_STOPS[i]
    if (v <= b) {
      const [a, ca] = HEAT_STOPS[i - 1]
      return mix(cb, ca, (v - a) / (b - a))
    }
  }
  return HEAT_STOPS[HEAT_STOPS.length - 1][1]
}

export interface ScaleSpec {
  scale?: 'linear' | 'log'
  min?: number
  max?: number
}

/**
 * Where `value` sits on a layer's range, 0..1, clamped. `log` scales use log1p over min..max,
 * so a query count of 0 is the coldest and the range's maximum the hottest.
 */
export const scaleFraction = ({ scale = 'linear', min = 0, max = 1 }: ScaleSpec, value: number) => {
  if (!Number.isFinite(value)) return 0
  const f = scale === 'log' ? (x: number) => Math.log1p(Math.max(x, 0)) : (x: number) => x
  const lo = f(min)
  const hi = f(max)
  if (hi <= lo) return value >= max ? 1 : 0
  return clamp01((f(value) - lo) / (hi - lo))
}

/** The heat-map colour of `value` on a layer's range. */
export const scaleColor = (spec: ScaleSpec, value: number) => heatColor(scaleFraction(spec, value))

/** CSS gradient of the heat map, for legends. */
export const HEAT_GRADIENT = `linear-gradient(90deg, ${HEAT_STOPS.map(([, c]) => c).join(', ')})`
