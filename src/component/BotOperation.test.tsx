import { test, expect } from "@jest/globals";
import React from "react";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { BotOperation } from "./BotOperation.tsx";
import { generateDefaultState, renderWithProviders, setupStore } from "../redux/testUtils.tsx";

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

test("renders bot operation interface correctly", () => {
  const store = setupStore(generateDefaultState());
  const component = renderWithProviders(<BotOperation />, { store: store });
  expect(component).toMatchSnapshot();
});

test("shows 'Bot stopped' when not started and disables the Stop button", () => {
  const store = setupStore(generateDefaultState());
  renderWithProviders(<BotOperation />, { store });

  expect(screen.getByText(/Bot stopped/i)).toBeTruthy();
  expect((screen.getByRole("button", { name: "Stop" }) as HTMLButtonElement).disabled).toBe(true);
  expect((screen.getByRole("button", { name: "Start" }) as HTMLButtonElement).disabled).toBe(false);
});

test("full flow: matching poll message causes send_worker to post the program's action reply to the chat", async () => {
  const store = setupStore({
    bot: {
      token: "TOKEN",
      programs: [
        {
          id: "p1",
          name: "Greet",
          trigger: { type: "equals", value: "/start" },
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
        },
      ],
      response: [],
      users: [],
    },
  });
  renderWithProviders(<BotOperation />, { store });

  fireEvent.click(screen.getByRole("button", { name: "Start" }));

  await waitFor(() => expect(store.getState().bot.token).toBe("TOKEN"));

  expect(screen.getByText(/Bot started/i)).toBeTruthy();
  expect(instances.length).toBe(2);
  const poll = instances[0];
  const send = instances[1];

  // Simulate an incoming poll message matching the program trigger.
  await poll.onmessage!({ data: [1234, "alice", 42, "/start"] });

  expect(send.postMessage).toHaveBeenCalledWith([
    "https://api.telegram.org/botTOKEN/sendMessage",
    "hi",
    42,
  ]);
});

test("poll message that does not match any program does not trigger send_worker", async () => {
  const store = setupStore({
    bot: {
      token: "TOKEN",
      programs: [
        {
          id: "p1",
          name: "Greet",
          trigger: { type: "equals", value: "/start" },
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
        },
      ],
      response: [],
      users: [],
    },
  });
  renderWithProviders(<BotOperation />, { store });

  fireEvent.click(screen.getByRole("button", { name: "Start" }));

  await waitFor(() => expect(instances.length).toBe(2));

  const poll = instances[0];
  const send = instances[1];

  await poll.onmessage!({ data: [1234, "alice", 42, "/nope"] });

  expect(send.postMessage).not.toHaveBeenCalled();
});

test("a program with multiple actions sends every action's response to send_worker", async () => {
  const store = setupStore({
    bot: {
      token: "TOKEN",
      programs: [
        {
          id: "p1",
          name: "Multi",
          trigger: { type: "equals", value: "/start" },
          blocks: [
            {
              id: "b1",
              category: "action",
              kind: "reply",
              value: "hi",
              value2: "",
              fallback: "",
            },
            {
              id: "b2",
              category: "action",
              kind: "echo",
              value: "",
              value2: "",
              fallback: "",
            },
          ],
        },
      ],
      response: [],
      users: [],
    },
  });
  renderWithProviders(<BotOperation />, { store });

  fireEvent.click(screen.getByRole("button", { name: "Start" }));

  await waitFor(() => expect(instances.length).toBe(2));

  const poll = instances[0];
  const send = instances[1];

  await poll.onmessage!({ data: [1234, "alice", 42, "/start"] });

  expect(send.postMessage).toHaveBeenCalledTimes(2);
  expect(send.postMessage).toHaveBeenNthCalledWith(1, [
    "https://api.telegram.org/botTOKEN/sendMessage",
    "hi",
    42,
  ]);
  expect(send.postMessage).toHaveBeenNthCalledWith(2, [
    "https://api.telegram.org/botTOKEN/sendMessage",
    "/start",
    42,
  ]);
});

test("incoming poll message dispatches addResponse and addUser to the store", async () => {
  const store = setupStore({
    bot: {
      token: "TOKEN",
      programs: [],
      response: [],
      users: [],
    },
  });
  renderWithProviders(<BotOperation />, { store });

  fireEvent.click(screen.getByRole("button", { name: "Start" }));

  await waitFor(() => expect(instances.length).toBe(2));

  const poll = instances[0];
  await poll.onmessage!({ data: [1234, "alice", 42, "/start"] });

  expect(store.getState().bot.response).toEqual([
    { FromUser: "alice", UserID: 42, Message: "/start", TimeStamp: 1234 * 1000 },
  ]);
  expect(store.getState().bot.users).toEqual([{ Username: "alice", UserID: 42 }]);
});

test("clicking Stop terminates both workers and shows 'Bot stopped'", async () => {
  const store = setupStore({
    bot: { token: "TOKEN", programs: [], response: [], users: [] },
  });
  renderWithProviders(<BotOperation />, { store });

  fireEvent.click(screen.getByRole("button", { name: "Start" }));
  await waitFor(() => expect(instances.length).toBe(2));

  fireEvent.click(screen.getByRole("button", { name: "Stop" }));

  expect(instances[0].terminate).toHaveBeenCalledTimes(1);
  expect(instances[1].terminate).toHaveBeenCalledTimes(1);
  expect(screen.getByText(/Bot stopped/i)).toBeTruthy();
});

test("a transform + echo program sends the transformed message", async () => {
  const store = setupStore({
    bot: {
      token: "TOKEN",
      programs: [
        {
          id: "p1",
          name: "Shout",
          trigger: { type: "contains", value: "shout" },
          blocks: [
            {
              id: "b1",
              category: "transform",
              kind: "uppercase",
              value: "",
              value2: "",
              fallback: "",
            },
            {
              id: "b2",
              category: "action",
              kind: "echo",
              value: "",
              value2: "",
              fallback: "",
            },
          ],
        },
      ],
      response: [],
      users: [],
    },
  });
  renderWithProviders(<BotOperation />, { store });

  fireEvent.click(screen.getByRole("button", { name: "Start" }));

  await waitFor(() => expect(instances.length).toBe(2));

  const poll = instances[0];
  const send = instances[1];

  await poll.onmessage!({ data: [1234, "alice", 42, "shout hello"] });

  expect(send.postMessage).toHaveBeenCalledTimes(1);
  expect(send.postMessage).toHaveBeenCalledWith([
    "https://api.telegram.org/botTOKEN/sendMessage",
    "SHOUT HELLO",
    42,
  ]);
});

test("a failed logic block sends its fallback reply", async () => {
  const store = setupStore({
    bot: {
      token: "TOKEN",
      programs: [
        {
          id: "p1",
          name: "Short",
          trigger: { type: "contains", value: "/start" },
          blocks: [
            {
              id: "b1",
              category: "logic",
              kind: "lengthLess",
              value: "5",
              value2: "",
              fallback: "Too long",
            },
          ],
        },
      ],
      response: [],
      users: [],
    },
  });
  renderWithProviders(<BotOperation />, { store });

  fireEvent.click(screen.getByRole("button", { name: "Start" }));

  await waitFor(() => expect(instances.length).toBe(2));

  const poll = instances[0];
  const send = instances[1];

  // "/start long message" has length 18, not less than 5 -> fallback "Too long"
  await poll.onmessage!({ data: [1234, "alice", 42, "/start long message"] });

  expect(send.postMessage).toHaveBeenCalledTimes(1);
  expect(send.postMessage).toHaveBeenCalledWith([
    "https://api.telegram.org/botTOKEN/sendMessage",
    "Too long",
    42,
  ]);
});
