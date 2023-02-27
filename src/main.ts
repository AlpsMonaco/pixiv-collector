import { app, BrowserWindow, Menu, ipcMain, ipcRenderer } from "electron";
import * as path from "path";



async function CreateMainWindow() {
  const mainWindow = new BrowserWindow({
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
    width: 1024,
    height: 768
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
            let subwindow = new BrowserWindow({
              parent: mainWindow,
              modal: true,
            })
            subwindow.loadFile(
              path.join(path.dirname(__dirname), 'index.html')
            )
          },
          label: 'function-3',
        },
        {
          click: () => mainWindow.webContents.openDevTools(),
          label: 'Open Console',
        }
      ]
    }
  ])
  Menu.setApplicationMenu(menu)
  mainWindow.webContents.openDevTools()
  async function DevtoolsOpened() {
    return new Promise<void>((resolve: () => void) => {
      mainWindow.webContents.on('devtools-opened', function () {
        resolve()
      })
    })
  }
  await DevtoolsOpened()
  await mainWindow.loadURL("https://www.youdao.com/")
  mainWindow.webContents.send('test')
}

(async function name() {
  await app.whenReady()
  await CreateMainWindow()
  app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit()
  })
})()
