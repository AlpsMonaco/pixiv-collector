import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron"

function Function1() {
  let url_list: Array<string> = []
  let image_list: Array<any> = []
  let artwork_regex = new RegExp("^.+artworks/[0-9]+$")
  document.querySelectorAll("a").forEach(
    (a, _) => {
      if (artwork_regex.test(a.href) && a.firstChild?.firstChild != undefined) {
        url_list.push(a.href)
        image_list.push(a.firstChild.firstChild)
      }
    }
  )
  console.dir(url_list)
  console.dir(image_list)
}

function Function2() {

}


ipcRenderer.on('function-1', () => { Function1() })
ipcRenderer.on('function-2', () => { Function2() })

// contextBridge.exposeInMainWorld('electronAPI', {
//   handleCounter: (listener: (event: IpcRendererEvent, ...args: any[]) => void) => ipcRenderer.on('update-counter', listener)
// })