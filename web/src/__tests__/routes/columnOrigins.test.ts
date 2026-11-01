// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { axisPii, columnLineage } from '../layers/fixtures'
import {
  clearFieldOriginCache,
  loadFieldOrigins,
  originLabel,
  upstreamOrigins,
} from '../../routes/table-level/columnOrigins'
import { piiRationales } from '../../routes/table-level/columnFacts'

const DIM = { namespace: 'oracle', dataset: 'bl_dm.dim_customers', field: 'customer_id' }

/** The passport number's way into the mart, as the Lupanava packages load it. */
const PASSPORT_FLOW = columnLineage({
  'bl_dm.dim_customers.customer_id': ['bl_3nf.ce_customers.customer_srcid'],
  'bl_3nf.ce_customers.customer_srcid': ['bl_cl.cls_customers.customer_id'],
  'bl_cl.cls_customers.customer_id': ['bl_cl.wrk_customers.passport_number'],
  'bl_dm.dim_customers.email': [],
})

const names = (refs: { dataset: string; field: string }[]) =>
  refs.map((r) => `${r.dataset}.${r.field}`)

describe('the upstream-most source columns of a field', () => {
  it('follow the column lineage to the fields nothing feeds', () => {
    expect(names(upstreamOrigins(PASSPORT_FLOW, DIM))).toEqual([
      'bl_cl.wrk_customers.passport_number',
    ])
  })

  it('are every root of a fan-in, once each, sorted', () => {
    const graph = columnLineage({
      'bl_dm.dim_customers.customer_id': ['s.b.y', 's.a.x'],
      's.b.y': ['s.a.x', 's.c.z'],
    })
    expect(names(upstreamOrigins(graph, DIM))).toEqual(['s.a.x', 's.c.z'])
  })

  it('are none when the field is its own origin, or not in the graph', () => {
    expect(upstreamOrigins(PASSPORT_FLOW, { ...DIM, field: 'email' })).toEqual([])
    expect(upstreamOrigins(PASSPORT_FLOW, { ...DIM, field: 'nope' })).toEqual([])
  })

  it('match the field whatever its case', () => {
    expect(names(upstreamOrigins(PASSPORT_FLOW, { ...DIM, field: 'CUSTOMER_ID' }))).toEqual([
      'bl_cl.wrk_customers.passport_number',
    ])
  })

  it('ignore a field reading itself (a MERGE that reads its target), and survive a cycle', () => {
    const graph = columnLineage({
      'bl_dm.dim_customers.customer_id': [
        'bl_dm.dim_customers.customer_id',
        'bl_3nf.ce_customers.customer_srcid',
      ],
      'bl_3nf.ce_customers.customer_srcid': ['bl_dm.dim_customers.customer_id'],
    })
    expect(upstreamOrigins(graph, DIM)).toEqual([])
    const selfOnly = columnLineage({
      'bl_dm.dim_customers.customer_id': ['bl_dm.dim_customers.customer_id'],
    })
    expect(upstreamOrigins(selfOnly, DIM)).toEqual([])
  })

  it('stop at an input the graph does not hold (past the depth), and take it as the origin', () => {
    const graph = columnLineage({ 'bl_dm.dim_customers.customer_id': ['far.away.col'] })
    graph.graph = graph.graph.filter((n) => !n.id.endsWith('far.away:col'))
    expect(names(upstreamOrigins(graph, DIM))).toEqual(['far.away.col'])
  })

  it('read nothing from a malformed body', () => {
    for (const bad of [
      undefined,
      null,
      'graph',
      { graph: 'x' },
      { graph: [null, 1, { data: null }, { data: { inputFields: 'x' } }] },
      { graph: [{ data: { ...DIM, inputFields: [null, { field: 1 }, 'x'] } }] },
    ]) {
      expect(upstreamOrigins(bad, DIM)).toEqual([])
    }
  })
})

describe('the source line', () => {
  const ref = (dataset: string, field: string) => ({ namespace: 'oracle', dataset, field })

  it('names the table (the last part of the dataset name) and the column', () => {
    expect(originLabel([ref('freepdb1.bl_cl_1st.table.wrk_customers', 'passport_number')])).toBe(
      'from wrk_customers.passport_number'
    )
  })

  it('names at most three, then counts the rest', () => {
    const refs = ['a', 'b', 'c', 'd', 'e'].map((t) => ref(`s.${t}`, 'x'))
    expect(originLabel(refs.slice(0, 3))).toBe('from a.x, b.x, c.x')
    expect(originLabel(refs.slice(0, 4))).toBe('from a.x, b.x, c.x + 1 more')
    expect(originLabel(refs)).toBe('from a.x, b.x, c.x + 2 more')
  })

  it('is empty without an origin', () => {
    expect(originLabel([])).toBe('')
  })
})

describe('loading the origins of a field', () => {
  const ok = (body: unknown) =>
    Promise.resolve({ ok: true, json: () => Promise.resolve(body) } as Response)
  let fetchMock: jest.Mock

  beforeEach(() => {
    clearFieldOriginCache()
    fetchMock = jest.fn(() => ok(PASSPORT_FLOW))
    global.fetch = fetchMock as unknown as typeof fetch
  })

  it("asks for the table's upstream column lineage, once per table, and caches each field", async () => {
    expect(names(await loadFieldOrigins(DIM))).toEqual(['bl_cl.wrk_customers.passport_number'])
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const url = String(fetchMock.mock.calls[0][0])
    expect(url).toContain('/api/v1/column-lineage?nodeId=dataset%3Aoracle%3Abl_dm.dim_customers')
    expect(url).toContain('withDownstream=false')
    expect(url).toMatch(/depth=\d+/)
    await loadFieldOrigins(DIM)
    await loadFieldOrigins({ ...DIM, field: 'email' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('gives no origin when the request fails, and does not ask again', async () => {
    fetchMock.mockImplementation(() => Promise.resolve({ ok: false, status: 404 } as Response))
    expect(await loadFieldOrigins(DIM)).toEqual([])
    fetchMock.mockImplementation(() => Promise.reject(new Error('offline')))
    expect(await loadFieldOrigins({ ...DIM, dataset: 'other.table' })).toEqual([])
    await loadFieldOrigins(DIM)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})

describe('the PII rationales', () => {
  it('read each column’s rationale from axisPii, by lower-cased column name', () => {
    const r = piiRationales(
      axisPii({ CUSTOMER_ID: ['passport', ' Carries the passport number. '], email: ['email', ''] })
    )
    expect(r.get('customer_id')).toBe('Carries the passport number.')
    expect(r.has('email')).toBe(false)
  })

  it('read nothing from a missing or malformed facet', () => {
    for (const facets of [
      undefined,
      null,
      {},
      { axisPii: null },
      { axisPii: { columns: 'x' } },
      { axisPii: { columns: [null, 1, { column: 2, rationale: 'x' }, { column: 'a' }] } },
      { axisPii: { columns: [{ column: 'a', rationale: { text: 'x' } }] } },
    ]) {
      expect(piiRationales(facets).size).toBe(0)
    }
  })
})
