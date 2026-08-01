import { test, expect } from "@jest/globals";
import { BrowserBot } from "./bot.ts";

class MockWorker {
  onmessage: ((e: { data: unknown }) => void) | null = null;
  postMessage = jest.fn();
  terminate = jest.fn();
}

const instances: MockWorker[] = [];

(global as any).Worker = class extends MockWorker {
  constructor() {
    super();
    instances.push(this);
  }
};

const TOKEN = "123456:TEST-TOKEN";
const POLL_URL = `https://api.telegram.org/bot${TOKEN}/getUpdates`;
const SEND_URL = `https://api.telegram.org/bot${TOKEN}/sendMessage`;

function createBot() {
  instances.length = 0;
  return new BrowserBot(TOKEN);
}

test("addRule + handleMessage: first matching rule's callback receives message and its return value is returned", () => {
  const bot = createBot();
  bot.addRule((m) => m === "/hello", (m) => `echo:${m}`);
  bot.addRule((m) => m === "/bye", (m) => "goodbye");

  expect(bot.handleMessage("/hello")).toBe("echo:/hello");
  expect(bot.handleMessage("/bye")).toBe("goodbye");
});

test("a rule whose matcher returns false is skipped", () => {
  const bot = createBot();
  bot.addRule((m) => m === "/missing", (m) => "won't run");
  bot.addRule((m) => m === "/hi", (m) => "ran");

  expect(bot.handleMessage("/hi")).toBe("ran");
});

test("no match -> undefined", () => {
  const bot = createBot();
  bot.addRule((m) => m === "/unknown", (m) => "nope");

  expect(bot.handleMessage("/hi")).toBeUndefined();
});

test("first matching rule wins (ordered)", () => {
  const bot = createBot();
  bot.addRule((m) => m.startsWith("/"), (m) => "first");
  bot.addRule((m) => m === "/hi", (m) => "second");

  expect(bot.handleMessage("/hi")).toBe("first");
});

test("a matching rule whose callback returns undefined lets the next rule run", () => {
  const bot = createBot();
  bot.addRule(() => true, () => undefined);
  bot.addRule(() => true, () => "second rule reply");

  expect(bot.handleMessage("anything")).toBe("second rule reply");
});

test("handleMessage returns string[] arrays as-is when callback returns an array", () => {
  const bot = createBot();
  bot.addRule((m) => true, (m) => ["a", "b"]);

  expect(bot.handleMessage("anything")).toEqual(["a", "b"]);
});

test("handleMessage returns the string when callback returns a string", () => {
  const bot = createBot();
  bot.addRule((m) => true, (m) => "single");

  expect(bot.handleMessage("anything")).toBe("single");
});

test("clearRules() empties the rules (handleMessage -> undefined afterwards)", () => {
  const bot = createBot();
  bot.addRule((m) => true, (m) => "still here");

  expect(bot.handleMessage("x")).toBe("still here");

  bot.clearRules();
  expect(bot.handleMessage("x")).toBeUndefined();
});

test("start() posts the getUpdates url to poll_worker", () => {
  const bot = createBot();
  bot.start(() => {});
  expect(instances).toHaveLength(2);
  expect(bot.poll_worker).toBeInstanceOf(MockWorker);
  expect(bot.send_worker).toBeInstanceOf(MockWorker);
  expect(bot.poll_worker!.postMessage).toHaveBeenCalledWith(POLL_URL);
});

test("simulated poll message invokes responseSender with date, user, id, message", async () => {
  const bot = createBot();
  const responseSender = jest.fn();
  bot.start(responseSender);

  await bot.poll_worker!.onmessage!({ data: [1720000000, "alice", 123, "/hello"] });

  expect(responseSender).toHaveBeenCalledWith(1720000000 * 1000, "alice", 123, "/hello");
});

test("matching rule callback returning array sends each response to send_worker", async () => {
  const bot = createBot();
  bot.addRule((m) => m === "/hello", (m) => ["a", "b"]);
  bot.start(() => {});

  await bot.poll_worker!.onmessage!({ data: [1720000000, "alice", 123, "/hello"] });

  expect(bot.send_worker!.postMessage).toHaveBeenCalledTimes(2);
  expect(bot.send_worker!.postMessage).toHaveBeenNthCalledWith(1, [SEND_URL, "a", 123]);
  expect(bot.send_worker!.postMessage).toHaveBeenNthCalledWith(2, [SEND_URL, "b", 123]);
});

test("matching rule callback returning a string sends a single response to send_worker", async () => {
  const bot = createBot();
  bot.addRule((m) => m === "/hello", (m) => "hi");
  bot.start(() => {});

  await bot.poll_worker!.onmessage!({ data: [1720000000, "alice", 123, "/hello"] });

  expect(bot.send_worker!.postMessage).toHaveBeenCalledTimes(1);
  expect(bot.send_worker!.postMessage).toHaveBeenCalledWith([SEND_URL, "hi", 123]);
});

test("start() with a replySender invokes it for every reply posted to send_worker", async () => {
  const bot = createBot();
  bot.addRule((m) => m === "/hello", (m) => ["a", "b"]);
  const replySender = jest.fn();
  bot.start(() => {}, replySender);

  await bot.poll_worker!.onmessage!({ data: [1720000000, "alice", 123, "/hello"] });

  expect(replySender).toHaveBeenCalledTimes(2);
  expect(replySender).toHaveBeenNthCalledWith(1, expect.any(Number), "alice", 123, "a");
  expect(replySender).toHaveBeenNthCalledWith(2, expect.any(Number), "alice", 123, "b");
});

test("start() with a replySender does not call it when there is no matching rule", async () => {
  const bot = createBot();
  const replySender = jest.fn();
  bot.start(() => {}, replySender);

  await bot.poll_worker!.onmessage!({ data: [1720000000, "alice", 123, "/nope"] });

  expect(replySender).not.toHaveBeenCalled();
});

test("no matching rule -> send_worker.postMessage not called", async () => {
  const bot = createBot();
  bot.start(() => {});

  await bot.poll_worker!.onmessage!({ data: [1720000000, "alice", 123, "/nope"] });

  expect(bot.send_worker!.postMessage).not.toHaveBeenCalled();
});

test("stop() terminates both workers and clears them", () => {
  const bot = createBot();
  bot.start(() => {});

  const pollWK = bot.poll_worker!;
  const sendWK = bot.send_worker!;

  bot.stop();

  expect(pollWK.terminate).toHaveBeenCalledTimes(1);
  expect(sendWK.terminate).toHaveBeenCalledTimes(1);
  expect(bot.poll_worker).toBeUndefined();
  expect(bot.send_worker).toBeUndefined();
});

test("calling stop() before start() does not throw and leaves workers undefined", () => {
  const bot = createBot();
  expect(() => bot.stop()).not.toThrow();
  expect(bot.poll_worker).toBeUndefined();
  expect(bot.send_worker).toBeUndefined();
});

test("sendMessage posts [url, message, userID] to send_worker", () => {
  const bot = createBot();
  bot.start(() => {});

  bot.sendMessage(99, "hello");

  expect(bot.send_worker!.postMessage).toHaveBeenCalledWith([SEND_URL, "hello", 99]);
});

test("sendMessage does nothing when send_worker is undefined", () => {
  const bot = createBot();
  expect(() => bot.sendMessage(99, "hello")).not.toThrow();
  expect(bot.send_worker).toBeUndefined();
});

test("handleMessage passes userId to both matcher and callback when provided", () => {
  const bot = createBot();
  const matcher = jest.fn(() => true);
  const callback = jest.fn((m: string, u?: number) => `echo:${m}:${u}`);
  bot.addRule(matcher, callback);

  const result = bot.handleMessage("/hi", 42);

  expect(result).toBe("echo:/hi:42");
  expect(matcher).toHaveBeenCalledWith("/hi", 42);
  expect(callback).toHaveBeenCalledWith("/hi", 42);
});

test("handleMessage passes undefined as userId when omitted", () => {
  const bot = createBot();
  const matcher = jest.fn(() => true);
  const callback = jest.fn();
  bot.addRule(matcher, callback);

  const result = bot.handleMessage("/hi");

  expect(result).toBeUndefined();
  expect(matcher).toHaveBeenCalledWith("/hi", undefined);
  expect(callback).toHaveBeenCalledWith("/hi", undefined);
});

test("existing one-argument rules continue to work through handleMessage", () => {
  const bot = createBot();
  bot.addRule((m) => m === "/hello", (m) => `echo:${m}`);

  expect(bot.handleMessage("/hello", 123)).toBe("echo:/hello");
});

test("start() passes chatID from the worker payload to the matching rule's callback", async () => {
  const bot = createBot();
  bot.addRule((m) => m === "/hello", (m, u) => `user:${u}`);
  bot.start(() => {});

  await bot.poll_worker!.onmessage!({ data: [1720000000, "alice", 555, "/hello"] });

  expect(bot.send_worker!.postMessage).toHaveBeenCalledWith([SEND_URL, "user:555", 555]);
});
