const { app, BrowserWindow } = require('electron')
const { join } = require('path')

let appReady = false
let winReady = false
let stagedPic = null
let win = null

app.on('window-all-closed', () => {
  // noop
})

app.on('activate', () => {
  openPic()
})

// app.on('open-url', (e, url) => {
//   openPic(url)
// })
app.on('open-file', (e, url) => {
  openPic(url)
})

app.on('ready', () => {
  appReady = true

  if (process.env.NODE_ENV === 'development') {
    require('devtron').install()
  }

  if (stagedPic) {
    openPic(stagedPic)
    stagedPic = null
  } else {
    openPic()
  }

  // todo: windows
  // const url = process.argv[1]
  console.log('process.argv', process.argv)
})

function openPic (url) {
  if (!appReady) {
    // it would show on ready
    stagedPic = url
    return
  }
  if (win) {
    if (winReady) {
      win.show()
    } else {
      // it would show on ready
      stagedPic = url
    }
    return
  }
  win = new BrowserWindow({
    show: false,
    // transparent: true,
    // titleBarStyle: 'hidden-inset',
    // appearance-based, light, dark, titlebar, selection, menu,
    // popover, sidebar, medium-light or ultra-dark
    // vibrancy: 'light',
    backgroundColor: '#BBBBBB',
    width: 300,
    height: 300,
    webPreferences: {
      nodeIntegration: false,
      preload: join(__dirname, 'preload.js')
    }
  })
  win.once('closed', () => {
    winReady = false
    win = null
  })
  win.webContents.once('did-finish-load', () => {
    winReady = true
    let _url = url
    if (stagedPic) {
      _url = stagedPic
      stagedPic = null
    }
    if (_url) {
      win.webContents.send('show-url', _url)
    }
    win.show()
    // if (process.env.NODE_ENV === 'development') {
      win.webContents.openDevTools()
    // }
  })
  win.loadURL(`file://${join(__dirname, 'viewer.html')}?id=${win.id}`)
}
