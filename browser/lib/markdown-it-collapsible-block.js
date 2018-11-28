'use strict'

import { blockquote } from './markdown-it-blockquote'

const parse = blockquote('?>', 'collapsible_block', (state, startLine, nextLine) => {
  let token

  token = state.push('collapsible_block_open', 'details', 1)
  token.map = [startLine, nextLine - 1]

  token = state.push('collapsible_block_summary_open', 'summary', 1)
  token.map = [startLine, startLine]

  state.md.block.tokenize(state, startLine, startLine + 1)

  token = state.push('collapsible_block_summary_close', 'summary', -1)

  state.md.block.tokenize(state, startLine + 1, nextLine)

  token = state.push('collapsible_block_close', 'details', -1)
})

module.exports = function collapsibleBlockPlugin (md) {
  md.block.ruler.before('paragraph', 'collapsible_block', parse, {
    alt: [ 'paragraph', 'reference', 'list' ]
  })
}
