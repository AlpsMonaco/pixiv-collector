import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron"

export interface Image {
  url: string,
  src: string
}

function Sleep(ms: number) {
  return new Promise<void>(
    resolve => { setTimeout(resolve, ms) }
  )
}

async function GetImageList(): Promise<Array<Image>> {
  let url_list: Array<Image> = []
  const artwork_regex = new RegExp("^.+artworks/[0-9]+$")
  document.querySelectorAll("a").forEach(
    (a, _) => {
      if (artwork_regex.test(a.href) && a.firstChild?.firstChild != undefined) {
        let thumb = <HTMLImageElement>a.firstChild.firstChild
        for (let i = 0; i < 10; i++) {
          if (thumb.src === undefined)
            Sleep(100)
          else
            break
        }
        url_list.push({ url: a.href, src: thumb.src })
      }
    }
  )
  return url_list.slice(4)
}

async function ScrollToEnd() {
  for (; ;) {
    if (document.body.scrollHeight == 0)
      await Sleep(1000)
    else
      break
  }
  const scroll_step = 10
  for (let i = 0; i < document.body.scrollHeight;) {
    i += scroll_step;
    window.scrollBy(0, scroll_step);
    await Sleep(scroll_step)
  }
}

ipcRenderer.on("get-image-list", (event: IpcRendererEvent, event_name: string) => {
  GetImageList().then(url_list => {
    event.sender.send(event_name, url_list)
  })
})

ipcRenderer.on('render-full-page', (evnet: IpcRendererEvent) => {
  ScrollToEnd().then(() => {
    evnet.sender.send('on-full-page-render')
  }
  )
})