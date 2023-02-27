import { app, BrowserWindow, Menu, ipcMain, ipcRenderer } from "electron";
import * as path from "path";

async function CreateMainWindow() {
  const mainWindow = new BrowserWindow({
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
    width: 1280,
    height: 720
  })
  const menu = Menu.buildFromTemplate([
    {
      label: app.name,
      submenu: [
        {
          click: () => mainWindow.webContents.send('function-1', 1),
          label: 'function-1',
        },
        {
          click: () => mainWindow.webContents.send('function-2', 1),
          label: 'function-2',
        },
        {
          click: () => {
            mainWindow.reload()
          },
          label: 'Reload',
        },
        {
          click: () => mainWindow.webContents.openDevTools(),
          label: 'Open Console',
        }
      ]
    }
  ])
  mainWindow.webContents.openDevTools()
  Menu.setApplicationMenu(menu)
  await mainWindow.webContents.session.setProxy(
    { proxyRules: "socks5://127.0.0.1:7890" }
  )
  await mainWindow.loadURL("https://www.pixiv.net/tags/%E5%B0%BB/artworks")
}

(async function name() {
  await app.whenReady()
  await CreateMainWindow()
  app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit()
  })
})()
