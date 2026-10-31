// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

/**
 * The Axis lineage UI's colour schemes. Dark is the default: neutral greys with one calm blue
 * accent. Light is the same approach on a light background. Xebia is for demo recordings only
 * (night band, magenta, velvet). Data colours (wave legend colours, the heat-map scale, vendor
 * marks) belong to the data and never change with the scheme.
 */

export type SchemeName = 'dark' | 'light' | 'xebia'

export const SCHEME_NAMES: SchemeName[] = ['dark', 'light', 'xebia']

export const SCHEME_LABELS: Record<SchemeName, string> = {
  dark: 'Dark',
  light: 'Light',
  xebia: 'Xebia (demo)',
}

export interface AxisTokens {
  scheme: SchemeName
  /** MUI palette mode the scheme builds on. */
  mode: 'dark' | 'light'
  /** Header band and the side navigation's logo cell. */
  night: string
  /** Page background outside the lineage canvas (MUI background.default). */
  page: string
  canvas: string
  dotGrid: string
  actionBar: string
  panel: string
  panelEntry: string
  panelShadow: string
  card: string
  cardHeader: string
  cardShadow: string
  meterRow: string
  rowLine: string
  line: string
  jobBg: string
  track: string
  text: string
  muted: string
  /** Selection ring, highlighted edges, the open Layers button, checkboxes. */
  accent: string
  /** Filled accents: switch tracks, the layer counter, the active scheme segment. */
  accentFill: string
  accentFillText: string
  /** The selection ring's soft glow. */
  ringGlow: string
  /** Edges off the selected node's flow. */
  edge: string
  /** The wave chip is the wave colour mixed into `chipBase` at `chipWeight`, text `chipText`. */
  chipBase: string
  chipWeight: number
  chipText: string
  drawer: string
  /** The Axis symbol's dots (its row stays Xebia magenta: it is the brand mark). */
  symbolDots: string
  /** Editor colours for syntax highlighting: VS Code Dark+ or Light+. */
  editor: 'dark-plus' | 'light-plus'
  font: string
  mono: string
}

const FONT =
  '"Suisse Intl", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif'
const MONO = '"JetBrains Mono", ui-monospace, Menlo, monospace'

/** Dark: the tokens of the approved themes mockup's `:root[data-theme="dark"]`. */
const DARK: AxisTokens = {
  scheme: 'dark',
  mode: 'dark',
  night: '#181a1f',
  page: '#1e2127',
  canvas: '#1e2127',
  dotGrid: '#2c3038',
  actionBar: '#1b1e24',
  panel: '#23262d',
  panelEntry: '#22262d',
  panelShadow: '0 12px 32px rgba(0,0,0,.45)',
  card: '#262a31',
  cardHeader: '#2b2f37',
  cardShadow: '0 6px 18px rgba(0,0,0,.30)',
  meterRow: '#22262d',
  rowLine: '#2c3038',
  line: '#363b45',
  jobBg: '#24282f',
  track: '#3a404a',
  text: '#d7dae0',
  muted: '#8b929e',
  accent: '#5aa2e6',
  accentFill: '#2f5f8f',
  accentFillText: '#ffffff',
  ringGlow: '0 0 14px rgba(90,162,230,.35)',
  edge: '#6b7280',
  chipBase: '#30353e',
  chipWeight: 0.45,
  chipText: '#ffffff',
  drawer: '#1b1e24',
  symbolDots: '#d7dae0',
  editor: 'dark-plus',
  font: FONT,
  mono: MONO,
}

/** Light: the same neutral approach on a light background. */
const LIGHT: AxisTokens = {
  scheme: 'light',
  mode: 'light',
  night: '#ffffff',
  page: '#f5f6f8',
  canvas: '#f5f6f8',
  dotGrid: '#dde1e6',
  actionBar: '#ffffff',
  panel: '#ffffff',
  panelEntry: '#f7f8fa',
  panelShadow: '0 8px 24px rgba(16,24,40,.12)',
  card: '#ffffff',
  cardHeader: '#f0f2f5',
  cardShadow: '0 2px 8px rgba(16,24,40,.08)',
  meterRow: '#f7f8fa',
  rowLine: '#eceef1',
  line: '#d3d8df',
  jobBg: '#ffffff',
  track: '#dfe3e8',
  text: '#1f2328',
  muted: '#5c6470',
  accent: '#2f6fb3',
  accentFill: '#2f6fb3',
  accentFillText: '#ffffff',
  ringGlow: '0 0 12px rgba(47,111,179,.30)',
  edge: '#9aa3af',
  chipBase: '#ffffff',
  chipWeight: 0.3,
  chipText: '#1f2328',
  drawer: '#ffffff',
  symbolDots: '#1f2328',
  editor: 'light-plus',
  font: FONT,
  mono: MONO,
}

/** Xebia (demo): the approved v16 mockup's look. */
const XEBIA: AxisTokens = {
  scheme: 'xebia',
  mode: 'dark',
  night: '#150027',
  page: '#191f26',
  canvas: '#0e0718',
  dotGrid: '#2a1f3a',
  actionBar: '#130b1d',
  panel: '#1a1027',
  panelEntry: '#170e22',
  panelShadow: '0 12px 32px rgba(0,0,0,.5)',
  card: '#1f1430',
  cardHeader: '#2a2038',
  cardShadow: '0 6px 18px rgba(0,0,0,.35)',
  meterRow: '#1b1229',
  rowLine: '#281d36',
  line: '#34274a',
  jobBg: '#171024',
  track: '#3a2f4a',
  text: '#ece6f2',
  muted: '#9a8fab',
  accent: '#E331D0',
  accentFill: '#831B84',
  accentFillText: '#ffffff',
  ringGlow: '0 0 18px rgba(227,49,208,.45)',
  edge: '#8f80a8',
  chipBase: '#2a2038',
  chipWeight: 0.45,
  chipText: '#ffffff',
  drawer: '#160d22',
  symbolDots: '#ece6f2',
  editor: 'dark-plus',
  font: FONT,
  mono: MONO,
}

export const SCHEMES: Record<SchemeName, AxisTokens> = { dark: DARK, light: LIGHT, xebia: XEBIA }

export const isSchemeName = (v: unknown): v is SchemeName =>
  typeof v === 'string' && (SCHEME_NAMES as string[]).includes(v)

/** The URL query parameter that picks a scheme, for recordings: `?theme=xebia`. */
export const SCHEME_PARAM = 'theme'
/** The localStorage key of the viewer's choice. */
export const SCHEME_STORAGE_KEY = 'axis.lineage.scheme'

/**
 * The scheme to use: the URL's `theme=` wins, then the stored choice, then the system's
 * `prefers-color-scheme` between Dark and Light; Dark otherwise. Xebia is never a default.
 */
export const resolveScheme = (opts: {
  urlParam?: string | null
  stored?: string | null
  prefersLight?: boolean | null
}): SchemeName => {
  if (isSchemeName(opts.urlParam)) return opts.urlParam
  if (isSchemeName(opts.stored)) return opts.stored
  return opts.prefersLight ? 'light' : 'dark'
}

/** The selection ring: outside the node's own (wave) border, in the scheme's accent. */
export const selectedRing = (t: AxisTokens) =>
  `0 0 0 3px ${t.canvas}, 0 0 0 5px ${t.accent}, ${t.ringGlow}`

/** CSS custom properties for a scheme, `--axis-<token>`, for :root. */
export const cssVariables = (t: AxisTokens): Record<string, string> => {
  const out: Record<string, string> = {}
  Object.entries(t).forEach(([key, value]) => {
    if (typeof value !== 'string' || key === 'scheme' || key === 'mode') return
    out[`--axis-${key.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())}`] = value
  })
  return out
}
