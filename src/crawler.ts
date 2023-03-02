import * as path from "path"
import * as fs from "fs/promises"
import { BrowserWindow, ipcMain, IpcMainEvent } from "electron"
import { ImageMeta } from "./preload_master";
import { ImageData } from "./preload_worker"
import Log from "./log";

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

interface Task {
  image_src_url: string
  Done: (data: ImageData) => void
}

interface Dispatcher {
  Next(): Task | null
}

const is_show = false

function Sleep(ms: number) {
  return new Promise<void>(
    resolve => { setTimeout(resolve, ms) }
  )
}

class Worker {
  window: BrowserWindow
  id: string
  private readonly info_log_id: string
  private readonly error_log_id: string
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
    this.info_log_id = (this.id + "-info").toUpperCase()
    this.error_log_id = (this.id + "-error").toUpperCase()
  }
  async ParseImage(image_src_url: string): Promise<ImageData> {
    this.LogInfo("parsing image from url:" + image_src_url)
    // for (; ;) {
    try {
      this.LogInfo("loading url:" + image_src_url)
      await this.window.loadURL(image_src_url)
      this.LogInfo("load url done")
      // break
    } catch (err) {
      this.LogError("load url error\n" + JSON.stringify(err))
    }
    // }
    return await new Promise<ImageData>(resolve => {
      this.on_image_parsed = resolve
      this.window.webContents.send("get-image-data", this.id)
    })
  }
  async Start(dispatcher: Dispatcher) {
    ipcMain.on(this.id, (_event: IpcMainEvent, image_data: ImageData) => {
      if (this.on_image_parsed == null) throw "on_image_parsed is empty"
      this.on_image_parsed?.(image_data)
    })
    let count = 0
    for (; ;) {
      const task = dispatcher.Next()
      if (task === null) {
        this.LogInfo("no more task,stop")
        break
      }
      this.LogInfo("parsing image from: " + task.image_src_url)
      for (; ;) {
        const image_data = await this.ParseImage(task.image_src_url)
        if (image_data.collection == -1 && image_data.liked == -1 && image_data.view == -1) {
          this.LogError("get image data failed,waiting for 30s")
          await Sleep(30000)
          continue
        } else {
          this.LogInfo("get image data: " + JSON.stringify(image_data))
          task.Done(image_data)
          this.LogInfo("finish jobs:" + (++count).toString())
          break
        }
      }
    }
    ipcMain.removeHandler(this.id)
  }
  private LogInfo(content: string) {
    Log.Customize(this.info_log_id, content)
  }
  private LogError(content: string) {
    Log.Customize(this.error_log_id, content)
  }
}

class Master {
  static readonly url_format = "https://www.pixiv.net/tags/{search_word}/artworks?p={page_num}"
  window: BrowserWindow
  id: string
  private image_list: ImageList
  private readonly info_log_id: string
  private readonly error_log_id: string
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
    this.image_list = []
    this.info_log_id = (this.id + "-info").toUpperCase()
    this.error_log_id = (this.id + "-error").toUpperCase()
  }
  GetImageList(): ImageList {
    return this.image_list
  }
  private LogInfo(content: string) {
    Log.Customize(this.info_log_id, content)
  }
  private LogError(content: string) {
    Log.Customize(this.error_log_id, content)
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
    try {
      this.LogInfo("loading url " + url)
      await this.window.loadURL(url)
      this.LogInfo("load url done")
    } catch (err) {
      this.LogError("load url error\n" + JSON.stringify(err))
    }
    this.LogInfo("waiting for page full load")
    await this.RenderFullPage()
    this.LogInfo("page full loaded")
    const image_meta_list = await this.OnImageMetaListReceived()
    if (image_meta_list.length == 0) return null
    this.LogInfo("get image meta list" + JSON.stringify(image_meta_list))
    this.image_list = []
    for (let i = 0; i < image_meta_list.length; i++) {
      this.image_list.push({
        image_data: invalid_image_data,
        image_meta: image_meta_list[i],
      })
    }
    let cursor = 0
    const image_list = this.image_list
    return {
      Next(): Task | null {
        const index = cursor++
        if (index >= image_list.length) return null
        const image = image_list[index]
        return {
          image_src_url: image.image_meta.artwork_link,
          Done(data) {
            image.image_data = data
          }
        }
      },
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
    if (this.end_page < this.begin_page) this.end_page = this.begin_page
    this.work_number = typeof options.work_number == "number" ? options.work_number : 5
    this.master = new Master()
    for (let i = 0; i < this.work_number; i++) {
      this.worker_list.push(new Worker())
    }
  }

  async Start(): Promise<void> {
    Log.Info("start crawling: " + JSON.stringify({
      search_word: this.search_word,
      begin_page: this.begin_page,
      end_page: this.end_page,
      worker_num: this.work_number
    }))
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
      await fs.appendFile("result.json", JSON.stringify({ page: page, data: this.master.GetImageList() }, null, 4))
    }
    this.master.window.close()
    this.worker_list.forEach(worker => { worker.window.close() })
  }
}