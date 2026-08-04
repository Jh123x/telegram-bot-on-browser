import { test, expect, vi } from "vitest";
import { BrowserBot } from "./bot.ts";

class MockWorker {
  onmessage: ((e: { data: unknown }) => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();
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
const SEND_POLL_URL = `https://api.telegram.org/bot${TOKEN}/sendPoll`;

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
  expect(bot.poll_worker!.postMessage).toHaveBeenCalledWith({
    url: POLL_URL,
    pollRateMs: 5000,
  });
});

test("start() uses the default 5s poll rate when none is provided", () => {
  const bot = createBot();
  bot.start(() => {});
  expect(bot.poll_worker!.postMessage).toHaveBeenCalledWith(
    expect.objectContaining({ pollRateMs: 5000 })
  );
});

test("start() passes a custom poll rate in milliseconds to poll_worker", () => {
  const bot = createBot();
  bot.start(() => {}, undefined, 2000);
  expect(bot.poll_worker!.postMessage).toHaveBeenCalledWith({
    url: POLL_URL,
    pollRateMs: 2000,
  });
});

test("simulated poll message invokes responseSender with date, user, id, message", async () => {
  const bot = createBot();
  const responseSender = vi.fn();
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
  const replySender = vi.fn();
  bot.start(() => {}, replySender);

  await bot.poll_worker!.onmessage!({ data: [1720000000, "alice", 123, "/hello"] });

  expect(replySender).toHaveBeenCalledTimes(2);
  expect(replySender).toHaveBeenNthCalledWith(1, expect.any(Number), "alice", 123, "a");
  expect(replySender).toHaveBeenNthCalledWith(2, expect.any(Number), "alice", 123, "b");
});

test("start() with a replySender does not call it when there is no matching rule", async () => {
  const bot = createBot();
  const replySender = vi.fn();
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

test("a rule callback returning a PollReply posts to sendPoll and calls replySender with the poll display", async () => {
  const bot = createBot();
  bot.addRule((m) => m === "/poll", () => ({
    kind: "poll",
    question: "Favorite color",
    options: ["red", "blue", "green"],
  }));
  const replySender = vi.fn();
  bot.start(() => {}, replySender);

  await bot.poll_worker!.onmessage!({ data: [1720000000, "alice", 123, "/poll"] });

  expect(bot.send_worker!.postMessage).toHaveBeenCalledTimes(1);
  expect(bot.send_worker!.postMessage).toHaveBeenCalledWith([
    SEND_POLL_URL,
    { question: "Favorite color", options: ["red", "blue", "green"] },
    123,
  ]);
  expect(replySender).toHaveBeenCalledTimes(1);
  expect(replySender).toHaveBeenCalledWith(
    expect.any(Number),
    "alice",
    123,
    "📊 Poll: Favorite color\n• red\n• blue\n• green"
  );
});

test("a PollReply with poll config forwards the config fields to sendPoll", async () => {
  const bot = createBot();
  bot.addRule((m) => m === "/poll", () => ({
    kind: "poll",
    question: "Quiz time",
    options: ["a", "b"],
    type: "quiz",
    isAnonymous: false,
    allowsMultipleAnswers: true,
    correctOptionId: 1,
    explanation: "It is A",
    openPeriod: 60,
  }));
  bot.start(() => {});

  await bot.poll_worker!.onmessage!({ data: [1720000000, "alice", 123, "/poll"] });

  expect(bot.send_worker!.postMessage).toHaveBeenCalledWith([
    SEND_POLL_URL,
    {
      question: "Quiz time",
      options: ["a", "b"],
      type: "quiz",
      isAnonymous: false,
      allowsMultipleAnswers: true,
      correctOptionId: 1,
      explanation: "It is A",
      openPeriod: 60,
    },
    123,
  ]);
});

test("mixed string and PollReply responses post to sendMessage and sendPoll respectively", async () => {
  const bot = createBot();
  bot.addRule(() => true, () => ["plain text", { kind: "poll", question: "Q", options: ["a", "b"] }]);
  bot.start(() => {});

  await bot.poll_worker!.onmessage!({ data: [1720000000, "alice", 123, "/mix"] });

  expect(bot.send_worker!.postMessage).toHaveBeenCalledTimes(2);
  expect(bot.send_worker!.postMessage).toHaveBeenNthCalledWith(1, [SEND_URL, "plain text", 123]);
  expect(bot.send_worker!.postMessage).toHaveBeenNthCalledWith(2, [SEND_POLL_URL, { question: "Q", options: ["a", "b"] }, 123]);
});

test("a TargetedReply forwards to the mentioned user's chat and confirms to the sender", async () => {
  const bot = createBot();
  bot.addRule(
    (m) => m.startsWith("/anon"),
    () => [{ kind: "sendTo", to: "bob", texts: ["secret"], confirm: "Sent to @bob" }]
  );
  const replySender = vi.fn();
  bot.start(() => {}, replySender);

  // bob messages the bot first so his chat id is learned.
  await bot.poll_worker!.onmessage!({ data: [1720000001, "bob", 456, "/start"] });

  await bot.poll_worker!.onmessage!({ data: [1720000002, "alice", 123, "/anon @bob secret"] });

  expect(bot.send_worker!.postMessage).toHaveBeenNthCalledWith(1, [SEND_URL, "secret", 456]);
  expect(bot.send_worker!.postMessage).toHaveBeenNthCalledWith(2, [SEND_URL, "Sent to @bob", 123]);
  // The forwarded message is logged under bob's conversation, the confirm
  // under alice's.
  expect(replySender).toHaveBeenCalledWith(expect.any(Number), "bob", 456, "secret");
  expect(replySender).toHaveBeenCalledWith(expect.any(Number), "alice", 123, "Sent to @bob");
});

test("a TargetedReply with multiple texts forwards each and confirms once", async () => {
  const bot = createBot();
  bot.addRule(
    (m) => m.startsWith("/anon"),
    () => [{ kind: "sendTo", to: "bob", texts: ["one", "two"], confirm: "Done" }]
  );
  bot.start(() => {});
  await bot.poll_worker!.onmessage!({ data: [1720000001, "bob", 456, "/start"] });

  await bot.poll_worker!.onmessage!({ data: [1720000002, "alice", 123, "/anon @bob hi"] });

  expect(bot.send_worker!.postMessage).toHaveBeenCalledTimes(3);
  expect(bot.send_worker!.postMessage).toHaveBeenNthCalledWith(1, [SEND_URL, "one", 456]);
  expect(bot.send_worker!.postMessage).toHaveBeenNthCalledWith(2, [SEND_URL, "two", 456]);
  expect(bot.send_worker!.postMessage).toHaveBeenNthCalledWith(3, [SEND_URL, "Done", 123]);
});

test("a TargetedReply with an unknown target sends only a failure note to the sender", async () => {
  const bot = createBot();
  bot.addRule(
    (m) => m.startsWith("/anon"),
    () => [{ kind: "sendTo", to: "ghost", texts: ["hi"], confirm: "Sent to @ghost" }]
  );
  const replySender = vi.fn();
  bot.start(() => {}, replySender);

  await bot.poll_worker!.onmessage!({ data: [1720000000, "alice", 123, "/anon @ghost hi"] });

  expect(bot.send_worker!.postMessage).toHaveBeenCalledTimes(1);
  expect(bot.send_worker!.postMessage).toHaveBeenCalledWith([
    SEND_URL,
    "❌ Couldn't find @ghost",
    123,
  ]);
  expect(replySender).toHaveBeenCalledWith(
    expect.any(Number),
    "alice",
    123,
    "❌ Couldn't find @ghost"
  );
});

test("mentions resolve case-insensitively against learned usernames", async () => {
  const bot = createBot();
  bot.addRule(
    (m) => m.startsWith("/anon"),
    () => [{ kind: "sendTo", to: "Bob", texts: ["hi"], confirm: "Sent to @Bob" }]
  );
  bot.start(() => {});

  // bob's update arrives with a mixed-case username.
  await bot.poll_worker!.onmessage!({ data: [1720000000, "Bob", 789, "/start"] });

  await bot.poll_worker!.onmessage!({ data: [1720000001, "alice", 123, "/anon @Bob hi"] });

  expect(bot.send_worker!.postMessage).toHaveBeenCalledWith([SEND_URL, "hi", 789]);
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
  const matcher = vi.fn(() => true);
  const callback = vi.fn((m: string, u?: number) => `echo:${m}:${u}`);
  bot.addRule(matcher, callback);

  const result = bot.handleMessage("/hi", 42);

  expect(result).toBe("echo:/hi:42");
  expect(matcher).toHaveBeenCalledWith("/hi", 42);
  expect(callback).toHaveBeenCalledWith("/hi", 42);
});

test("handleMessage passes undefined as userId when omitted", () => {
  const bot = createBot();
  const matcher = vi.fn(() => true);
  const callback = vi.fn();
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

test("full onmessage flow: responseSender, send_worker post, and replySender all fire", async () => {
  const bot = createBot();
  bot.addRule((m) => m === "/hello", (m) => ["a", "b"]);
  const responseSender = vi.fn();
  const replySender = vi.fn();
  bot.start(responseSender, replySender);

  await bot.poll_worker!.onmessage!({
    data: [1720000000, "alice", 123, "/hello"],
  });

  // 1) The raw update is surfaced through responseSender.
  expect(responseSender).toHaveBeenCalledTimes(1);
  expect(responseSender).toHaveBeenCalledWith(
    1720000000 * 1000,
    "alice",
    123,
    "/hello"
  );

  // 2) Each reply is posted to send_worker.
  expect(bot.send_worker!.postMessage).toHaveBeenCalledTimes(2);
  expect(bot.send_worker!.postMessage).toHaveBeenNthCalledWith(1, [
    SEND_URL,
    "a",
    123,
  ]);
  expect(bot.send_worker!.postMessage).toHaveBeenNthCalledWith(2, [
    SEND_URL,
    "b",
    123,
  ]);

  // 3) replySender is invoked for every reply.
  expect(replySender).toHaveBeenCalledTimes(2);
  expect(replySender).toHaveBeenNthCalledWith(
    1,
    expect.any(Number),
    "alice",
    123,
    "a"
  );
  expect(replySender).toHaveBeenNthCalledWith(
    2,
    expect.any(Number),
    "alice",
    123,
    "b"
  );
});
