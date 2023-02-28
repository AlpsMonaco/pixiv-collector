import { BrowserWindow, ipcMain, IpcMainEvent, ipcRenderer } from "electron"
import * as path from "path"
import { Image } from "./preload_master";

type ImageList = Array<Image>;

class Master {
  static readonly url_format = "https://www.pixiv.net/tags/{search_word}/artworks?p={page_num}"
  window: BrowserWindow
  constructor() {
    this.window = new BrowserWindow({
      webPreferences: {
        preload: path.join(__dirname, "preload_master.js")
      },
      width: 1920,
      height: 1080,
      show: false,
    })
    // this.window.webContents.openDevTools()
  }
  private async OnImageListReceived(search_word: string, page_num: number) {
    let event_name = search_word + "_" + page_num.toString()
    this.window.webContents.send('get-image-list', event_name)
    return (await new Promise<ImageList>(resolve => {
      ipcMain.on(event_name,
        (_listener: IpcMainEvent, url_list: ImageList) => {
          ipcMain.removeHandler(event_name)
          resolve(url_list)
        })
    }))
  }
  private async RenderFullPage() {
    this.window.webContents.send('render-full-page')
    await new Promise<void>(resolve => {
      ipcMain.on("on-full-page-render", () => { resolve() })
    })
  }
  async Read(search_word: string, page_num: number): Promise<ImageList> {
    let url = Master.url_format.replace("{search_word}", search_word).replace("{page_num}", page_num.toString())
    await this.window.loadURL(url)
    await this.RenderFullPage()
    return await this.OnImageListReceived(search_word, page_num)
  }
}

class Worker {
  window: BrowserWindow
  constructor() {
    this.window = new BrowserWindow({
      webPreferences: {
        preload: path.join(__dirname, "preload_worker.js")
      },
      show: false,
    })
  }
}

interface CrawlerConstrutOptions {
  search_word: string
  begin_page?: number
  end_page?: number
  work_number?: number
}

export class Crawler {
  search_word: string
  begin_page: number
  end_page: number
  work_number: number
  master: Master
  constructor(options: CrawlerConstrutOptions) {
    this.search_word = options.search_word
    this.begin_page = typeof options.begin_page == "number" ? options.begin_page : 1
    this.end_page = typeof options.end_page == "number" ? options.end_page : 1
    this.work_number = typeof options.work_number == "number" ? options.work_number : 1
    this.master = new Master()
  }

  async Start() {
    let url_list = await this.master.Read(this.search_word, this.begin_page)
    console.log(url_list)
  }
}