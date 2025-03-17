export class BrowserBot {
  token: string
  url: string
  command: Map<string, () => void>

  poll_worker?: Worker
  send_worker?: Worker

  constructor(token) {
    this.token = token;
    this.url = `https://api.telegram.org/bot${token}`;
    this.command = new Map();
  }

  addCommand(command, callback) {
    this.command.set(command, callback);
  }

  start(responseSender: (date: number, user: string, id: number, message: string) => void) {
    this.poll_worker = new Worker("poll_worker.js");
    this.send_worker = new Worker("send_worker.js");
    this.poll_worker.onmessage = async (e) => {
      const [date, username, chatID, message] = e.data;
      console.log(`[Main] Received: ${message} from ${username}`)
      responseSender(date * 1000, username, chatID, message)

      if (!this.command.has(message)) {
        console.log(`[Main] Command ${message} not found`)
        return
      }

      console.log(`[Main] Has command ${message}`)
      const callback = this.command.get(message);

      const response = callback!()
      console.log(`[Main] Sending ${response}`)


      this.send_worker!.postMessage([`${this.url}/sendMessage`, response, chatID]);
    };

    const updateUrl = `${this.url}/getUpdates`;
    this.poll_worker.postMessage(updateUrl);
  }

  stop() {
    if (this.poll_worker !== null) {
      this.poll_worker!.terminate();
      this.poll_worker = undefined;
    }

    if (this.send_worker !== null) {
      this.send_worker!.terminate();
      this.send_worker = undefined;
    }

    console.log("Stopped");
  }
}
