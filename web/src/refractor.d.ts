// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

/** refractor 3 ships no types: the part of its core the Side by side view uses. */
declare module 'refractor/core' {
  export interface RefractorText {
    type: 'text'
    value: string
  }
  export interface RefractorElement {
    type: 'element'
    tagName: string
    properties: { className?: string[] }
    children: RefractorNode[]
  }
  export type RefractorNode = RefractorText | RefractorElement
  const refractor: {
    highlight(value: string, language: string): RefractorNode[]
    register(grammar: unknown): void
    registered(language: string): boolean
  }
  export default refractor
}
