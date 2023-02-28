import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron"

function GetUrlList(): Array<string> {
  let url_list: Array<string> = []
  const artwork_regex = new RegExp("^.+artworks/[0-9]+$")
  console.dir(document.body)
  document.querySelectorAll("a").forEach(
    (a, _) => {
      if (artwork_regex.test(a.href) && a.firstChild?.firstChild != undefined) {
        url_list.push(a.href)
      }
    }
  )
  return url_list
}

ipcRenderer.on("parse-artworks", (event: IpcRendererEvent, event_name: string) => {
  let url_list = GetUrlList()
  console.log(url_list)
  event.sender.send(event_name, url_list)
})