import { ipcRenderer } from "electron"

function Sleep(ms: number) {
  return new Promise<void>(
    resolve => { setTimeout(resolve, ms) }
  )
}

function ImageToBase64(img: HTMLImageElement) {
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  ctx.drawImage(img as HTMLImageElement, 0, 0);
  return canvas.toDataURL("image/png");
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
async function GetImageData() {
  for (let i = 0; i < 10; i++) {
    if (document.querySelectorAll('ul').length == 0) {
      await Sleep(100)
    } else {
      break
    }
  }
  const ul_list = document.querySelectorAll('ul');
  const image_data: ImageData = {
    liked: -1,
    collection: -1,
    view: -1
  }
  for (let i = 0; i < ul_list.length; i++) {
    const ul = ul_list[i]
    if (ul.childElementCount == 3) {
      if (IsImageDataArea(ul)) {
        const image_data_nodes = ul.childNodes as NodeListOf<HTMLLIElement>
        image_data.liked = parseInt(image_data_nodes[0].innerText.replace(',', ''))
        image_data.collection = parseInt(image_data_nodes[1].innerText.replace(',', ''))
        image_data.view = parseInt(image_data_nodes[2].innerText.replace(',', ''))
        console.log(image_data)
        break
      }
    }
  }
  return image_data
}

function Function1() {
  const url_list: Array<string> = []
  const image_list: Array<any> = []
  const artwork_regex = new RegExp("^.+artworks/[0-9]+$")
  async function scroll() {
    for (let i = 0; i < document.body.scrollHeight;) {
      i += 20;
      window.scrollTo(0, i);
      await new Promise<void>((resolve) => { setTimeout(resolve, 10) })
    }
  }
  scroll().then(() => {
    document.querySelectorAll("a").forEach(
      (a) => {
        if (artwork_regex.test(a.href) && a.firstChild?.firstChild?.nodeName == "IMG") {
          url_list.push(a.href)
          image_list.push(a.firstChild.firstChild)
        }
      }
    )
    console.dir(url_list)
    console.dir(image_list)
  }).catch(err => console.error(err))
}

function Function2() {
  GetImageData()
    .then((data) => { console.log(data) })
    .catch(err => { console.error(err) })
}

ipcRenderer.on('function-1', () => { Function1() })
ipcRenderer.on('function-2', () => {
  document.querySelectorAll('img').forEach(a => {
    console.log(ImageToBase64(a))
  })
})