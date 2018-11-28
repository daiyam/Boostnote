const { app } = require('electron')
const ChildProcess = require('child_process')
const path = require('path')

var error = null

function execMainApp () {
  require('./lib/main-app')
}

execMainApp()
