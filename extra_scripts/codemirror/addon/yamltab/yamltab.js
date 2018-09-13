(function (mod) {
  if (typeof exports === 'object' && typeof module === 'object') { // Common JS
    mod(require('../codemirror/lib/codemirror'))
  } else if (typeof define === 'function' && define.amd) { // AMD
    define(['../codemirror/lib/codemirror'], mod)
  } else { // Plain browser env
    mod(CodeMirror)
  }
})(function (CodeMirror) {
  'use strict'

  CodeMirror.commands.insertYamlTab = function (cm) {
    let spaces = []
    let ranges = cm.listSelections()

    let pos, col
    for (let i = 0; i < ranges.length; i++) {
      pos = ranges[i].from()
      col = countColumn(cm.getLine(pos.line), pos.ch, 2)
      spaces.push(spaceStr(2 - col % 2))
    }

    cm.replaceSelections(spaces)
  }

  /* functions from `CodeMirror/src/util/misc.js` */
  function countColumn(string, end, tabSize, startIndex, startValue) {
    if (end == null) {
      end = string.search(/[^\s\u00a0]/)
      if (end == -1) end = string.length
    }
    for (let i = startIndex || 0, n = startValue || 0;;) {
      let nextTab = string.indexOf("\t", i)
      if (nextTab < 0 || nextTab >= end)
        return n + (end - i)
      n += nextTab - i
      n += tabSize - (n % tabSize)
      i = nextTab + 1
    }
  }

  let spaceStrs = [""]
  function spaceStr(n) {
    while (spaceStrs.length <= n)
      spaceStrs.push(lst(spaceStrs) + " ")
    return spaceStrs[n]
  }

  function lst(arr) { return arr[arr.length-1] }
})
