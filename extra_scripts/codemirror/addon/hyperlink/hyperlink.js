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

  const shell = require('electron').shell
  const remote = require('electron').remote
  const mdurl = require('mdurl')
  const yOffset = 2

  const macOS = global.process.platform === 'darwin'
  const modifier = macOS ? 'metaKey' : 'ctrlKey'

  function emit() {
    remote.getCurrentWindow().webContents.send.apply(null, arguments)
  }

  class HyperLink {
    constructor(cm) {
      this.cm = cm
      this.lineDiv = cm.display.lineDiv

      this.onMouseDown = this.onMouseDown.bind(this)
      this.onMouseEnter = this.onMouseEnter.bind(this)
      this.onMouseLeave = this.onMouseLeave.bind(this)
      this.onMouseMove = this.onMouseMove.bind(this)

      this.tooltip = document.createElement('div')
      this.tooltipContent = document.createElement('div')
      this.tooltipIndicator = document.createElement('div')
      this.tooltip.setAttribute('class', 'CodeMirror-hover CodeMirror-matchingbracket CodeMirror-selected')
      this.tooltip.setAttribute('cm-ignore-events', 'true')
      this.tooltip.appendChild(this.tooltipContent)
      this.tooltip.appendChild(this.tooltipIndicator)
      this.tooltipContent.textContent = `${macOS ? 'Cmd(⌘)' : 'Ctrl(^)'} + click to follow link`

      this.lineDiv.addEventListener('mousedown', this.onMouseDown)
      this.lineDiv.addEventListener('mouseenter', this.onMouseEnter, {
        capture: true,
        passive: true
      })
      this.lineDiv.addEventListener('mouseleave', this.onMouseLeave, {
        capture: true,
        passive: true
      })
      this.lineDiv.addEventListener('mousemove', this.onMouseMove, {
        passive: true
      })
    }
    getUrl(el) {
      const className = el.className.split(' ')

      if (className.includes('cm-url')) {
        // multiple cm-url because of search term
        const cmUrlSpans = Array.from(el.parentNode.getElementsByClassName('cm-url'))
        const textContent = cmUrlSpans.length > 1 ? cmUrlSpans.map(span => span.textContent).join('') : el.textContent

        const match = /^\((.*)\)|\[(.*)\]|(.*)$/.exec(textContent)
        const url = match[1] || match[2] || match[3]

        // `:storage` is the value of the variable `STORAGE_FOLDER_PLACEHOLDER` defined in `browser/main/lib/dataApi/attachmentManagement`
        return /^:storage(?:\/|%5C)/.test(url) ? null : url
      }

      if (className.includes('cm-link')) {
        const link = `${el.textContent}:`
        const term = `${el.textContent}`

        for(const el of document.getElementsByClassName('cm-link')) {
          if(el.textContent === link) {
            return this.getUrl(el.nextElementSibling)
          }
          else if(el.className.includes('cm-deflist-term') && el.textContent === term) {
            const cmLine = el.parentElement.parentElement
            const line = cmLine.previousElementSibling.className.includes('CodeMirror-gutter-wrapper') ? cmLine.parentElement : cmLine
            const nextLine = line.nextElementSibling
            const urlEl = nextLine.getElementsByClassName('cm-url')[0]

            if(urlEl) {
              return this.getUrl(urlEl)
            }
            else {
              return null
            }
          }
        }
      }

      return null
    }
    onMouseDown(e) {
      const { target } = e
      if (!e[modifier]) {
        return
      }

      const url = this.getUrl(target)
      if (!url) {
        return
      }

      e.preventDefault()

      let match
      if((match = /^#(.*)$/.exec(url))) {
        const id = mdurl.encode(match[1])

        const lines = this.cm.getValue().split('\n')
        for(let i = 0, l = lines.length - 1; i < l; ++i) {
          const line = lines[i]

          if((match = /^#+\s+(.*)$/.exec(line)) && mdurl.encode(match[1]) === id) {
            return emit('line:jump', i)
          }
        }
      }
      else if((match = /^:note:([a-zA-Z0-9-]{20,36})$/.exec(url))) {
        emit('list:jump', match[1])
      }
      else if((match = /^:line:([0-9])/.exec(url))) {
        emit('line:jump', parseInt(match[1]))
      }
      else if((match = /^:tag:([\w]+)$/.exec(url))) {
        emit('dispatch:push', `/tags/${encodeURIComponent(match[1])}`)
      }
      else {
        shell.openExternal(url)
      }
    }
    onMouseEnter(e) {
      const { target } = e

      const url = this.getUrl(target)
      if (url) {
        if (e[modifier]) {
          target.classList.add('CodeMirror-activeline-background', 'CodeMirror-hyperlink')
        }
        else {
          target.classList.add('CodeMirror-activeline-background')
        }

        this.showInfo(target)
      }
    }
    onMouseLeave(e) {
      if (this.tooltip.parentElement === this.lineDiv) {
        e.target.classList.remove('CodeMirror-activeline-background', 'CodeMirror-hyperlink')

        this.lineDiv.removeChild(this.tooltip)
      }
    }
    onMouseMove(e) {
      if (this.tooltip.parentElement === this.lineDiv) {
        if (e[modifier]) {
          e.target.classList.add('CodeMirror-hyperlink')
        }
        else {
          e.target.classList.remove('CodeMirror-hyperlink')
        }
      }
    }
    showInfo(relatedTo) {
      const b1 = relatedTo.getBoundingClientRect()
      const b2 = this.lineDiv.getBoundingClientRect()
      const tdiv = this.tooltip

      tdiv.style.left = (b1.left - b2.left) + 'px'
      this.lineDiv.appendChild(tdiv)

      const b3 = tdiv.getBoundingClientRect()
      const top = b1.top - b2.top - b3.height - yOffset
      if (top < 0) {
        tdiv.style.top = (b1.top - b2.top + b1.height + yOffset) + 'px'
      }
      else {
        tdiv.style.top = top + 'px'
      }
    }
  }

  CodeMirror.defineOption('hyperlink', true, (cm) => {
    const addon = new HyperLink(cm)
  })
})