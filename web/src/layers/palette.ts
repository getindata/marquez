// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

/** The Axis lineage view's colours, from the approved mockup (v16). */
export const AXIS = {
  night: '#150027',
  canvas: '#0e0718',
  dotGrid: '#2a1f3a',
  actionBar: '#130b1d',
  panel: '#1a1027',
  panelEntry: '#170e22',
  card: '#1f1430',
  cardHeader: '#2a2038',
  meterRow: '#1b1229',
  rowLine: '#281d36',
  line: '#34274a',
  jobBg: '#171024',
  track: '#3a2f4a',
  text: '#ece6f2',
  muted: '#9a8fab',
  velvet: '#831B84',
  magenta: '#E331D0',
  edge: '#8f80a8',
  font: '"Suisse Intl", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, Menlo, monospace',
}

/** The ring around a selected node: outside its (wave) border, never instead of it. */
export const SELECTED_RING = `0 0 0 3px ${AXIS.canvas}, 0 0 0 5px ${AXIS.magenta}, 0 0 18px rgba(227,49,208,.45)`
