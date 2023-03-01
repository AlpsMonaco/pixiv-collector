import { ipcRenderer, IpcRendererEvent } from "electron"

function Sleep(ms: number) {
  return new Promise<void>(
    resolve => { setTimeout(resolve, ms) }
  )
}

export interface ImageData {
  liked: number,
  collection: number,
  view: number
}

const target_regex_match = new RegExp("[0-9,]+")

function IsImageDataArea(ul: HTMLUListElement): boolean {
  ul.childNodes.forEach(
    c => {
      if (!target_regex_match.test((<HTMLLIElement>c).innerText))
        return false
    }
  )
  return true
}

function GetImageDataArea(ul_list: NodeListOf<HTMLUListElement>) {
  for (let i = 0; i < ul_list.length; i++) {
    const ul = ul_list[i]
    if (ul.childElementCount == 3) {
      if (IsImageDataArea(ul)) {
        return ul.childNodes as NodeListOf<HTMLLIElement>
      }
    }
  }
  return null
}

async function GetImageData() {
  const image_data: ImageData = {
    liked: -1,
    collection: -1,
    view: -1
  }
  for (let i = 0; i < 10; i++) {
    console.log(i + 1, "start")
    const ul_list = document.querySelectorAll('ul')
    if (ul_list.length == 0) {
      await Sleep(1000)
      continue
    } else {
      const li_list = GetImageDataArea(ul_list)
      if (li_list == null) {
        await Sleep(1000)
        continue
      }
      console.log("got image data area", li_list)
      image_data.liked = parseInt(li_list[0].innerText.replace(',', ''))
      image_data.collection = parseInt(li_list[1].innerText.replace(',', ''))
      image_data.view = parseInt(li_list[2].innerText.replace(',', ''))
      console.log(image_data)
      break
    }
  }
  return image_data
}

ipcRenderer.on('get-image-data', function (event: IpcRendererEvent, worker_id: string) {
  GetImageData()
    .then((image_data: ImageData) => { event.sender.send(worker_id, image_data) })
    .catch(err => console.error(err))
})
