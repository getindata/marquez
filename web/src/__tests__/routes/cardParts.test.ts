// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { monoChars, tailFit } from '../../routes/table-level/cardParts'

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
