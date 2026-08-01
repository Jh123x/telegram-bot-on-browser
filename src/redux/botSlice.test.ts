import { test, expect } from "@jest/globals";
import { configureStore } from "@reduxjs/toolkit";
import { botSlice, defaultBotState } from "./botSlice";
import { BotWithConfig, Response, User } from "./types";
import { Flow } from "../interfaces/flow.ts";

function makeFlow(overrides: Partial<Flow> = {}): Flow {
  return {
    id: "f1",
    name: "Order",
    startNodeId: "n1",
    nodes: [
      { id: "n1", type: "start", position: { x: 0, y: 0 }, data: { label: "Start", replies: [] } },
    ],
    edges: [],
    ...overrides,
  };
}

function setupStore(preloadedState?) {
  return configureStore<BotWithConfig>({
    reducer: { bot: botSlice.reducer },
    preloadedState: preloadedState ?? { bot: defaultBotState },
  });
}

test("default state has hydrated false", () => {
  const store = setupStore();
  expect(store.getState().bot.hydrated).toBe(false);
});

test("setHydrated stores the flag", () => {
  const store = setupStore();
  expect(store.getState().bot.hydrated).toBe(false);

  store.dispatch(botSlice.actions.setHydrated(true));
  expect(store.getState().bot.hydrated).toBe(true);

  store.dispatch(botSlice.actions.setHydrated(false));
  expect(store.getState().bot.hydrated).toBe(false);
});

test("setSelectedUserId stores the selected user id", () => {
  const store = setupStore();
  expect(store.getState().bot.selectedUserId).toBeNull();

  store.dispatch(botSlice.actions.setSelectedUserId(42));
  expect(store.getState().bot.selectedUserId).toBe(42);

  store.dispatch(botSlice.actions.setSelectedUserId(null));
  expect(store.getState().bot.selectedUserId).toBeNull();
});

test("setAutoStart stores the flag", () => {
  const store = setupStore();
  expect(store.getState().bot.autoStart).toBe(false);

  store.dispatch(botSlice.actions.setAutoStart(true));
  expect(store.getState().bot.autoStart).toBe(true);

  store.dispatch(botSlice.actions.setAutoStart(false));
  expect(store.getState().bot.autoStart).toBe(false);
});

test("default state has pollRate 5 seconds", () => {
  const store = setupStore();
  expect(store.getState().bot.pollRate).toBe(5);
});

test("setPollRate stores the poll rate in seconds", () => {
  const store = setupStore();

  store.dispatch(botSlice.actions.setPollRate(2));
  expect(store.getState().bot.pollRate).toBe(2);

  store.dispatch(botSlice.actions.setPollRate(30));
  expect(store.getState().bot.pollRate).toBe(30);
});

test("resetAll restores the default state", () => {
  const store = setupStore();
  store.dispatch(
    botSlice.actions.setFlows([makeFlow(), makeFlow({ id: "f2", name: "Other" })])
  );
  store.dispatch(botSlice.actions.setToken("abc:token"));
  store.dispatch(botSlice.actions.setAutoStart(true));
  store.dispatch(botSlice.actions.setSelectedUserId(42));
  store.dispatch(botSlice.actions.setPollRate(2));

  expect(store.getState().bot.flows).toHaveLength(2);
  expect(store.getState().bot.autoStart).toBe(true);
  expect(store.getState().bot.pollRate).toBe(2);

  store.dispatch(botSlice.actions.resetAll());

  expect(store.getState().bot).toEqual(defaultBotState);
});

test("setResponse replaces the response array", () => {
  const store = setupStore();
  store.dispatch(
    botSlice.actions.addResponse({
      FromUser: "alice",
      UserID: 42,
      Message: "hi",
      TimeStamp: 1000,
    })
  );
  expect(store.getState().bot.response).toHaveLength(1);

  const responses: Response[] = [
    { FromUser: "carol", UserID: 9, Message: "hey", TimeStamp: 2000 },
    {
      FromUser: "Bot",
      UserID: 9,
      Message: "hello!",
      TimeStamp: 3000,
      fromBot: true,
    },
  ];
  store.dispatch(botSlice.actions.setResponse(responses));
  expect(store.getState().bot.response).toEqual(responses);
});

test("setUsers replaces the users array", () => {
  const store = setupStore();
  store.dispatch(
    botSlice.actions.addUser({ Username: "alice", UserID: 42 })
  );
  expect(store.getState().bot.users).toHaveLength(1);

  const users: User[] = [{ Username: "carol", UserID: 9 }];
  store.dispatch(botSlice.actions.setUsers(users));
  expect(store.getState().bot.users).toEqual(users);
});

test("default state has empty flows", () => {
  const store = setupStore();
  expect(store.getState().bot.flows).toEqual([]);
});

test("setFlows replaces the flows array", () => {
  const store = setupStore();
  const flows: Flow[] = [makeFlow(), makeFlow({ id: "f2" })];
  store.dispatch(botSlice.actions.setFlows(flows));
  expect(store.getState().bot.flows).toEqual(flows);
});

test("addFlow appends a flow", () => {
  const store = setupStore();
  store.dispatch(botSlice.actions.addFlow(makeFlow()));
  expect(store.getState().bot.flows).toEqual([makeFlow()]);
});

test("updateFlow replaces the flow with matching id and leaves others", () => {
  const store = setupStore();
  store.dispatch(
    botSlice.actions.setFlows([
      makeFlow(),
      makeFlow({ id: "f2", name: "Other" }),
    ])
  );
  store.dispatch(
    botSlice.actions.updateFlow(
      makeFlow({ id: "f1", name: "Updated", startNodeId: "n9" })
    )
  );
  const state = store.getState().bot.flows;
  expect(state).toHaveLength(2);
  expect(state[0].name).toBe("Updated");
  expect(state[0].startNodeId).toBe("n9");
  expect(state[1].name).toBe("Other");
});

test("updateFlow with unknown id leaves state unchanged", () => {
  const store = setupStore();
  const flows = [makeFlow()];
  store.dispatch(botSlice.actions.setFlows(flows));
  store.dispatch(botSlice.actions.updateFlow(makeFlow({ id: "unknown" })));
  expect(store.getState().bot.flows).toEqual(flows);
});

test("setToken stores the token", () => {
  const store = setupStore();
  expect(store.getState().bot.token).toBe("");

  store.dispatch(botSlice.actions.setToken("abc:secret"));
  expect(store.getState().bot.token).toBe("abc:secret");

  store.dispatch(botSlice.actions.setToken("xyz:other"));
  expect(store.getState().bot.token).toBe("xyz:other");
});

test("addUser appends a user when the pair does not already exist", () => {
  const store = setupStore();
  store.dispatch(botSlice.actions.addUser({ Username: "alice", UserID: 42 }));
  store.dispatch(botSlice.actions.addUser({ Username: "carol", UserID: 9 }));
  expect(store.getState().bot.users).toEqual([
    { Username: "alice", UserID: 42 },
    { Username: "carol", UserID: 9 },
  ]);
});

test("addUser skips a user when both UserID and Username already exist", () => {
  const store = setupStore();
  store.dispatch(botSlice.actions.addUser({ Username: "alice", UserID: 42 }));
  // Same pair again must be ignored.
  store.dispatch(botSlice.actions.addUser({ Username: "alice", UserID: 42 }));
  // Same UserID with a different Username is treated as a distinct user.
  store.dispatch(botSlice.actions.addUser({ Username: "a.l.i.c.e", UserID: 42 }));
  expect(store.getState().bot.users).toEqual([
    { Username: "alice", UserID: 42 },
    { Username: "a.l.i.c.e", UserID: 42 },
  ]);
});

test("addResponse appends responses in order", () => {
  const store = setupStore();
  store.dispatch(
    botSlice.actions.addResponse({ FromUser: "alice", UserID: 42, Message: "first", TimeStamp: 1 })
  );
  store.dispatch(
    botSlice.actions.addResponse({ FromUser: "bot", UserID: 42, Message: "second", TimeStamp: 2, fromBot: true })
  );
  expect(store.getState().bot.response).toEqual([
    { FromUser: "alice", UserID: 42, Message: "first", TimeStamp: 1 },
    { FromUser: "bot", UserID: 42, Message: "second", TimeStamp: 2, fromBot: true },
  ]);
});

test("resetAll returns fresh arrays (no aliasing of prior state)", () => {
  const store = setupStore();
  store.dispatch(botSlice.actions.setFlows([makeFlow()]));
  store.dispatch(
    botSlice.actions.setResponse([{ FromUser: "alice", UserID: 42, Message: "hi", TimeStamp: 1 }])
  );
  store.dispatch(botSlice.actions.setUsers([{ Username: "alice", UserID: 42 }]));

  const before = store.getState().bot;
  store.dispatch(botSlice.actions.resetAll());
  const after = store.getState().bot;

  expect(after).toEqual(defaultBotState);
  // The arrays must be distinct references, not the pre-reset lists.
  expect(after.flows).not.toBe(before.flows);
  expect(after.response).not.toBe(before.response);
  expect(after.users).not.toBe(before.users);
});
