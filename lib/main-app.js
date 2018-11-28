const electron = require('electron')
const app = electron.app
const Menu = electron.Menu
const ipc = electron.ipcMain
// electron.crashReporter.start()
var ipcServer = null

var mainWindow = null

var shouldQuit = app.makeSingleInstance(function (commandLine, workingDirectory) {
  if (mainWindow) {
    if (process.platform === 'win32') {
      mainWindow.minimize()
      mainWindow.restore()
    }
    mainWindow.focus()
  }
  return true
})

if (shouldQuit) {
  app.quit()
}

app.on('window-all-closed', function () {
  app.quit()
})

app.on('ready', function () {
  mainWindow = require('./main-window')

  var template = require('./main-menu')
  var menu = Menu.buildFromTemplate(template)
  var touchBarMenu = require('./touchbar-menu')
  switch (process.platform) {
    case 'darwin':
      Menu.setApplicationMenu(menu)
      mainWindow.setTouchBar(touchBarMenu)
      break
    case 'win32':
      mainWindow.setMenu(menu)
      break
    case 'linux':
      Menu.setApplicationMenu(menu)
      mainWindow.setMenu(menu)
  }

  ipcServer = require('./ipcServer')
  ipcServer.server.start()
})

module.exports = app
