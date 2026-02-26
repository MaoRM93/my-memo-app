import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'

// 【新增功能】：单实例锁 (Single Instance Lock)
// 防止用户多次双击快捷方式打开多个备忘录窗口
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  // 如果已经有一个实例在运行，直接退出当前新开的进程
  app.quit()
} else {
  let mainWindow

  function createWindow() {
    mainWindow = new BrowserWindow({
      width: 320,
      height: 400,
      show: false,
      frame: false,             // 无边框
      transparent: true,        // 开启透明
      hasShadow: false,         // 去除系统阴影
      skipTaskbar: true,        // 不在任务栏显示，保持小组件特性
      backgroundMaterial: 'acrylic', // Windows 11 亚克力模糊效果
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false,
        nodeIntegration: true,
        contextIsolation: false
      }
    })

    // 【新增指令】：只控制窗口是否全局置顶，不干扰鼠标穿透
    ipcMain.on('set-always-on-top', (event, isTop) => {
      if (mainWindow) {
        mainWindow.setAlwaysOnTop(isTop)
      }
    })

    // 【新增指令】：完全退出软件
    ipcMain.on('quit-app', () => {
      app.quit()
    })

    // 开机自启控制
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

  // 监听第二实例启动事件：当用户试图开第二个时，把第一个窗口唤醒
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.whenReady().then(() => {
    electronApp.setAppUserModelId('com.maorm.memo') // 统一AppId
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
}