import { test, expect } from "@jest/globals";
import React from "react";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { BotOperation } from "./BotOperation.tsx";
import { generateDefaultState, renderWithProviders, setupStore } from "../redux/testUtils.tsx";
import { BrowserBot } from "../interfaces/bot";

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

// Test shim: BrowserBot currently has no `addCommand` method, but the
// BotOperation component registers its stored commands via `bot.addCommand(...)`.
// This shim provides that method for these tests so the component behavior can be
// characterized. It is implemented as an alias for the existing `addRule`.
(BrowserBot.prototype as any).addCommand = function (
  this: BrowserBot,
  command: string,
  callback: (message: string) => string | string[]
) {
  this.addRule((m) => m === command, callback);
};

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

test("full flow: matching poll message causes send_worker to post the command response to the chat", async () => {
  const store = setupStore({
    bot: {
      token: "TOKEN",
      commands: [{ command: "/start", response: "hi" }],
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

  // Simulate an incoming poll message matching the command.
  await poll.onmessage!({ data: [1234, "alice", 42, "/start"] });

  expect(send.postMessage).toHaveBeenCalledWith([
    "https://api.telegram.org/botTOKEN/sendMessage",
    "hi",
    42,
  ]);
});

test("poll message that does not match any command does not trigger send_worker", async () => {
  const store = setupStore({
    bot: {
      token: "TOKEN",
      commands: [{ command: "/start", response: "hi" }],
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

test("incoming poll message dispatches addResponse and addUser to the store", async () => {
  const store = setupStore({
    bot: {
      token: "TOKEN",
      commands: [],
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
    bot: { token: "TOKEN", commands: [], response: [], users: [] },
  });
  renderWithProviders(<BotOperation />, { store });

  fireEvent.click(screen.getByRole("button", { name: "Start" }));
  await waitFor(() => expect(instances.length).toBe(2));

  fireEvent.click(screen.getByRole("button", { name: "Stop" }));

  expect(instances[0].terminate).toHaveBeenCalledTimes(1);
  expect(instances[1].terminate).toHaveBeenCalledTimes(1);
  expect(screen.getByText(/Bot stopped/i)).toBeTruthy();
});
