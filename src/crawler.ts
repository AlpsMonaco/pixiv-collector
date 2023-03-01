import * as path from "path"
import { BrowserWindow, ipcMain, IpcMainEvent } from "electron"
import { ImageMeta } from "./preload_master";
import { ImageData } from "./preload_worker"

interface Image {
  image_meta: ImageMeta,
  image_data: ImageData
}

type ImageMetaList = Array<ImageMeta>
type ImageList = Array<Image>

interface Dispatcher {
  Next(): Image | null
}

class Worker {
  window: BrowserWindow
  id: string
  on_image_parsed: null | ((image_data: ImageData) => void) = null
  constructor() {
    this.window = new BrowserWindow({
      webPreferences: {
        preload: path.join(__dirname, "preload_worker.js")
      },
      show: false,
    })
    this.window.removeMenu()
    this.id = "worker-" + this.window.id.toString()
  }
  async ParseImage(image: Image): Promise<ImageData> {
    await this.window.loadURL(image.image_meta.artwork_link)
    return await new Promise<ImageData>(resolve => {
      this.on_image_parsed = resolve
      this.window.webContents.send("get-liked-number", this.id)
    })
  }
  async Start(dispatcher: Dispatcher) {
    ipcMain.on(this.id, (_event: IpcMainEvent, image_data: ImageData) => {
      if (this.on_image_parsed == null) throw "on_image_parsed is empty"
      this.on_image_parsed(image_data)
    })
    for (; ;) {
      const image = dispatcher.Next()
      if (image === null) break
      const image_data = await this.ParseImage(image)
      image.image_data = image_data
    }
    ipcMain.removeHandler(this.id)
  }
}

class Master {
  static readonly url_format = "https://www.pixiv.net/tags/{search_word}/artworks?p={page_num}"
  window: BrowserWindow
  id: string
  constructor() {
    this.window = new BrowserWindow({
      webPreferences: {
        preload: path.join(__dirname, "preload_master.js")
      },
      width: 1920,
      height: 1080,
      show: false,
    })
    this.window.removeMenu()
    this.id = "master-" + this.window.id.toString()
  }
  GetDispatcher(): Dispatcher {
    return {
      Next(): Image | null {
        return null
      }
    }
  }
  private async OnImageMetaListReceived(): Promise<ImageMetaList> {
    return (await new Promise<ImageMetaList>(resolve => {
      ipcMain.on(this.id, (_listener: IpcMainEvent, url_list: ImageMetaList) => {
        ipcMain.removeHandler(this.id)
        resolve(url_list)
      })
      this.window.webContents.send('get-image-list', this.id)
    }))
  }
  private async RenderFullPage() {
    this.window.webContents.send('render-full-page')
    await new Promise<void>(resolve => {
      ipcMain.on("on-full-page-render", () => { resolve() })
    })
  }
  async Parse(search_word: string, page_num: number): Promise<Dispatcher | null> {
    const url = Master.url_format.replace("{search_word}", search_word).replace("{page_num}", page_num.toString())
    await this.window.loadURL(url)
    await this.RenderFullPage()
    const image_meta_list = await this.OnImageMetaListReceived()
    if (image_meta_list.length == 0) return null
    const image_list: ImageList = []
    for (let i = 0; i < image_meta_list.length; i++) {
      image_list.push({
        image_data: { liked: -1 },
        image_meta: image_meta_list[i],
      })
    }
    return {
      Next(): Image | null {
        return null
      }
    }
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

  async Start(): Promise<void> {
    const dispatcher = await this.master.Parse(this.search_word, this.begin_page)
    if (dispatcher === null)
      return
  }
}