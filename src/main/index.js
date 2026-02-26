import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 320,
    height: 400,
    show: false,
    frame: false,             // 隐藏 Windows 默认的标题栏和边框
    transparent: true,        // 开启窗口透明（实现磨砂玻璃前提）
    hasShadow: false,         // 配合自绘阴影
    skipTaskbar: true,        // 不在任务栏显示，像个真正的小组件
    backgroundMaterial: 'acrylic', // Windows 11 的亚克力模糊效果
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      nodeIntegration: true,  // 允许在前端直接调用 IPC
      contextIsolation: false // 配合 nodeIntegration 使用
    }
  })

  // 监听前端发来的“锁定/解锁”请求，控制鼠标是否穿透
  const { ipcMain, app } = require('electron')
  ipcMain.on('set-ignore-mouse', (event, ignore) => {
    if (ignore) {
      mainWindow.setIgnoreMouseEvents(true, { forward: true })
      mainWindow.setAlwaysOnTop(false)
    } else {
      mainWindow.setIgnoreMouseEvents(false)
      mainWindow.setAlwaysOnTop(true)
    }
  })

  // 监听前端发来的“开机自启”请求
  ipcMain.on('toggle-auto-start', (event, enable) => {
    app.setLoginItemSettings({
      openAtLogin: enable,
      path: app.getPath('exe')
    })
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}


// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
