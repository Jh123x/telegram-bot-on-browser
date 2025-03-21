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
      console.debug(`[Main] Received: ${message} from ${username}`)
      responseSender(date * 1000, username, chatID, message)

      if (!this.command.has(message)) {
        console.debug(`[Main] Command ${message} not found`)
        return
      }

      console.debug(`[Main] Has command ${message}`)
      const callback = this.command.get(message);

      const response = callback!()
      console.debug(`[Main] Sending ${response}`)


      this.send_worker!.postMessage([`${this.url}/sendMessage`, response, chatID]);
    };

    const updateUrl = `${this.url}/getUpdates`;
    this.poll_worker.postMessage(updateUrl);
  }

  sendMessage(userID: number, message: string) {
    if (!this.send_worker) {
      console.debug(`Init worker first before sending message`)
      return
    }

    console.debug(`Sending to ${userID}: ${message}`)
    this.send_worker!.postMessage([`${this.url}/sendMessage`, message, userID])
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

    console.debug("Stopped");
  }
}
