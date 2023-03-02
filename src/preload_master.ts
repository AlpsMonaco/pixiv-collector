import { ipcRenderer, IpcRendererEvent } from "electron"

export interface ImageMeta {
  artwork_link: string
}

function Sleep(ms: number) {
  return new Promise<void>(
    resolve => { setTimeout(resolve, ms) }
  )
}

async function GetImageMetaList(): Promise<Array<ImageMeta>> {
  const url_list: Array<ImageMeta> = []
  const artwork_regex = new RegExp("^.+artworks/[0-9]+$")
  const anchor_element_list = document.querySelectorAll("a")
  for (let i = 0; i < anchor_element_list.length; i++) {
    const a = anchor_element_list[i]
    if (artwork_regex.test(a.href) && a.firstChild?.firstChild != undefined) {
      url_list.push({ artwork_link: a.href })
    }
  }
  return url_list.length > 4 ? url_list.slice(4) : []
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
    await Sleep(10)
  }
}

ipcRenderer.on("get-image-list", (event: IpcRendererEvent, event_name: string) => {
  GetImageMetaList()
    .then(image_meta_list => event.sender.send(event_name, image_meta_list))
    .catch(err => console.error(err))
})

ipcRenderer.on('render-full-page', (evnet: IpcRendererEvent) => {
  ScrollToEnd()
    .then(() => evnet.sender.send('on-full-page-render'))
    .catch(err => console.error(err))
})