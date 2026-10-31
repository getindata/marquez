// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import * as fs from 'fs'
import * as path from 'path'

const read = (file: string) => fs.readFileSync(path.join(__dirname, '../..', file), 'utf-8')

describe('Xebia Axis branding', () => {
  it('titles the page Xebia Axis lineage', () => {
    expect(read('index.html')).toContain('<title>Xebia Axis lineage</title>')
    expect(read('index.prod.html')).toContain('<title>Xebia Axis lineage</title>')
    expect(read('components/App.tsx')).toContain("const TITLE = 'Xebia Axis lineage'")
  })

  it('writes Xebia Axis in the header, with no "by Xebia"', () => {
    const header = read('components/header/Header.tsx')
    expect(header).toMatch(/>\s*Xebia Axis\s*</)
    expect(header).toMatch(/>\s*lineage\s*</)
    expect(header).not.toMatch(/by\{' '\}/)
  })
})
