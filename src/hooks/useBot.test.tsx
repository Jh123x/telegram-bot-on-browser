import { test, expect } from "@jest/globals";
import React from "react";
import { act, renderHook } from "@testing-library/react";
import { Provider } from "react-redux";
import { useBot } from "./useBot.ts";
import { setupStore } from "../redux/testUtils.tsx";
import { setAutoStart, setHydrated, setPrograms, setToken } from "../redux/botSlice.ts";
import { Program } from "../interfaces/program.ts";
import { SAMPLE_FLOWS } from "../logic/flowSamples.ts";
import { createFlow, createFlowNode } from "../logic/flow.ts";

class MockWorker {
  onmessage: ((e: { data: unknown }) => void) | null = null;
  postMessage = jest.fn();
  terminate = jest.fn();
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

const program = (overrides: Partial<Program> = {}): Program => ({
  id: "p1",
  name: "Greet",
  trigger: { type: "equals", value: "/hello" },
  blocks: [
    {
      id: "b1",
      category: "action",
      kind: "reply",
      value: "hi",
      value2: "",
      fallback: "",
    },
  ],
  ...overrides,
});

const wrapper = (store: ReturnType<typeof setupStore>) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    return <Provider store={store}>{children}</Provider>;
  };
  return Wrapper;
};

test("starts with started=false and a bot instance created from the token", () => {
  const store = setupStore({
    bot: { token: "TOKEN", programs: [], response: [], users: [] },
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
      programs: [program()],
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

  // poll_worker.postMessage called with the getUpdates URL.
  expect(poll.postMessage).toHaveBeenCalledWith(
    "https://api.telegram.org/botTOKEN/getUpdates"
  );

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
      programs: [program()],
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

test("start() when already started does nothing", () => {
  const store = setupStore({
    bot: { token: "TOKEN", programs: [], response: [], users: [] },
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
    bot: { token: "TOKEN", programs: [], response: [], users: [] },
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
    bot: { token: "TOKEN", programs: [], response: [], users: [] },
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

test("rules are rebuilt when programs change so new programs take effect", async () => {
  const store = setupStore({
    bot: {
      token: "TOKEN",
      programs: [program({ trigger: { type: "equals", value: "/a" } })],
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

  // Program A matches /a.
  await act(async () => {
    await poll.onmessage!({ data: [1, "alice", 42, "/a"] });
  });
  expect(send.postMessage).toHaveBeenCalledTimes(1);

  // Replace programs with program B matching /b.
  act(() => {
    store.dispatch(
      setPrograms([program({ trigger: { type: "equals", value: "/b" } })])
    );
  });

  // /a should no longer match.
  await act(async () => {
    await poll.onmessage!({ data: [2, "alice", 42, "/a"] });
  });

  // /b should match now.
  await act(async () => {
    await poll.onmessage!({ data: [3, "alice", 42, "/b"] });
  });
  expect(send.postMessage).toHaveBeenCalledTimes(2);
});

test("flows from the store are registered as rules and respond via the worker", async () => {
  const store = setupStore({
    bot: {
      token: "TOKEN",
      programs: [],
      flows: [SAMPLE_FLOWS[2].flow], // Quiz Flow
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

  // First message: any message transitions start -> q1, replying with the question.
  await act(async () => {
    await poll.onmessage!({ data: [1, "alice", 42, "hi"] });
  });
  expect(send.postMessage).toHaveBeenCalledWith([
    "https://api.telegram.org/botTOKEN/sendMessage",
    "What is 2 + 2?",
    42,
  ]);
});

test("a silent flow falls through to the next flow (multi-flow rules)", async () => {
  // First flow only matches /help (no fallback), so other messages decline.
  const silentFlow = (() => {
    const f = createFlow("Silent");
    const start = createFlowNode("start", { x: 0, y: 0 });
    const help = createFlowNode("state", { x: 120, y: 0 });
    help.data.label = "Help";
    help.data.replies = ["Help text"];
    f.startNodeId = start.id;
    f.nodes = [start, help];
    f.edges = [
      {
        id: "e1",
        source: start.id,
        target: help.id,
        data: { trigger: { type: "equals", value: "/help" } },
      },
    ];
    return f;
  })();
  const store = setupStore({
    bot: {
      token: "TOKEN",
      programs: [],
      flows: [silentFlow, SAMPLE_FLOWS[2].flow], // Silent, then Quiz Flow
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

  // Silent flow declines "hi" (no /help transition); the quiz flow answers.
  await act(async () => {
    await poll.onmessage!({ data: [1, "alice", 42, "hi"] });
  });
  expect(send.postMessage).toHaveBeenCalledWith([
    "https://api.telegram.org/botTOKEN/sendMessage",
    "What is 2 + 2?",
    42,
  ]);
});

test("flows keep independent per-user state through the worker", async () => {
  const store = setupStore({
    bot: {
      token: "TOKEN",
      programs: [],
      flows: [SAMPLE_FLOWS[2].flow], // Quiz Flow
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

  // alice (42) starts the quiz.
  await act(async () => {
    await poll.onmessage!({ data: [1, "alice", 42, "hi"] });
  });
  expect(send.postMessage).toHaveBeenLastCalledWith([
    "https://api.telegram.org/botTOKEN/sendMessage",
    "What is 2 + 2?",
    42,
  ]);

  // bob (7) starts the quiz too — still at the start, gets the question.
  await act(async () => {
    await poll.onmessage!({ data: [2, "bob", 7, "hi"] });
  });
  expect(send.postMessage).toHaveBeenLastCalledWith([
    "https://api.telegram.org/botTOKEN/sendMessage",
    "What is 2 + 2?",
    7,
  ]);

  // alice answers correctly — her state advanced to the question node.
  await act(async () => {
    await poll.onmessage!({ data: [4, "alice", 42, "4"] });
  });
  expect(send.postMessage).toHaveBeenLastCalledWith([
    "https://api.telegram.org/botTOKEN/sendMessage",
    "Correct! 🎉",
    42,
  ]);

  // bob's state is independent: he answered wrongly from the question node,
  // getting the wrong-answer branch instead of alice's correct one.
  await act(async () => {
    await poll.onmessage!({ data: [5, "bob", 7, "5"] });
  });
  expect(send.postMessage).toHaveBeenLastCalledWith([
    "https://api.telegram.org/botTOKEN/sendMessage",
    "Nope, try again!",
    7,
  ]);

  // bob's replies never included the correct answer, while alice got it
  // exactly once — proving the two users' flow states are independent.
  const messagesByUser = (userId: number) =>
    send.postMessage.mock.calls
      .filter((call: [string, string, number]) => call[0][2] === userId)
      .map((call: [string, string, number]) => call[0][1]);
  expect(messagesByUser(7)).not.toContain("Correct! 🎉");
  expect(messagesByUser(42)).toContain("Correct! 🎉");
  expect(send.postMessage.mock.calls).toHaveLength(4);
});

test("a flow with no matching transition sends no reply", async () => {
  const store = setupStore({
    bot: {
      token: "TOKEN",
      programs: [],
      flows: [SAMPLE_FLOWS[1].flow], // Echo Flow
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

  // First message: start -> menu, replies with the prompt.
  await act(async () => {
    await poll.onmessage!({ data: [1, "alice", 42, "hello"] });
  });
  expect(send.postMessage).toHaveBeenCalledTimes(1);

  // Second message from the menu with no matching transition: silent.
  await act(async () => {
    await poll.onmessage!({ data: [2, "alice", 42, "hello"] });
  });
  expect(send.postMessage).toHaveBeenCalledTimes(1);
});

test("a matched program still wins over a matching flow", async () => {
  const greet = program({ trigger: { type: "equals", value: "/start" } });
  const store = setupStore({
    bot: {
      token: "TOKEN",
      programs: [greet],
      flows: [SAMPLE_FLOWS[2].flow], // Quiz Flow
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

  // The program rule is registered before flow rules, so /start hits the
  // program and never advances the flow.
  await act(async () => {
    await poll.onmessage!({ data: [1, "alice", 42, "/start"] });
  });
  expect(send.postMessage).toHaveBeenLastCalledWith([
    "https://api.telegram.org/botTOKEN/sendMessage",
    "hi",
    42,
  ]);
});

test("auto-starts once when autoStart and token are set at load", () => {
  const store = setupStore({
    bot: {
      token: "TOKEN",
      programs: [],
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
      programs: [],
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
      programs: [],
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
    bot: { token: "", programs: [], response: [], users: [], autoStart: true, hydrated: false },
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
  expect(instances[0].postMessage).toHaveBeenCalledWith(
    "https://api.telegram.org/botTOKEN/getUpdates"
  );
});

test("does not auto-start when the token is added after load", () => {
  const store = setupStore({
    bot: { token: "", programs: [], response: [], users: [], autoStart: true, hydrated: true },
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
    bot: { token: "TOKEN", programs: [], response: [], users: [], autoStart: false, hydrated: true },
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
    bot: { token: "TOKEN", programs: [], response: [], users: [], autoStart: true, hydrated: false },
  });
  const { result } = renderHook(() => useBot(), { wrapper: wrapper(store) });

  expect(result.current.started).toBe(false);
  expect(instances.length).toBe(0);
});

test("manual stop is not overridden by the auto-start effect", () => {
  const store = setupStore({
    bot: {
      token: "TOKEN",
      programs: [],
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
    store.dispatch(setPrograms([]));
  });
  expect(result.current.started).toBe(false);
  expect(instances.length).toBe(2);
});

test("auto-starts exactly once under StrictMode", () => {
  const store = setupStore({
    bot: {
      token: "TOKEN",
      programs: [],
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
