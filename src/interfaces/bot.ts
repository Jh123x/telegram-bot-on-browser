import { PollReply } from "./flow.ts";
import { pollDisplay } from "../logic/flow.ts";

export interface BotRule {
  matcher: (message: string, userId?: number) => boolean;
  callback: (message: string, userId?: number) => string | string[] | PollReply;
}

// Debug logging is gated to non-production builds so verbose call tracing is
// never emitted in deployed bundles.
const debug = (...args: unknown[]) => {
  if (process.env.NODE_ENV !== "production") console.debug(...args);
};

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
    callback: (message: string, userId?: number) => string | string[] | PollReply
  ) {
    this.rules.push({ matcher, callback });
  }

  clearRules() {
    this.rules = [];
  }

  handleMessage(message: string, userId?: number): string | string[] | PollReply | undefined {
    for (const rule of this.rules) {
      if (!rule.matcher(message, userId)) continue;
      // A matching rule may decline to respond (e.g. a flow with no matching
      // transition); fall through to the next rule in that case.
      const response = rule.callback(message, userId);
      if (response !== undefined) return response;
    }
    return undefined;
  }

  start(
    responseSender: (date: number, user: string, id: number, message: string) => void,
    replySender?: (date: number, user: string, id: number, message: string) => void,
    pollRateMs: number = 5000
  ) {
    this.poll_worker = new Worker("/poll_worker.js");
    this.send_worker = new Worker("/send_worker.js");

    this.poll_worker.onmessage = async (e) => {
      const [date, username, chatID, message] = e.data;
      debug(`[Main] Received: ${message} from ${username}`);
      responseSender(date * 1000, username, chatID, message);

      const response = this.handleMessage(message, chatID);
      if (response === undefined) {
        debug(`[Main] No matching rule for ${message}`);
        return;
      }

      const responses: (string | PollReply)[] = Array.isArray(response)
        ? response
        : [response];
      debug(`[Main] Sending ${responses}`);
      for (const reply of responses) {
        // Poll replies go through the sendPoll endpoint with a structured
        // payload; plain strings are regular sendMessage text.
        if (typeof reply === "string") {
          this.send_worker!.postMessage([`${this.url}/sendMessage`, reply, chatID]);
          if (replySender !== undefined) {
            replySender(Date.now(), username, chatID, reply);
          }
        } else {
          this.send_worker!.postMessage([
            `${this.url}/sendPoll`,
            { question: reply.question, options: reply.options },
            chatID,
          ]);
          if (replySender !== undefined) {
            replySender(Date.now(), username, chatID, pollDisplay(reply));
          }
        }
      }
    };

    const updateUrl = `${this.url}/getUpdates`;
    this.poll_worker.postMessage({ url: updateUrl, pollRateMs });
  }

  sendMessage(userID: number, message: string) {
    if (!this.send_worker) {
      debug(`Init worker first before sending message`);
      return;
    }

    debug(`Sending to ${userID}: ${message}`);
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

    debug("Stopped");
  }
}
