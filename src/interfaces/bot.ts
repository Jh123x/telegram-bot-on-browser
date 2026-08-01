export interface BotRule {
  matcher: (message: string, userId?: number) => boolean;
  callback: (message: string, userId?: number) => string | string[];
}

export class BrowserBot {
  token: string
  url: string
  rules: BotRule[]

  poll_worker?: Worker
  send_worker?: Worker

  constructor(token: string) {
    this.token = token;
    this.url = `https://api.telegram.org/bot${token}`;
    this.rules = [];
  }

  addRule(
    matcher: (message: string, userId?: number) => boolean,
    callback: (message: string, userId?: number) => string | string[]
  ) {
    this.rules.push({ matcher, callback });
  }

  clearRules() {
    this.rules = [];
  }

  handleMessage(message: string, userId?: number): string | string[] | undefined {
    for (const rule of this.rules) {
      if (rule.matcher(message, userId)) return rule.callback(message, userId);
    }
    return undefined;
  }

  start(
    responseSender: (date: number, user: string, id: number, message: string) => void,
    replySender?: (date: number, user: string, id: number, message: string) => void
  ) {
    this.poll_worker = new Worker("poll_worker.js");
    this.send_worker = new Worker("send_worker.js");

    this.poll_worker.onmessage = async (e) => {
      const [date, username, chatID, message] = e.data;
      console.debug(`[Main] Received: ${message} from ${username}`);
      responseSender(date * 1000, username, chatID, message);

      const response = this.handleMessage(message, chatID);
      if (response === undefined) {
        console.debug(`[Main] No matching rule for ${message}`);
        return;
      }

      const responses = Array.isArray(response) ? response : [response];
      console.debug(`[Main] Sending ${responses}`);
      for (const reply of responses) {
        this.send_worker!.postMessage([`${this.url}/sendMessage`, reply, chatID]);
        if (replySender !== undefined) {
          replySender(Date.now(), username, chatID, reply);
        }
      }
    };

    const updateUrl = `${this.url}/getUpdates`;
    this.poll_worker.postMessage(updateUrl);
  }

  sendMessage(userID: number, message: string) {
    if (!this.send_worker) {
      console.debug(`Init worker first before sending message`);
      return;
    }

    console.debug(`Sending to ${userID}: ${message}`);
    this.send_worker!.postMessage([`${this.url}/sendMessage`, message, userID]);
  }

  stop() {
    if (this.poll_worker !== undefined) {
      this.poll_worker!.terminate();
      this.poll_worker = undefined;
    }

    if (this.send_worker !== undefined) {
      this.send_worker!.terminate();
      this.send_worker = undefined;
    }

    console.debug("Stopped");
  }
}
