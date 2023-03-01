const promise = new Promise<void>((resolve) => {
  console.log("1")
  setTimeout(resolve, 1000)
})

promise.then(() => { console.log("done") }).catch(err => console.error(err))