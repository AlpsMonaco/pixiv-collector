import { ipcRenderer, IpcRendererEvent } from "electron"

export interface ImageData {
  liked: number
}

ipcRenderer.on('get-liked-number', function (event: IpcRendererEvent) {
  event.sender.send('on-get-liked-number')
})
