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
    console.log(`Adding command: ${command}`)
    this.command.set(command, callback);
  }

  start() {
    this.poll_worker = new Worker("poll_worker.js");
    this.send_worker = new Worker("send_worker.js");
    this.poll_worker.onmessage = async (e) => {
      const [command, from] = e.data;
      console.log(`Received: ${command} from ${from}`)

      if (!this.command.has(command)) {
        console.log(`Command ${command} not found`)
        return
      }

      console.log(`Has command ${command}`)
      const callback = this.command.get(command);

      const response = callback!()
      console.log(`Sending ${response}`)

      this.send_worker!.postMessage([`${this.url}/sendMessage`, response, from,]);
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
