// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

/** Node sizes of the table-level graph; the renderers draw exactly these, ELK lays them out. */
export const BORDER = 1

export const DATASET_WIDTH = 190
export const DATASET_HEADER_HEIGHT = 46
export const METER_ROW_HEIGHT = 20
export const FIELD_ROW_HEIGHT = 22
export const MORE_ROW_HEIGHT = 20
export const MAX_FIELD_ROWS = 4

export const JOB_WIDTH = 180
export const JOB_HEIGHT = 52
export const JOB_METER_HEIGHT = 12

/** Room around a node's box for the selection ring and glow, which ELK does not see. */
export const NODE_OVERHANG = 24

export const datasetHeight = (opts: {
  fieldCount: number
  showFields: boolean
  hasMeter: boolean
}) => {
  const rows = opts.showFields ? Math.min(opts.fieldCount, MAX_FIELD_ROWS) : 0
  const more = opts.showFields && opts.fieldCount > MAX_FIELD_ROWS ? MORE_ROW_HEIGHT : 0
  return (
    2 * BORDER +
    DATASET_HEADER_HEIGHT +
    (opts.hasMeter ? METER_ROW_HEIGHT : 0) +
    rows * FIELD_ROW_HEIGHT +
    more
  )
}

export const jobHeight = (hasMeter: boolean) => JOB_HEIGHT + (hasMeter ? JOB_METER_HEIGHT : 0)
