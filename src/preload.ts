import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron"

function Function1() {
  let url_list: Array<string> = []
  let image_list: Array<any> = []
  let artwork_regex = new RegExp("^.+artworks/[0-9]+$")
  async function scroll() {
    for (let i = 0; i < document.body.scrollHeight;) {
      i += 20;
      window.scrollTo(0, i);
      await new Promise<void>((resolve) => { setTimeout(resolve, 10) })
    }
  }
  scroll().then(() => {
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
  })
}

function Function2() {

}


ipcRenderer.on('function-1', () => { Function1() })
ipcRenderer.on('function-2', () => { Function2() })

// contextBridge.exposeInMainWorld('electronAPI', {
//   handleCounter: (listener: (event: IpcRendererEvent, ...args: any[]) => void) => ipcRenderer.on('update-counter', listener)
// })