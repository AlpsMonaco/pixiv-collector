import * as path from "path"
import * as fs from "fs/promises"
import { BrowserWindow, ipcMain, IpcMainEvent } from "electron"
import { ImageMeta } from "./preload_master";
import { ImageData } from "./preload_worker"

interface Image {
  image_meta: ImageMeta,
  image_data: ImageData
}

const invalid_image_data = {
  liked: -1,
  collection: -1,
  view: -1
}

type ImageMetaList = Array<ImageMeta>
type ImageList = Array<Image>

interface Dispatcher {
  Next(): Image | null
  image_list: ImageList
}

const is_show = true

function Sleep(ms: number) {
  return new Promise<void>(
    resolve => { setTimeout(resolve, ms) }
  )
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
      show: is_show,
    })
    this.window.removeMenu()
    this.window.webContents.openDevTools()
    this.id = "worker-" + this.window.id.toString()
  }
  async ParseImage(image: Image): Promise<ImageData> {
    // let retry_number = 0
    for (; ;) {
      try {
        this.Log("loading url")
        await this.window.loadURL(image.image_meta.artwork_link)
        this.Log("load url done")
        break
      } catch (err) {
        this.Log("error occurs")
        break
        // retry_number++
        // if (retry_number >= 10) return invalid_image_data
        // await Sleep(1000)
      }
    }
    return await new Promise<ImageData>(resolve => {
      this.on_image_parsed = resolve
      this.window.webContents.send("get-image-data", this.id)
    })
  }
  async Start(dispatcher: Dispatcher) {
    ipcMain.on(this.id, (_event: IpcMainEvent, image_data: ImageData) => {
      console.log("on ipc main")
      if (this.on_image_parsed == null) throw "on_image_parsed is empty"
      this.on_image_parsed?.(image_data)
    })
    let count = 0
    for (; ;) {
      const image = dispatcher.Next()
      this.Log("parsing image", image)
      if (image === null) {
        this.Log("done")
        break
      }
      const image_data = await this.ParseImage(image)
      this.Log("get image data", image_data)
      image.image_data = image_data
      this.Log("finish jobs:", ++count)
    }
    ipcMain.removeHandler(this.id)
  }
  private Log(...args: any) {
    console.log(this.id, ...args)
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
      show: is_show,
    })
    this.window.removeMenu()
    this.id = "master-" + this.window.id.toString()
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
        image_data: invalid_image_data,
        image_meta: image_meta_list[i],
      })
    }
    let cursor = 0
    return {
      Next(): Image | null {
        const index = cursor++
        if (index >= image_list.length) return null
        return image_list[index]
      },
      image_list: image_list
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
  worker_list: Array<Worker> = []
  constructor(options: CrawlerConstrutOptions) {
    this.search_word = options.search_word
    this.begin_page = typeof options.begin_page == "number" ? options.begin_page : 1
    this.end_page = typeof options.end_page == "number" ? options.end_page : 1
    if (this.end_page > this.begin_page) this.end_page = this.begin_page
    this.work_number = typeof options.work_number == "number" ? options.work_number : 5
    this.master = new Master()
    for (let i = 0; i < this.work_number; i++) {
      this.worker_list.push(new Worker())
    }
  }

  async Start(): Promise<void> {
    for (let page = this.begin_page; page <= this.end_page; page++) {
      const dispatcher = await this.master.Parse(this.search_word, page)
      if (dispatcher === null)
        return
      const promise_list: Array<Promise<void>> = []
      for (let i = 0; i < this.worker_list.length; i++) {
        const worker = this.worker_list[i]
        promise_list.push(worker.Start(dispatcher))
      }
      for (let i = 0; i < promise_list.length; i++) {
        await promise_list[i]
      }
      await fs.appendFile("result.json", JSON.stringify({ page: page, data: dispatcher.image_list }))
    }
    this.master.window.close()
    this.worker_list.forEach(worker => { worker.window.close() })
  }
}