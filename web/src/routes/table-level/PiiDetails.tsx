// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { FieldRef, originLabel, useFieldOrigins } from './columnOrigins'
import { PiiShield } from './cardParts'
import { piiLabel } from './columnFacts'
import { useAxisTokens } from '../../theme'
import React from 'react'

/**
 * A PII column's lines in its tooltip: the kind, the agent's rationale (`axisPii`, when the
 * table has it) and where the values come from (its column lineage's upstream-most columns,
 * asked for when this first mounts, i.e. on the first hover).
 */
export const PiiDetails = ({
  kinds,
  rationale,
  column,
}: {
  kinds: string[]
  rationale?: string
  column: FieldRef
}) => {
  const t = useAxisTokens()
  return (
    <div data-testid='pii-details' style={{ maxWidth: 380, marginTop: 4, whiteSpace: 'normal' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <PiiShield label={piiLabel(kinds)} size={13} />
        {piiLabel(kinds)}
      </div>
      {rationale && (
        <div
          data-testid='pii-rationale'
          style={{ marginTop: 4, fontSize: 12, lineHeight: 1.4, fontStyle: 'italic' }}
        >
          {rationale}
        </div>
      )}
      <PiiSource column={column} mono={t.mono} />
    </div>
  )
}

const PiiSource = ({ column, mono }: { column: FieldRef; mono: string }) => {
  const origins = useFieldOrigins(column)
  const line = origins ? originLabel(origins) : ''
  if (!line) return null
  return (
    <div data-testid='pii-source' style={{ marginTop: 4, fontSize: 12, lineHeight: 1.4 }}>
      from <span style={{ fontFamily: mono }}>{line.slice('from '.length)}</span>
    </div>
  )
}
