import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron"

contextBridge.exposeInMainWorld('electronAPI', {
  handleCounter: (listener: (event: IpcRendererEvent, ...args: any[]) => void) => ipcRenderer.on('update-counter', listener)
})