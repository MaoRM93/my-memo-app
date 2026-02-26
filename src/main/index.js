import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 320,
    height: 400,
    show: false,
    frame: false,             // 无边框
    transparent: true,        // 开启透明
    hasShadow: false,         // 去除系统阴影，防止黑边
    skipTaskbar: true,        // 不在任务栏显示
    backgroundMaterial: 'acrylic', // Windows 11 亚克力模糊效果
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  // 【核心修复】：换了一个全新的指令名，彻底废弃会导致鼠标穿透的旧逻辑
  ipcMain.on('toggle-pin-status', (event, isLocked) => {
    // 仅仅控制窗口是否置顶，绝对不使用 IgnoreMouseEvents
    if (isLocked) {
      mainWindow.setAlwaysOnTop(false) // 锁定：取消置顶，贴在桌面
    } else {
      mainWindow.setAlwaysOnTop(true)  // 解锁：置顶，方便操作
    }
  })

  ipcMain.on('toggle-auto-start', (event, enable) => {
    app.setLoginItemSettings({
      openAtLogin: enable,
      path: app.getPath('exe')
    })
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })
  createWindow()
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})