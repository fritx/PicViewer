const { remote, ipcRenderer } = require('electron')
// const { BrowserWindow } = remote
const sizeOf = require('image-size')

// const win = BrowserWindow.fromId(id)
const win = remote.getCurrentWindow()

if (process.env.NODE_ENV === 'development') {
  window.__devtron = {require: require, process: process}
}

let domReady = false
let stagedPic = null

ipcRenderer.on('show-url', (e, url) => {
  if (!domReady) {
    stagedPic = url
    return
  }
  displayPic(url)
})

document.addEventListener('DOMContentLoaded', () => {
  domReady = true

  let curPic = location.hash.substr(1)
  curPic = curPic && decodeURIComponent(curPic)

  if (stagedPic) {
    displayPic(stagedPic)
    stagedPic = null
  } else if (curPic) {
    displayPic(curPic)
  }

  // Possible to get local filesystem path from drag-and-drop file?
  // https://discuss.atom.io/t/possible-to-get-local-filesystem-path-from-drag-and-drop-file/28858
  document.ondragover = document.ondrop = (ev) => {
    ev.preventDefault()
  }
  document.body.ondrop = (ev) => {
    ev.preventDefault()
    const file = ev.dataTransfer.files[0]
    if (file) {
      const url = `file://${file.path}`
      displayPic(url)
    }
  }
})

function displayPic (url) {
  location.hash = encodeURIComponent(url)
  const img = document.querySelector('img')
  img.hidden = true
  Promise.all([
      getPicSize(url),
      loadImg(url),
    ])
    .then(([size]) => {
      const { width, height } = size
      const { ctnW, ctnH } = posPic(size)
      // fixme: get img tag size
      img.style.width = ''
      img.style.height = ''
      if (width > ctnW || height > ctnH) {
        const ratioW = width / ctnW
        const ratioH = height / ctnH
        if (ratioW > ratioH) {
          img.style.width = '100%'
        } else {
          img.style.height = '100%'
        }
      }
      img.src = url
      img.hidden = false
      win.show()
    })
    .catch(err => {
      console.error(err)
      alert(err.stack)
    })
}

function loadImg (url) {
  return new Promise((resolve, reject) => {
    const worker = document.createElement('img')
    worker.src = url
    worker.addEventListener('load', () => {
      resolve()
    })
    worker.addEventListener('abort', () => {
      reject(new Error(`img abort: ${url}`))
    })
    worker.addEventListener('error', () => {
      reject(new Error(`img error: ${url}`))
    })
  })
}

// calculate the window's position and size
// put it in the center of screen
function posPic ({ width, height }) {
  const id = location.search.match(/id=([^?&#]+)/)[1]
  if (!win) return

  // fixme: get the proper screen instead of primary one
  const { screen } = require('electron')
  const { workArea } = screen.getPrimaryDisplay()
  let { x: X, y: Y, width: workW, height: workH } = workArea

  // BrowserWindow useContentSize: true
  // minus the topbar height=22
  // http://stackoverflow.com/questions/2867503/height-of-the-apple-menubar
  const tH = 22

  // fixme: minWidth, minHeight
  // - position memorize
  // - proper size of img tag
  const [minW, minH] = [100, 100]
  const [maxW, maxH] = [workW, workH - tH]
  const { destW, destH } = scaleSize([width, height], [minW, minH], [maxW, maxH])
  const ctnW = Math.round(destW)
  const ctnH = Math.round(destH)
  const [winW, winH] = [ctnW, ctnH + tH]

  const x = Math.round(X + (workW - winW) / 2)
  const y = Math.round(Y + (workH - winH) / 2)

  // fixme: hide-show causes window flick
  // fix: hide-show avoid html repaint not flick
  win.hide()
  win.setPosition(x, y)
  win.setSize(winW, winH)
  // win.show()
  return { ctnW, ctnH }
}

// http://blog.fritx.me/?weekly/160903
function scaleSize ([srcW, srcH], [minW, minH], [maxW, maxH]) {
  let [destW, destH] = [srcW, srcH]
  let ratioWidth = maxW / srcW
  let ratioHeight = maxH / srcH
  const minRatio = Math.min(ratioWidth, ratioHeight)
  if (minRatio < 1) {
   destW *= minRatio
   destH *= minRatio
  } else {
    ratioWidth = minW / srcW
    ratioHeight = minH / srcH
    const maxRatio = Math.max(ratioWidth, ratioHeight)
    if (maxRatio > 1) {
     destW *= maxRatio
     destH *= maxRatio
    }
  }
  return {
    srcW, srcH,
    destW, destH,
  }
}

function getPicSize (url) {
  const file = url.replace(/^file:\/\//, '')
  return new Promise((resolve, reject) => {
    sizeOf(file, (err, size) => {
      if (err) {
        reject(err)
      } else {
        resolve(size)
      }
    })
  })
}

function sleep (ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}

