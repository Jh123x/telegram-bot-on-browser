export class BrowserBot {
  constructor(token) {
    this.token = token;
    this.url = `https://api.telegram.org/bot${token}`;
    this.command = new Map();
    this.poll_worker = null;
    this.send_worker = null;
  }

  addCommand(command, callback) {
    this.command.set(command, callback);
  }

  start() {
    this.poll_worker = new Worker("poll_worker.js");
    this.send_worker = new Worker("send_worker.js");
    this.poll_worker.onmessage = async (e) => {
      const [command, from] = e.data;
      if (this.command.has(command)) {
        const callback = this.command.get(command);
        this.send_worker.postMessage([
          `${this.url}/sendMessage`,
          callback(command, from),
          from,
        ]);
      }
    };
    const updateUrl = `${this.url}/getUpdates`;
    this.poll_worker.postMessage(updateUrl);
  }

  stop() {
    if (this.poll_worker === null) return;
    this.poll_worker.terminate();
    this.poll_worker = null;
    this.send_worker.terminate();
    this.send_worker = null;
    console.log("Stopped");
  }
}
