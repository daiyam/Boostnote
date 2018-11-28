import { Provider } from 'react-redux'
import Main from './Main'
import store from './store'
import React from 'react'
import ReactDOM from 'react-dom'
require('!!style!css!stylus?sourceMap!./global.styl')
import { Router, Route, IndexRoute, IndexRedirect, hashHistory } from 'react-router'
import { syncHistoryWithStore } from 'react-router-redux'
require('./lib/ipcClient')
require('../lib/customMeta')
import i18n from 'browser/lib/i18n'

const electron = require('electron')

const { remote, ipcRenderer } = electron
const { dialog } = remote

document.addEventListener('drop', function (e) {
  e.preventDefault()
  e.stopPropagation()
})
document.addEventListener('dragover', function (e) {
  e.preventDefault()
  e.stopPropagation()
})

// prevent menu from popup when alt pressed
// but still able to toggle menu when only alt is pressed
let isAltPressing = false
let isAltWithMouse = false
let isAltWithOtherKey = false
let isOtherKey = false

document.addEventListener('keydown', function (e) {
  if (e.key === 'Alt') {
    isAltPressing = true
    if (isOtherKey) {
      isAltWithOtherKey = true
    }
  } else {
    if (isAltPressing) {
      isAltWithOtherKey = true
    }
    isOtherKey = true
  }
})

document.addEventListener('mousedown', function (e) {
  if (isAltPressing) {
    isAltWithMouse = true
  }
})

document.addEventListener('keyup', function (e) {
  if (e.key === 'Alt') {
    if (isAltWithMouse || isAltWithOtherKey) {
      e.preventDefault()
    }
    isAltWithMouse = false
    isAltWithOtherKey = false
    isAltPressing = false
    isOtherKey = false
  }
})

document.addEventListener('click', function (e) {
  const className = e.target.className
  if (!className && typeof (className) !== 'string') return
  const isInfoButton = className.includes('infoButton')
  const offsetParent = e.target.offsetParent
  const isInfoPanel = offsetParent !== null
    ? offsetParent.className.includes('infoPanel')
    : false
  if (isInfoButton || isInfoPanel) return
  const infoPanel = document.querySelector('.infoPanel')
  if (infoPanel) infoPanel.style.display = 'none'
})

const el = document.getElementById('content')
const history = syncHistoryWithStore(hashHistory, store)

function notify (...args) {
  return new window.Notification(...args)
}

ReactDOM.render((
  <Provider store={store}>
    <Router history={history}>
      <Route path='/' component={Main}>
        <IndexRedirect to='/home' />
        <Route path='home' />
        <Route path='starred' />
        <Route path='trashed' />
        <Route path='alltags' />
        <Route path='tags'>
          <IndexRedirect to='/alltags' />
          <Route path=':tagname' />
        </Route>
        <Route path='storages'>
          <IndexRedirect to='/home' />
          <Route path=':storageKey'>
            <IndexRoute />
            <Route path='folders/:folderKey' />
          </Route>
        </Route>
      </Route>
    </Router>
  </Provider>
), el, function () {
  const loadingCover = document.getElementById('loadingCover')
  loadingCover.parentNode.removeChild(loadingCover)
})
