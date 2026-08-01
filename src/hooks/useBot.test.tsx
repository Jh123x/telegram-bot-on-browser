import { test, expect } from "@jest/globals";
import React from "react";
import { act, renderHook } from "@testing-library/react";
import { Provider } from "react-redux";
import { useBot } from "./useBot.ts";
import { setupStore } from "../redux/testUtils.tsx";
import { setAutoStart, setHydrated, setPrograms, setToken } from "../redux/botSlice.ts";
import { Program } from "../interfaces/program.ts";

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
