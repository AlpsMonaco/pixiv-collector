import { app, BrowserWindow, Menu, BrowserWindowConstructorOptions, Config as ProxyConfig } from "electron";
import * as path from "path";
import config from "./config"
import { Crawler } from "./crawler";

async function GetMainWindowConfig(): Promise<BrowserWindowConstructorOptions> {
  const main_window_config: BrowserWindowConstructorOptions = {
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: true
    },
  }
  const app_config = await config.Get()
  app_config.Match("number", app_config.window.height, () => { main_window_config.height = app_config.window.height })
  app_config.Match("number", app_config.window.width, () => { main_window_config.width = app_config.window.width })
  app_config.Match("number", app_config.window.x, () => { main_window_config.x = app_config.window.x })
  app_config.Match("number", app_config.window.y, () => { main_window_config.y = app_config.window.y })
  if (app_config.window.maxmized === true) main_window_config.show = false
  return main_window_config
}

async function GetProxyConfig(): Promise<ProxyConfig> {
  const proxy_config: ProxyConfig = {
    proxyRules: "socks5://127.0.0.1:7890"
  }
  // let app_config = await config.Get()
  // if (app_config.proxy.enable === true) {
  //   let protocol: string = ""
  //   app_config.AssignWhen("string", app_config.proxy.protocol, protocol)
  //   let addr: string = ""
  //   app_config.AssignWhen("string", app_config.proxy.address, addr)
  //   let port: number = 0
  //   app_config.AssignWhen("number", app_config.proxy.port, port)
  // }
  return proxy_config
}

async function CreateMenu(main_window: BrowserWindow) {
  const menu = Menu.buildFromTemplate([
    {
      label: app.name,
      submenu: [
        {
          click: () => main_window.webContents.send('function-1', 1),
          label: 'function-1',
        },
        {
          click: () => {
            main_window.webContents.send('function-2', 1)
          },
          label: 'function-2',
        },
        {
          click: () => {
            const crawler = new Crawler({ search_word: "ぶっかけ", begin_page: 20, end_page: 22, work_number: 10 })
            crawler.Start().then().catch(e => console.error(e))
          },
          label: 'function-3',
        },
        {
          click: () => {
            main_window.reload()
          },
          label: 'Reload',
        },
        {
          click: () => main_window.webContents.openDevTools(),
          label: 'Open Console',
        }
      ]
    }
  ])
  return menu
}

async function RegisterEvents(main_window: BrowserWindow) {
  const app_config = await config.Get()
  main_window.on("moved", () => {
    const positions = main_window.getPosition()
    app_config.window.x = positions[0]
    app_config.window.y = positions[1]
    config.Save().catch(err => console.error(err))
  })
  main_window.on('resized', () => {
    const size_list = main_window.getSize()
    app_config.window.width = size_list[0]
    app_config.window.height = size_list[1]
    config.Save().catch(err => console.error(err))
  })
  main_window.on('maximize', (/* ev: { sender: BrowserWindow } */) => {
    app_config.window.maxmized = true
    main_window.show()
    config.Save().catch(err => console.error(err))
  })
  main_window.on('unmaximize', () => {
    app_config.window.maxmized = false
    config.Save().catch(err => console.error(err))
  })
}

async function CreateMainWindow() {
  const main_window = new BrowserWindow(await GetMainWindowConfig())
  if ((await config.Get()).window.maxmized === true) {
    main_window.maximize()
  }
  await RegisterEvents(main_window)
  // main_window.webContents.openDevTools()
  Menu.setApplicationMenu(await CreateMenu(main_window))
  await main_window.webContents.session.setProxy(
    await GetProxyConfig()
  )
  await main_window.loadURL("https://www.pixiv.net/")
  // await main_window.loadFile(
  // "../index.html"
  // )
}

function RegisterAppEvents() {
  app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit()
  })
}

(async function () {
  RegisterAppEvents()
  await app.whenReady()
  await CreateMainWindow()
})().catch(err => console.error(err))
