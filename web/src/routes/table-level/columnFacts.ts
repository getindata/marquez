// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

/**
 * What a table says about itself and its columns beyond the layers: its description (the
 * standard `documentation` facet, LAY-9) and its personal-data columns (the standard `tags`
 * facet's entries with `key: pii` and a `field`, LAY-10). Neither is a layer: they are always
 * shown when the data has them.
 */

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : '')

/** A table's description: the `documentation` facet's, else Marquez's own; '' when neither. */
export const datasetDescription = (dataset: { facets?: unknown; description?: unknown }) => {
  const doc = isObject(dataset.facets) ? dataset.facets.documentation : undefined
  return text(isObject(doc) ? doc.description : undefined) || text(dataset.description)
}

/**
 * The PII kinds of each column, by lower-cased column name: the `tags` facet's entries whose
 * key is `pii` (any case) and whose `field` names a column. An entry without a value is `pii`.
 */
export const piiColumns = (facets: unknown): Map<string, string[]> => {
  const out = new Map<string, string[]>()
  const facet = isObject(facets) ? facets.tags : undefined
  const tags = isObject(facet) && Array.isArray(facet.tags) ? facet.tags : []
  for (const tag of tags) {
    if (!isObject(tag) || text(tag.key).toLowerCase() !== 'pii') continue
    const field = text(tag.field).toLowerCase()
    if (!field) continue
    const kind = text(tag.value) || 'pii'
    const kinds = out.get(field) ?? []
    if (!kinds.includes(kind)) kinds.push(kind)
    out.set(field, kinds)
  }
  return out
}

/**
 * Why each column is PII, by lower-cased column name: the one-line rationale of LAY-10's
 * `axisPii` facet (`columns[].column`, `.rationale`). Empty without the facet.
 */
export const piiRationales = (facets: unknown): Map<string, string> => {
  const out = new Map<string, string>()
  const facet = isObject(facets) ? facets.axisPii : undefined
  const columns = isObject(facet) && Array.isArray(facet.columns) ? facet.columns : []
  for (const entry of columns) {
    if (!isObject(entry)) continue
    const column = text(entry.column).toLowerCase()
    const rationale = text(entry.rationale)
    if (column && rationale && !out.has(column)) out.set(column, rationale)
  }
  return out
}

/** "Personal data: email" or "Personal data: name, email". */
export const piiLabel = (kinds: string[]) => `Personal data: ${kinds.join(', ')}`
