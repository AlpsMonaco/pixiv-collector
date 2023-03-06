import { Database } from "sqlite3"
const db = new Database('db.sqlite');

function test(): void {
  setTimeout(() => {
    db.get(
      'SELECT RANDOM() % 100 as result',
      (_, res) => { console.log(res); test() }
    );
  }, 3000)
}


test()