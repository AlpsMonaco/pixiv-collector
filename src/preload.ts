import { ipcRenderer } from "electron"

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
      (a, _) => {
        if (artwork_regex.test(a.href) && a.firstChild?.firstChild != undefined) {
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
  return
}

ipcRenderer.on('function-1', () => { Function1() })
ipcRenderer.on('function-2', () => { Function2() })