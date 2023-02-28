import { BrowserWindow, ipcMain, IpcMainEvent, ipcRenderer } from "electron"
import * as path from "path"

type UrlList = Array<string>;

class Master {
  static readonly url_format = "https://www.pixiv.net/tags/{search_word}/artworks?p={page_num}"
  window: BrowserWindow
  constructor() {
    this.window = new BrowserWindow({
      webPreferences: {
        preload: path.join(__dirname, "preload_master.js")
      },
      show: true
    })
    this.window.webContents.openDevTools()
  }
  async Read(search_word: string, page_num: number): Promise<UrlList> {
    let url = Master.url_format.replace("{search_word}", search_word).replace("{page_num}", page_num.toString())
    await this.window.loadURL(url)
    let event_name = search_word + "_" + page_num.toString()
    this.window.webContents.send('parse-artworks', event_name)
    let url_list = await new Promise<UrlList>(resolve => {
      ipcMain.on(event_name,
        (_listener: IpcMainEvent, url_list: UrlList) => {
          ipcMain.removeHandler(event_name)
          resolve(url_list)
        })
    })
    return url_list
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