import * as fs from "fs/promises"


class Log {
  private static log_name = "pixiv-collector.log"
  private static log_handle: fs.FileHandle | null = null

  private static async GetLogHandle(): Promise<fs.FileHandle> {
    if (Log.log_handle == null)
      Log.log_handle = await fs.open(Log.log_name, 'a')
    return Log.log_handle
  }

  static Info(content: string): void {
    Log.Customize("INFO", content)
  }

  static Error(content: string): void {
    Log.Customize("Error", content)
  }

  static Customize(log_type: string, content: string): void {
    content = "[" + (new Date()).toLocaleString() + "]" + " [" + log_type + "] " + content + "\n"
    Log.GetLogHandle()
      .then(fd => fd.write(content))
      .catch(err => { console.error(err) })
  }
}

export default Log