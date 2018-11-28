import { isSpace } from 'markdown-it/lib/common/utils'

export function blockquote (prefix, parentRule, tokenize) {
  return function (state, startLine, endLine, silent) {
    let nextLine
    let lastLineEmpty
    let initial
    let offset
    let ch
    let i
    let l
    let terminate
    let pos = state.bMarks[startLine] + state.tShift[startLine]
    let max = state.eMarks[startLine]

    function isPrefixed () {
      if (state.src.substr(pos, prefix.length) === prefix) {
        pos += prefix.length

        return true
      }

      return false
    }

    // check the block quote marker
    if (!isPrefixed()) { return false }

    // we know that it's going to be a valid blockquote,
    // so no point trying to find the end of it in silent mode
    if (silent) { return true }

    // skip one optional space (but not tab, check cmark impl) after '>'
    if (state.src.charCodeAt(pos) === 0x20) { pos++ }

    const oldIndent = state.blkIndent
    state.blkIndent = 0

    // skip spaces after ">" and re-calculate offset
    initial = offset = state.sCount[startLine] + pos - (state.bMarks[startLine] + state.tShift[startLine])

    const oldBMarks = [ state.bMarks[startLine] ]
    state.bMarks[startLine] = pos

    while (pos < max) {
      ch = state.src.charCodeAt(pos)

      if (isSpace(ch)) {
        if (ch === 0x09) {
          offset += 4 - offset % 4
        } else {
          offset++
        }
      } else {
        break
      }

      pos++
    }

    lastLineEmpty = pos >= max

    const oldSCount = [ state.sCount[startLine] ]
    state.sCount[startLine] = offset - initial

    const oldTShift = [ state.tShift[startLine] ]
    state.tShift[startLine] = pos - state.bMarks[startLine]

    const terminatorRules = state.md.block.ruler.getRules(parentRule)

    // Search the end of the block
    //
    // Block ends with either:
    //  1. an empty line outside:
    //     ```
    //     > test
    //
    //     ```
    //  2. an empty line inside:
    //     ```
    //     >
    //     test
    //     ```
    //  3. another tag
    //     ```
    //     > test
    //      - - -
    //     ```
    for (nextLine = startLine + 1; nextLine < endLine; nextLine++) {
      if (state.sCount[nextLine] < oldIndent) { break }

      pos = state.bMarks[nextLine] + state.tShift[nextLine]
      max = state.eMarks[nextLine]

      if (pos >= max) {
        // Case 1: line is not inside the blockquote, and this line is empty.
        break
      }

      if (isPrefixed()) {
        // This line is inside the blockquote.

        // skip one optional space (but not tab, check cmark impl) after '>'
        if (state.src.charCodeAt(pos) === 0x20) { pos++ }

        // skip spaces after ">" and re-calculate offset
        initial = offset = state.sCount[nextLine] + pos - (state.bMarks[nextLine] + state.tShift[nextLine])

        oldBMarks.push(state.bMarks[nextLine])
        state.bMarks[nextLine] = pos

        while (pos < max) {
          ch = state.src.charCodeAt(pos)

          if (isSpace(ch)) {
            if (ch === 0x09) {
              offset += 4 - offset % 4
            } else {
              offset++
            }
          } else {
            break
          }

          pos++
        }

        lastLineEmpty = pos >= max

        oldSCount.push(state.sCount[nextLine])
        state.sCount[nextLine] = offset - initial

        oldTShift.push(state.tShift[nextLine])
        state.tShift[nextLine] = pos - state.bMarks[nextLine]
        continue
      }

      // Case 2: line is not inside the blockquote, and the last line was empty.
      if (lastLineEmpty) { break }

      // Case 3: another tag found.
      terminate = false
      for (i = 0, l = terminatorRules.length; i < l; i++) {
        if (terminatorRules[i](state, nextLine, endLine, true)) {
          terminate = true
          break
        }
      }
      if (terminate) { break }

      oldBMarks.push(state.bMarks[nextLine])
      oldTShift.push(state.tShift[nextLine])
      oldSCount.push(state.sCount[nextLine])

      // A negative indentation means that this is a paragraph continuation
      //
      state.sCount[nextLine] = -1
    }

    const oldParentType = state.parentType
    state.parentType = 'blockquote'

    tokenize(state, startLine, nextLine)

    state.parentType = oldParentType

    // Restore original tShift; this might not be necessary since the parser
    // has already been here, but just to make sure we can do that.
    for (i = 0; i < oldTShift.length; i++) {
      state.bMarks[i + startLine] = oldBMarks[i]
      state.tShift[i + startLine] = oldTShift[i]
      state.sCount[i + startLine] = oldSCount[i]
    }
    state.blkIndent = oldIndent

    return true
  }
}
