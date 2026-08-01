import { test, expect, vi } from "vitest";
import React from "react";
import { act, renderHook } from "@testing-library/react";
import { Provider } from "react-redux";
import { useBot } from "./useBot.ts";
import { setupStore } from "../redux/testUtils.tsx";
import { setAutoStart, setHydrated, setPollRate, setToken } from "../redux/botSlice.ts";
import { SAMPLE_FLOWS } from "../logic/flowSamples.ts";
import { createFlow, createFlowNode } from "../logic/flow.ts";

class MockWorker {
  onmessage: ((e: { data: unknown }) => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();
}

const instances: MockWorker[] = [];

const RealWorker = global.Worker;

beforeEach(() => {
  instances.length = 0;
  localStorage.clear();
  (global as any).Worker = class extends MockWorker {
    constructor() {
      super();
      instances.push(this);
    }
  };
});

afterEach(() => {
  instances.length = 0;
  if (RealWorker === undefined) {
    delete (global as any).Worker;
  } else {
    (global as any).Worker = RealWorker;
  }
});

const wrapper = (store: ReturnType<typeof setupStore>) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    return <Provider store={store}>{children}</Provider>;
  };
  return Wrapper;
};

// A minimal flow: a "/hello" message routes through a condition to a send
// node that replies "hi". Anything else declines (no else edge → no reply).
const helloFlow = {
  id: "f1",
  name: "Hello",
  startNodeId: "start",
  nodes: [
    { id: "start", type: "start" as const, position: { x: 0, y: 0 }, data: { label: "Start" } },
    { id: "cond", type: "equals" as const, position: { x: 0, y: 0 }, data: { label: "Check", value: "/hello" } },
    { id: "reply", type: "send" as const, position: { x: 0, y: 0 }, data: { label: "Reply", replies: ["hi"] } },
  ],
  edges: [
    { id: "e1", source: "start", target: "cond" },
    { id: "e2", source: "cond", target: "reply", sourceHandle: "if" as const },
  ],
};

test("starts with started=false and a bot instance created from the token", () => {
  const store = setupStore({
    bot: { token: "TOKEN", response: [], users: [] },
  });
  const { result } = renderHook(() => useBot(), {
    wrapper: wrapper(store),
  });

  expect(result.current.started).toBe(false);
  expect(result.current.bot?.url).toBe("https://api.telegram.org/botTOKEN");
  expect(result.current.bot?.token).toBe("TOKEN");
});

test("start() creates two workers, sets started=true, and dispatches responses/users for matching messages", async () => {
  const store = setupStore({
    bot: {
      token: "TOKEN",
      flows: [helloFlow],
      response: [],
      users: [],
    },
  });
  const { result } = renderHook(() => useBot(), { wrapper: wrapper(store) });

  expect(instances.length).toBe(0);

  act(() => {
    result.current.start();
  });

  expect(result.current.started).toBe(true);
  expect(instances.length).toBe(2);
  const poll = instances[0];
  const send = instances[1];

  // poll_worker.postMessage called with the getUpdates URL and default poll rate.
  expect(poll.postMessage).toHaveBeenCalledWith({
    url: "https://api.telegram.org/botTOKEN/getUpdates",
    pollRateMs: 5000,
  });

  await act(async () => {
    await poll.onmessage!({ data: [1234, "alice", 42, "/hello"] });
  });

  expect(send.postMessage).toHaveBeenCalledWith([
    "https://api.telegram.org/botTOKEN/sendMessage",
    "hi",
    42,
  ]);
  expect(store.getState().bot.response).toEqual([
    { FromUser: "alice", UserID: 42, Message: "/hello", TimeStamp: 1234000 },
    expect.objectContaining({ FromUser: "Bot", UserID: 42, Message: "hi", fromBot: true }),
  ]);
  expect(store.getState().bot.users).toEqual([
    { Username: "alice", UserID: 42 },
  ]);
});

test("start() dispatches bot replies with fromBot=true and FromUser='Bot'", async () => {
  const store = setupStore({
    bot: {
      token: "TOKEN",
      flows: [helloFlow],
      response: [],
      users: [],
    },
  });
  const { result } = renderHook(() => useBot(), { wrapper: wrapper(store) });

  act(() => {
    result.current.start();
  });
  const poll = instances[0];

  await act(async () => {
    await poll.onmessage!({ data: [1234, "alice", 42, "/hello"] });
  });

  const responses = store.getState().bot.response;
  expect(responses).toHaveLength(2);
  expect(responses[0]).toEqual({
    FromUser: "alice",
    UserID: 42,
    Message: "/hello",
    TimeStamp: 1234000,
  });
  expect(responses[1]).toMatchObject({
    FromUser: "Bot",
    UserID: 42,
    Message: "hi",
    fromBot: true,
  });
  expect(responses[1].TimeStamp).toEqual(expect.any(Number));
});

test("start() passes the configured poll rate from the store to the poll worker", () => {
  const store = setupStore({
    bot: { token: "TOKEN", response: [], users: [], pollRate: 2 },
  });
  const { result } = renderHook(() => useBot(), { wrapper: wrapper(store) });

  act(() => {
    result.current.start();
  });

  expect(instances[0].postMessage).toHaveBeenCalledWith({
    url: "https://api.telegram.org/botTOKEN/getUpdates",
    pollRateMs: 2000,
  });
});

test("start() when already started does nothing", () => {
  const store = setupStore({
    bot: { token: "TOKEN", response: [], users: [] },
  });
  const { result } = renderHook(() => useBot(), { wrapper: wrapper(store) });

  act(() => {
    result.current.start();
  });
  expect(instances.length).toBe(2);

  act(() => {
    result.current.start();
  });
  expect(instances.length).toBe(2);
});

test("stop() terminates workers and sets started=false", () => {
  const store = setupStore({
    bot: { token: "TOKEN", response: [], users: [] },
  });
  const { result } = renderHook(() => useBot(), { wrapper: wrapper(store) });

  act(() => {
    result.current.start();
  });
  expect(instances.length).toBe(2);

  act(() => {
    result.current.stop();
  });
  expect(result.current.started).toBe(false);
  expect(instances[0].terminate).toHaveBeenCalledTimes(1);
  expect(instances[1].terminate).toHaveBeenCalledTimes(1);
});

test("changing the token while running stops the old bot and resets started", () => {
  const store = setupStore({
    bot: { token: "TOKEN", response: [], users: [] },
  });
  const { result } = renderHook(() => useBot(), { wrapper: wrapper(store) });

  act(() => {
    result.current.start();
  });
  expect(result.current.started).toBe(true);
  expect(result.current.bot?.token).toBe("TOKEN");
  expect(instances.length).toBe(2);

  act(() => {
    store.dispatch(setToken("NEW_TOKEN"));
  });

  // The old bot's workers are terminated and the flag is reset so the user
  // can restart with the new token.
  expect(instances[0].terminate).toHaveBeenCalledTimes(1);
  expect(instances[1].terminate).toHaveBeenCalledTimes(1);
  expect(result.current.started).toBe(false);
  expect(result.current.bot?.token).toBe("NEW_TOKEN");
});

test("flows from the store are registered as rules and respond via the worker", async () => {
  const store = setupStore({
    bot: {
      token: "TOKEN",
      flows: [SAMPLE_FLOWS[2].flow], // Greeting Check
      response: [],
      users: [],
    },
  });
  const { result } = renderHook(() => useBot(), { wrapper: wrapper(store) });

  act(() => {
    result.current.start();
  });
  const poll = instances[0];
  const send = instances[1];

  // "hi" contains "hi", so the condition takes the if branch → greeting.
  await act(async () => {
    await poll.onmessage!({ data: [1, "alice", 42, "hi"] });
  });
  expect(send.postMessage).toHaveBeenCalledWith([
    "https://api.telegram.org/botTOKEN/sendMessage",
    "Hello! 👋",
    42,
  ]);
});

test("a silent flow falls through to the next flow (multi-flow rules)", async () => {
  // First flow only matches /help (condition with no else edge), so other
  // messages decline.
  const silentFlow = (() => {
    const f = createFlow("Silent");
    const start = createFlowNode("start", { x: 0, y: 0 });
    const check = createFlowNode("equals", { x: 120, y: 0 });
    check.data.value = "/help";
    const help = createFlowNode("send", { x: 240, y: 0 });
    help.data.label = "Help";
    help.data.replies = ["Help text"];
    f.startNodeId = start.id;
    f.nodes = [start, check, help];
    f.edges = [
      { id: "e1", source: start.id, target: check.id },
      { id: "e2", source: check.id, target: help.id, sourceHandle: "if" },
    ];
    return f;
  })();
  const store = setupStore({
    bot: {
      token: "TOKEN",
      flows: [silentFlow, SAMPLE_FLOWS[2].flow], // Silent, then Greeting Check
      response: [],
      users: [],
    },
  });
  const { result } = renderHook(() => useBot(), { wrapper: wrapper(store) });

  act(() => {
    result.current.start();
  });
  const poll = instances[0];
  const send = instances[1];

  // Silent flow declines "hi" (no /help match); the greeting flow answers.
  await act(async () => {
    await poll.onmessage!({ data: [1, "alice", 42, "hi"] });
  });
  expect(send.postMessage).toHaveBeenCalledWith([
    "https://api.telegram.org/botTOKEN/sendMessage",
    "Hello! 👋",
    42,
  ]);
});

test("flows are stateless: every message re-runs from the start node", async () => {
  const store = setupStore({
    bot: {
      token: "TOKEN",
      flows: [SAMPLE_FLOWS[2].flow], // Greeting Check
      response: [],
      users: [],
    },
  });
  const { result } = renderHook(() => useBot(), { wrapper: wrapper(store) });

  act(() => {
    result.current.start();
  });
  const poll = instances[0];
  const send = instances[1];

  // alice (42) sends "hi" → greeting (if branch).
  await act(async () => {
    await poll.onmessage!({ data: [1, "alice", 42, "hi"] });
  });
  expect(send.postMessage).toHaveBeenLastCalledWith([
    "https://api.telegram.org/botTOKEN/sendMessage",
    "Hello! 👋",
    42,
  ]);

  // bob (7) sends "hey" → else branch.
  await act(async () => {
    await poll.onmessage!({ data: [2, "bob", 7, "hey"] });
  });
  expect(send.postMessage).toHaveBeenLastCalledWith([
    "https://api.telegram.org/botTOKEN/sendMessage",
    "Say hi!",
    7,
  ]);

  // alice sends "hi" again — the runtime is stateless, so the message is
  // re-evaluated from the start node and gets the greeting once more (no
  // per-user position to advance).
  await act(async () => {
    await poll.onmessage!({ data: [3, "alice", 42, "hi"] });
  });
  expect(send.postMessage).toHaveBeenLastCalledWith([
    "https://api.telegram.org/botTOKEN/sendMessage",
    "Hello! 👋",
    42,
  ]);

  const messagesByUser = (userId: number) =>
    send.postMessage.mock.calls
      .filter((call: [string, string, number]) => call[0][2] === userId)
      .map((call: [string, string, number]) => call[0][1]);
  expect(messagesByUser(42)).toEqual(["Hello! 👋", "Hello! 👋"]);
  expect(messagesByUser(7)).toEqual(["Say hi!"]);
});

test("a flow with no matching transition sends no reply", async () => {
  // A condition with only an if edge declines non-matching messages.
  const strictFlow = (() => {
    const f = createFlow("Strict");
    const start = createFlowNode("start", { x: 0, y: 0 });
    const check = createFlowNode("equals", { x: 120, y: 0 });
    check.data.value = "/secret";
    const reveal = createFlowNode("send", { x: 240, y: 0 });
    reveal.data.label = "Reveal";
    reveal.data.replies = ["The secret is 42"];
    f.startNodeId = start.id;
    f.nodes = [start, check, reveal];
    f.edges = [
      { id: "e1", source: start.id, target: check.id },
      { id: "e2", source: check.id, target: reveal.id, sourceHandle: "if" },
    ];
    return f;
  })();
  const store = setupStore({
    bot: {
      token: "TOKEN",
      flows: [strictFlow],
      response: [],
      users: [],
    },
  });
  const { result } = renderHook(() => useBot(), { wrapper: wrapper(store) });

  act(() => {
    result.current.start();
  });
  const poll = instances[0];
  const send = instances[1];

  // "hello" does not equal "/secret" and there is no else edge → silent.
  await act(async () => {
    await poll.onmessage!({ data: [1, "alice", 42, "hello"] });
  });
  expect(send.postMessage).toHaveBeenCalledTimes(0);

  // A matching message does reply.
  await act(async () => {
    await poll.onmessage!({ data: [2, "alice", 42, "/secret"] });
  });
  expect(send.postMessage).toHaveBeenCalledTimes(1);
});

test("auto-starts once when autoStart and token are set at load", () => {
  const store = setupStore({
    bot: {
      token: "TOKEN",
      response: [],
      users: [],
      autoStart: true,
      hydrated: true,
    },
  });
  const { result } = renderHook(() => useBot(), { wrapper: wrapper(store) });

  expect(result.current.started).toBe(true);
  expect(instances.length).toBe(2);
});

test("does not auto-start when the token is empty at load", () => {
  const store = setupStore({
    bot: {
      token: "",
      response: [],
      users: [],
      autoStart: true,
      hydrated: true,
    },
  });
  const { result } = renderHook(() => useBot(), { wrapper: wrapper(store) });

  expect(result.current.started).toBe(false);
  expect(instances.length).toBe(0);
});

test("does not auto-start when autoStart is false at load", () => {
  const store = setupStore({
    bot: {
      token: "TOKEN",
      response: [],
      users: [],
      autoStart: false,
      hydrated: true,
    },
  });
  const { result } = renderHook(() => useBot(), { wrapper: wrapper(store) });

  expect(result.current.started).toBe(false);
  expect(instances.length).toBe(0);
});

test("auto-starts the bot instance with the hydrated token, not the stale one", () => {
  const store = setupStore({
    bot: { token: "", response: [], users: [], autoStart: true, hydrated: false },
  });
  const { result } = renderHook(() => useBot(), { wrapper: wrapper(store) });

  // Simulate real hydration: token is set first, then hydration completes.
  act(() => {
    store.dispatch(setToken("TOKEN"));
    store.dispatch(setAutoStart(true));
    store.dispatch(setHydrated(true));
  });

  expect(result.current.started).toBe(true);
  // Exactly one set of workers (2) — no second start from strict-like re-renders.
  expect(instances.length).toBe(2);
  // The poll worker must be talking to /botTOKEN/getUpdates, proving the
  // empty-token instance was NOT the one auto-started.
  expect(instances[0].postMessage).toHaveBeenCalledWith({
    url: "https://api.telegram.org/botTOKEN/getUpdates",
    pollRateMs: 5000,
  });
});

test("auto-start uses the configured poll rate from the store", () => {
  const store = setupStore({
    bot: {
      token: "",
      response: [],
      users: [],
      autoStart: true,
      hydrated: false,
      pollRate: 5,
    },
  });
  const { result } = renderHook(() => useBot(), { wrapper: wrapper(store) });

  // Hydration in two separate renders: token first, then completion + a
  // poll-rate change. The auto-start effect must re-run when the poll rate
  // changes (it is one of its dependencies) and start with the new value.
  act(() => {
    store.dispatch(setToken("TOKEN"));
  });
  act(() => {
    store.dispatch(setHydrated(true));
    store.dispatch(setPollRate(2));
  });

  expect(result.current.started).toBe(true);
  expect(instances[0].postMessage).toHaveBeenCalledWith({
    url: "https://api.telegram.org/botTOKEN/getUpdates",
    pollRateMs: 2000,
  });
});

test("a poll rate change after auto-start does not restart the bot", () => {
  const store = setupStore({
    bot: {
      token: "TOKEN",
      response: [],
      users: [],
      autoStart: true,
      hydrated: true,
      pollRate: 5,
    },
  });
  const { result } = renderHook(() => useBot(), { wrapper: wrapper(store) });

  expect(result.current.started).toBe(true);
  expect(instances.length).toBe(2);
  expect(instances[0].postMessage).toHaveBeenCalledWith({
    url: "https://api.telegram.org/botTOKEN/getUpdates",
    pollRateMs: 5000,
  });

  // Changing the rate mid-session updates the store but must NOT spawn a
  // second worker pair or restart the running bot (load-only semantics,
  // same as the auto-start decision).
  act(() => {
    store.dispatch(setPollRate(2));
  });

  expect(result.current.started).toBe(true);
  expect(instances.length).toBe(2);
  expect(instances[0].postMessage).toHaveBeenCalledTimes(1);
});

test("does not auto-start when the token is added after load", () => {
  const store = setupStore({
    bot: { token: "", response: [], users: [], autoStart: true, hydrated: true },
  });
  const { result } = renderHook(() => useBot(), { wrapper: wrapper(store) });

  expect(result.current.started).toBe(false);
  expect(instances.length).toBe(0);

  // Adding a token mid-session must NOT trigger an auto-start.
  act(() => {
    store.dispatch(setToken("TOKEN"));
  });

  expect(result.current.started).toBe(false);
  expect(instances.length).toBe(0);
});

test("does not auto-start when the switch is toggled on after load", () => {
  const store = setupStore({
    bot: { token: "TOKEN", response: [], users: [], autoStart: false, hydrated: true },
  });
  const { result } = renderHook(() => useBot(), { wrapper: wrapper(store) });

  expect(result.current.started).toBe(false);
  expect(instances.length).toBe(0);

  // Toggling the switch mid-session must NOT trigger an auto-start.
  act(() => {
    store.dispatch(setAutoStart(true));
  });

  expect(result.current.started).toBe(false);
  expect(instances.length).toBe(0);
});

test("does not auto-start when hydration has not completed", () => {
  const store = setupStore({
    bot: { token: "TOKEN", response: [], users: [], autoStart: true, hydrated: false },
  });
  const { result } = renderHook(() => useBot(), { wrapper: wrapper(store) });

  expect(result.current.started).toBe(false);
  expect(instances.length).toBe(0);
});

test("manual stop is not overridden by the auto-start effect", () => {
  const store = setupStore({
    bot: {
      token: "TOKEN",
      response: [],
      users: [],
      autoStart: true,
      hydrated: true,
    },
  });
  const { result } = renderHook(() => useBot(), { wrapper: wrapper(store) });

  expect(result.current.started).toBe(true);
  expect(instances.length).toBe(2);

  act(() => {
    result.current.stop();
  });
  expect(result.current.started).toBe(false);

  // Force a re-render via an unrelated store update; the auto-start effect
  // must not restart the bot.
  act(() => {
    store.dispatch(setAutoStart(false));
  });
  expect(result.current.started).toBe(false);
  expect(instances.length).toBe(2);
});

test("auto-starts exactly once under StrictMode", () => {
  const store = setupStore({
    bot: {
      token: "TOKEN",
      response: [],
      users: [],
      autoStart: true,
      hydrated: true,
    },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    return (
      <React.StrictMode>
        <Provider store={store}>{children}</Provider>
      </React.StrictMode>
    );
  };
  const { result } = renderHook(() => useBot(), { wrapper: Wrapper });

  expect(result.current.started).toBe(true);
  expect(instances.length).toBe(2);
});

test("auto-started bot dispatches responses and users when an update arrives after hydration", async () => {
  const store = setupStore({
    bot: {
      token: "",
      flows: [helloFlow],
      response: [],
      users: [],
      autoStart: true,
      hydrated: false,
    },
  });
  const { result } = renderHook(() => useBot(), { wrapper: wrapper(store) });

  // Simulate hydration completing: token first, then auto-start + hydration.
  act(() => {
    store.dispatch(setToken("TOKEN"));
    store.dispatch(setAutoStart(true));
    store.dispatch(setHydrated(true));
  });

  expect(result.current.started).toBe(true);
  expect(instances.length).toBe(2);
  const poll = instances[0];
  const send = instances[1];

  // Posting an update through the auto-started poll worker must route through
  // the auto-start path's responseSender callbacks (dispatch addResponse for
  // the user message AND addUser), then the reply sender (addResponse from
  // the bot).
  await act(async () => {
    await poll.onmessage!({ data: [1234, "alice", 42, "/hello"] });
  });

  expect(send.postMessage).toHaveBeenCalledWith([
    "https://api.telegram.org/botTOKEN/sendMessage",
    "hi",
    42,
  ]);
  expect(store.getState().bot.response).toEqual([
    { FromUser: "alice", UserID: 42, Message: "/hello", TimeStamp: 1234000 },
    expect.objectContaining({ FromUser: "Bot", UserID: 42, Message: "hi", fromBot: true }),
  ]);
  expect(store.getState().bot.users).toEqual([{ Username: "alice", UserID: 42 }]);
});

test("auto-started bot dispatches a user message even when no flow matches", async () => {
  const store = setupStore({
    bot: {
      token: "",
      flows: [helloFlow],
      response: [],
      users: [],
      autoStart: true,
      hydrated: false,
    },
  });
  const { result } = renderHook(() => useBot(), { wrapper: wrapper(store) });

  act(() => {
    store.dispatch(setToken("TOKEN"));
    store.dispatch(setAutoStart(true));
    store.dispatch(setHydrated(true));
  });

  const poll = instances[0];
  // "hello" does not match the /hello flow and has no else edge → no reply,
  // but the user message must still be recorded via the auto-start callbacks.
  await act(async () => {
    await poll.onmessage!({ data: [1, "bob", 7, "hello"] });
  });

  expect(store.getState().bot.response).toEqual([
    { FromUser: "bob", UserID: 7, Message: "hello", TimeStamp: 1000 },
  ]);
  expect(store.getState().bot.users).toEqual([{ Username: "bob", UserID: 7 }]);
});
