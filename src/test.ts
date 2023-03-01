function foo() {
  let i = 1
  return {
    Do() {
      const c = i++
      console.log(c)
    }
  }
}


const f = foo()
f.Do()
f.Do()
f.Do()
f.Do()