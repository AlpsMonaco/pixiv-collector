import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron"

function Function1() {
  alert("test")
}

function Function2() {

}


ipcRenderer.on('function-1', () => { Function1() })
ipcRenderer.on('function-2', () => { Function2() })

// contextBridge.exposeInMainWorld('electronAPI', {
//   handleCounter: (listener: (event: IpcRendererEvent, ...args: any[]) => void) => ipcRenderer.on('update-counter', listener)
// })