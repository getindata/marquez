// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { monoChars, nodeUrl, tailFit } from '../../routes/table-level/cardParts'

describe('tailFit', () => {
  it('keeps a name that fits', () => {
    expect(tailFit('dw.fact_sales', 19)).toBe('dw.fact_sales')
  })

  it('cuts from the front at a dot so the end of a long name shows', () => {
    expect(tailFit('freepdb1.bl_3nf.table.ce_customers', 19)).toBe('…table.ce_customers')
  })

  it('cuts mid-word when the last part alone is too long', () => {
    const name = 'freepdb1.bl_cl_2nd.package.pkg_etl_insert_products.insert_table_products'
    expect(tailFit(name, 16)).toBe('…_table_products')
    expect(tailFit(name, 16)).toHaveLength(16)
  })

  it('never returns more than the room it is given', () => {
    const name = 'a.b.c.d.e.f.g.h.i.j.k.l.m.n.o'
    for (let n = 2; n < name.length; n++) expect(tailFit(name, n).length).toBeLessThanOrEqual(n)
  })
})

describe('monoChars', () => {
  it('counts 0.6 em per character', () => {
    expect(monoChars(142, 12)).toBe(19)
    expect(monoChars(112, 11.5)).toBe(16)
    expect(monoChars(1, 12)).toBe(4)
  })
})

describe('nodeUrl', () => {
  it('keeps the current query, theme and layers included, and replaces tableLevelNode', () => {
    const current = new URLSearchParams(
      'theme=xebia&layers=wave,heat&depth=4&isFull=true&tableLevelNode=dataset:oracle:old'
    )
    const url = nodeUrl('job', 'oracle', 'etl.load sales', 'job:oracle:etl.load sales', current)
    const [path, query] = url.split('?')
    expect(path).toBe('/lineage/job/oracle/etl.load%20sales')
    const params = new URLSearchParams(query)
    expect(params.get('theme')).toBe('xebia')
    expect(params.get('layers')).toBe('wave,heat')
    expect(params.get('depth')).toBe('4')
    expect(params.get('isFull')).toBe('true')
    expect(params.getAll('tableLevelNode')).toEqual(['job:oracle:etl.load sales'])
    expect(current.get('tableLevelNode')).toBe('dataset:oracle:old') // not mutated
  })
})
