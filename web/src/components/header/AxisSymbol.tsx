// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import React from 'react'

/**
 * The Axis symbol (getindata/axis `marketing/Axis_Symbol.svg`): its dark #150027 dots drawn
 * light for the dark header, the horizontal row in Xebia magenta.
 */
const DOTS: [number, number][] = [
  [29.66, 29.65],
  [48.6, 48.59],
  [105.41, 105.41],
  [124.35, 124.34],
  [77, 10],
  [77, 37],
  [77, 117],
  [77, 144],
  [124.35, 29.66],
  [105.41, 48.59],
  [48.6, 105.41],
  [29.66, 124.35],
]
const ROW = [144, 117, 90, 64, 37, 10]

export const AxisSymbol = ({ size = 26, light = '#ece6f2', accent = '#E331D0' }) => (
  <svg width={size} height={size} viewBox='0 0 154 154' role='img' aria-label='Axis'>
    <g fill={light}>
      {DOTS.map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={10} />
      ))}
    </g>
    <g fill={accent}>
      {ROW.map((cx) => (
        <circle key={cx} cx={cx} cy={77} r={10} />
      ))}
    </g>
  </svg>
)
