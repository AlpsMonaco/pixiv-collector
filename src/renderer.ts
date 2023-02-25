const counter = document.getElementById('counter')

interface Window {
  electronAPI: any;
}

interface Event {
  sender: { send: (arg0: any, arg1: any) => void }
}

window.electronAPI.handleCounter((event: Event, value: number) => {
  const oldValue = Number(counter.innerText)
  const newValue = oldValue + value
  counter.innerText = newValue.toString()
  event.sender.send('counter-value', newValue)
})