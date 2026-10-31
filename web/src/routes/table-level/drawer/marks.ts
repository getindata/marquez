// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { LayerCatalog, LayerNodeKind, NodeMarks, resolveNodeMarks } from '../../../layers'

/** The drawer's marks: every catalog layer, whatever the graph's Layers panel has on. */
export const allMarks = (
  catalog: LayerCatalog | null,
  kind: LayerNodeKind,
  facets: unknown
): NodeMarks =>
  resolveNodeMarks(
    { catalog, active: new Set(catalog ? catalog.layers.map((l) => l.id) : []) },
    kind,
    facets
  )
