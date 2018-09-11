(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../codemirror/lib/codemirror"), require("../codemirror/mode/gfm/gfm"))
  else if (typeof define == "function" && define.amd) // AMD
    define(["../codemirror/lib/codemirror", "../codemirror/mode/gfm/gfm"], mod)
  else // Plain browser env
    mod(CodeMirror)
})(function(CodeMirror) {
  'use strict'

  const blankLine = /^\s*$/
  const definitionRegex = /^\s*[:~]/

  function matchWithBlankLine(stream, regex) {
    let index = 0
    let line
    while ((line = stream.lookAhead(++index)) != null && blankLine.test(line)) {}

    return regex.test(line)
  }

  CodeMirror.defineMode('bfm', function (config, gfmConfig) {
    console.log(config)
    var bfmOverlay = {
      startState: function() {
        return {
          definitionTerm: false,
          definitionIndent: false
        }
      },
      copyState: function(s) {
        return {
          definitionTerm: s.definitionTerm,
          definitionIndent: s.definitionIndent
        }
      },
      token: function(stream, state) {
        if (state.definitionIndent) {
          state.definitionIndent = false

          stream.skipToEnd()

          return 'deflist deflist-def'
        }
        else if (state.definitionTerm) {
          if (stream.match(definitionRegex)) {
            state.definitionIndent = true

            stream.eatSpace()

            return 'deflist deflist-indent'
          }
          else {
            state.definitionTerm = false
          }
        }

        if (!state.definitionTerm && matchWithBlankLine(stream, definitionRegex)) {
          state.definitionTerm = true

          stream.skipToEnd()

          return 'deflist deflist-term'
        }

        stream.skipToEnd()
        return null
      },
      blankLine: function(state) {
        state.definition = false
        return null
      }
    }

    gfmConfig.name = 'gfm'
    return CodeMirror.overlayMode(CodeMirror.getMode(config, gfmConfig), bfmOverlay)
  }, 'gfm');

  CodeMirror.defineMIME('text/x-bfm', 'bfm')

  CodeMirror.modeInfo.push({
    name: "Boost Flavored Markdown",
    mime: "text/x-bfm",
    mode: "bfm"
  })
})