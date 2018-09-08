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

  CodeMirror.commands.deleteLine = function (cm) {
    if (cm.getOption('disableInput')) return CodeMirror.Pass
    var ranges = cm.listSelections()
    for (var i = 0; i < ranges.length; i++) {
      var range = ranges[i]
      if (range.to().line === cm.lastLine()) {
        cm.doc.replaceRange('', CodeMirror.Pos(range.from().line - 1, cm.doc.getLine(range.from().line - 1).length), cm.clipPos(CodeMirror.Pos(range.to().line + 1, 0)), '+delete')
      } else {
        cm.doc.replaceRange('', CodeMirror.Pos(range.from().line, 0), cm.clipPos(CodeMirror.Pos(range.to().line + 1, 0)), '+delete')
      }
    }
  }
})