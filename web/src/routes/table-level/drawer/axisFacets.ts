// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

/**
 * The table drawer's data: the `axisDdl` and `axisMigration` dataset facets (design §7.4) and
 * the columns of the standard `schema` facet. Each reader returns null for a missing or
 * malformed facet, so the drawer hides that section instead of drawing an empty box.
 */

export interface AxisDdl {
  dialect: string
  language: string
  text: string
}

/** A rule's state; `unknown` when the facet gives none or one this UI does not know. */
export type RuleState = 'will_apply' | 'applied' | 'unknown'

const ruleState = (v: unknown): RuleState => (v === 'applied' || v === 'will_apply' ? v : 'unknown')

export interface MigrationRule {
  id: string
  category: string
  kind: string
  status: string
  title: string
  effect: string
  references: string[]
  state: RuleState
}

export interface MigrationColumn {
  name: string
  source: string
  target: string
  exact: boolean
}

export interface MigrationGap {
  name: string
  category: string
  note: string
}

export interface AxisMigration {
  target: string
  rules: MigrationRule[]
  columns: MigrationColumn[]
  gaps: MigrationGap[]
  targetDdl: string
  status: string
}

/** A column for the Columns tab: the target side is absent before a migration facet exists. */
export interface DrawerColumn {
  name: string
  source: string
  target?: string
  exact?: boolean
}

type Facets = Record<string, unknown>

const str = (v: unknown): string => (typeof v === 'string' ? v : '')
const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])

const facet = (facets: unknown, name: string): Record<string, unknown> | null => {
  if (!isObject(facets)) return null
  const f = (facets as Facets)[name]
  return isObject(f) ? f : null
}

export const readAxisDdl = (facets: unknown): AxisDdl | null => {
  const f = facet(facets, 'axisDdl')
  const text = str(f?.text)
  if (!f || !text.trim()) return null
  return { dialect: str(f.dialect), language: str(f.language) || 'sql', text }
}

export const readAxisMigration = (facets: unknown): AxisMigration | null => {
  const f = facet(facets, 'axisMigration')
  if (!f) return null
  const rules = list(f.rules)
    .filter(isObject)
    .filter((r) => str(r.id))
    .map(
      (r): MigrationRule => ({
        id: str(r.id),
        category: str(r.category),
        kind: str(r.kind),
        status: str(r.status),
        title: str(r.title),
        effect: str(r.effect),
        references: list(r.references).map(str).filter(Boolean),
        state: ruleState(r.state),
      })
    )
  const columns = list(f.columns)
    .filter(isObject)
    .filter((c) => str(c.name))
    .map(
      (c): MigrationColumn => ({
        name: str(c.name),
        source: str(c.source),
        target: str(c.target),
        exact: c.exact === true,
      })
    )
  const gaps = list(f.gaps)
    .filter(isObject)
    .filter((g) => str(g.name))
    .map((g): MigrationGap => ({ name: str(g.name), category: str(g.category), note: str(g.note) }))
  return {
    target: str(f.target),
    rules,
    columns,
    gaps,
    targetDdl: str(f.targetDdl),
    status: str(f.status),
  }
}

/** One part of the header's status: its text, and whether it is a good or a bad outcome. */
export interface StatusPart {
  text: string
  tone: 'done' | 'failed' | 'plain'
}

const RECONCILE: Record<string, StatusPart> = {
  reconciled: { text: 'reconcile ✓', tone: 'done' },
  failed: { text: 'reconcile ✗', tone: 'failed' },
}

/**
 * The header's status: the conversion status of `axisMigration`, then the stage state of
 * `axisStatus` (design §7.4 header: "conversion and reconcile status"). A reconciled or failed
 * state reads "reconcile ✓" or "reconcile ✗", any other state is shown as given, and a state
 * both facets give is shown once.
 */
export const drawerStatus = (facets: unknown, migration: AxisMigration | null): StatusPart[] => {
  const parts: StatusPart[] = []
  const converted = migration?.status ?? ''
  if (converted) parts.push({ text: converted, tone: converted === 'converted' ? 'done' : 'plain' })
  const state = str(facet(facets, 'axisStatus')?.state)
  if (state && state !== converted) {
    parts.push(RECONCILE[state] ?? { text: state, tone: state === 'converted' ? 'done' : 'plain' })
  }
  return parts
}

/** The source columns of the standard `schema` facet, else the lineage node's fields. */
export const sourceColumns = (
  facets: unknown,
  fields: { name: string; type: string | null }[] = []
): DrawerColumn[] => {
  const schema = facet(facets, 'schema')
  const given = list(schema?.fields)
    .filter(isObject)
    .filter((c) => str(c.name))
    .map((c) => ({ name: str(c.name), source: str(c.type) }))
  if (given.length) return given
  return fields.map((c) => ({ name: c.name, source: c.type ?? '' }))
}

/**
 * The Columns tab's rows: the migration's type mapping when there is one (its source types
 * carry precision), each further schema column after it; else the source columns alone.
 */
export const drawerColumns = (
  source: DrawerColumn[],
  migration: AxisMigration | null
): DrawerColumn[] => {
  if (!migration || !migration.columns.length) return source
  const mapped = new Set(migration.columns.map((c) => c.name.toLowerCase()))
  return [
    ...migration.columns.map((c) => ({ ...c })),
    ...source.filter((c) => !mapped.has(c.name.toLowerCase())),
  ]
}

const VENDORS: Record<string, string> = {
  oracle: 'Oracle',
  databricks: 'Databricks',
  snowflake: 'Snowflake',
  bigquery: 'BigQuery',
  postgres: 'PostgreSQL',
  postgresql: 'PostgreSQL',
}

/** `oracle` → `Oracle`; an unknown platform keeps its name with a capital. */
export const platformLabel = (id: string) =>
  VENDORS[id.toLowerCase()] ?? (id ? id.charAt(0).toUpperCase() + id.slice(1) : '')

/** A link's label: its host without `www.`, e.g. `docs.oracle.com`. */
export const referenceLabel = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/** `PARTITION BY RANGE (d) → CLUSTER BY (d)` splits into before and after; else null. */
export const splitEffect = (effect: string): [string, string] | null => {
  const parts = effect.split(/\s+→\s+/)
  return parts.length === 2 && parts[0] && parts[1] ? [parts[0], parts[1]] : null
}
