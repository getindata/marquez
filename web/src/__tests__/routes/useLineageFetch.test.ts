// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { lineageFetchDepth } from '../../routes/table-level/collapse'
import { renderHook } from '@testing-library/react'
import { useLineageFetch } from '../../routes/table-level/useLineageFetch'

describe('useLineageFetch', () => {
  const setup = () => {
    const fetchLineage = jest.fn()
    const { rerender } = renderHook(
      ({ depth, isFull }: { depth: number; isFull: boolean }) =>
        useLineageFetch(fetchLineage, 'dataset', 'oracle', 't', lineageFetchDepth(depth, isFull)),
      { initialProps: { depth: 2, isFull: true } }
    )
    return { fetchLineage, rerender }
  }

  it('does not fetch again when Depth changes below the Full graph bound', () => {
    const { fetchLineage, rerender } = setup()
    expect(fetchLineage).toHaveBeenCalledTimes(1)
    expect(fetchLineage).toHaveBeenLastCalledWith('dataset', 'oracle', 't', 20)
    rerender({ depth: 3, isFull: true })
    rerender({ depth: 10, isFull: true })
    expect(fetchLineage).toHaveBeenCalledTimes(1)
  })

  it('fetches again when the request depth changes', () => {
    const { fetchLineage, rerender } = setup()
    rerender({ depth: 25, isFull: true }) // Depth asks for more than the bound
    expect(fetchLineage).toHaveBeenLastCalledWith('dataset', 'oracle', 't', 26)
    rerender({ depth: 25, isFull: false }) // same request depth: no fetch
    expect(fetchLineage).toHaveBeenCalledTimes(2)
    rerender({ depth: 3, isFull: false })
    expect(fetchLineage).toHaveBeenLastCalledWith('dataset', 'oracle', 't', 4)
    expect(fetchLineage).toHaveBeenCalledTimes(3)
  })
})
