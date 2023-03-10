import { promises as fs } from "fs"

interface Window {
  x?: number,
  y?: number,
  width?: number,
  height?: number,
  maxmized?: boolean
}

interface Proxy {
  enable?: boolean
  protocol?: "socks5" | "http"
  address?: string
  port?: number
}

class Config {
  window: Window
  proxy: Proxy
  open_devtools: false | true
  readonly file_path = "config.json"
  constructor() {
    this.window = {}
    this.proxy = {}
    this.open_devtools = false
  }
  Match(type_name: "number" | "string" | 'boolean', target: number | string | boolean | undefined, match_fn: () => void) {
    if (typeof target == type_name) match_fn()
  }
  async Read() {
    try {
      const config: { window?: Window, proxy?: Proxy, open_devtools?: boolean } = JSON.parse((await fs.readFile(this.file_path)).toString())
      if (typeof config.window == 'object') {
        this.window = config.window
      }
      if (typeof config.proxy == 'object') {
        this.proxy = config.proxy
      }
      if (typeof config.open_devtools == 'boolean')
        this.open_devtools = config.open_devtools
    } catch (e) {
      console.error(e)
    }
  }
  async Update() {
    try {
      await fs.writeFile(this.file_path, JSON.stringify({
        window: this.window,
        proxy: this.proxy,
        open_devtools: this.open_devtools,
      }))
    } catch (e) {
      console.error(e)
    }
  }
}

namespace config {
  let shared_config: Config | undefined
  export async function Get(): Promise<Config> {
    if (shared_config == undefined) {
      shared_config = new Config()
      await shared_config.Read()
    }
    return shared_config
  }
  export async function Save(): Promise<void> {
    await shared_config?.Update()
  }
}

export default config;