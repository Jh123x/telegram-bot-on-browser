import { test, expect } from "@jest/globals";
import React from "react";
import { fireEvent, screen } from "@testing-library/react";
import { generateDefaultState, renderWithProviders, setupStore } from "../redux/testUtils.tsx";
import { ChatPage } from "./ChatPage.tsx";
import { BrowserBot } from "../interfaces/bot";

beforeEach(() => {
  (global as any).Worker = class {
    postMessage() {}
    terminate() {}
  };
});

afterEach(() => {
  delete (global as any).Worker;
});

const convoStore = () =>
  setupStore({
    bot: {
      token: "TOKEN",
      programs: [],
      response: [
        { FromUser: "alice", UserID: 42, Message: "hi", TimeStamp: 2000 },
        { FromUser: "Bot", UserID: 42, Message: "hello there!", TimeStamp: 3000, fromBot: true },
        { FromUser: "alice", UserID: 42, Message: "again", TimeStamp: 1000 },
        { FromUser: "bob", UserID: 7, Message: "yo", TimeStamp: 1500 },
      ],
      users: [
        { Username: "alice", UserID: 42 },
        { Username: "bob", UserID: 7 },
      ],
    },
  });

test("renders the chat page with an informative heading", () => {
  const store = setupStore(generateDefaultState());
  renderWithProviders(<ChatPage bot={new BrowserBot("TOKEN")} />, { store });

  expect(screen.getByRole("heading", { name: "Chat" })).toBeTruthy();
});

test("shows an empty state when there are no real users", () => {
  const store = setupStore(generateDefaultState());
  renderWithProviders(<ChatPage bot={new BrowserBot("TOKEN")} />, { store });

  expect(
    screen.getByText("No real users yet — start the bot to see them here, or try the Test User conversation.")
  ).toBeTruthy();
});

test("when users list is empty, derives users from the response list", () => {
  const store = setupStore({
    bot: {
      token: "TOKEN",
      programs: [],
      response: [{ FromUser: "alice", UserID: 42, Message: "hi", TimeStamp: 1000 }],
      users: [],
    },
  });
  renderWithProviders(<ChatPage bot={new BrowserBot("TOKEN")} />, { store });

  expect(screen.getByRole("button", { name: /alice/ })).toBeTruthy();
});

test("lists users and shows only the selected user's messages and bot replies in chronological order", () => {
  renderWithProviders(<ChatPage bot={new BrowserBot("TOKEN")} />, { store: convoStore() });

  // Both users are listed.
  expect(screen.getByRole("button", { name: /alice/ })).toBeTruthy();
  expect(screen.getByRole("button", { name: /bob/ })).toBeTruthy();

  // Select alice.
  fireEvent.click(screen.getByRole("button", { name: /alice/ }));

  // bob's message is not shown.
  expect(screen.queryByText("yo")).toBeNull();

  // alice's incoming messages + bot replies, sorted by timestamp.
  const rows = screen.getAllByTestId(/^chat-message-/);
  expect(rows).toHaveLength(3);
  expect(rows[0]).toHaveTextContent("again");
  expect(rows[1]).toHaveTextContent("hi");
  expect(rows[2]).toHaveTextContent("hello there!");
});

test("switching to another user switches the conversation", () => {
  renderWithProviders(<ChatPage bot={new BrowserBot("TOKEN")} />, { store: convoStore() });

  fireEvent.click(screen.getByRole("button", { name: /alice/ }));
  expect(screen.getByText("again")).toBeTruthy();

  fireEvent.click(screen.getByRole("button", { name: /bob/ }));
  expect(screen.queryByText("again")).toBeNull();
  expect(screen.getByText("yo")).toBeTruthy();
});

test("shows a no-messages state when the selected user has no messages", () => {
  const store = setupStore({
    bot: {
      token: "TOKEN",
      programs: [],
      response: [],
      users: [{ Username: "alice", UserID: 42 }],
    },
  });
  renderWithProviders(<ChatPage bot={new BrowserBot("TOKEN")} />, { store });

  fireEvent.click(screen.getByRole("button", { name: /alice/ }));
  expect(screen.getByText("No messages yet.")).toBeTruthy();
});

test("composer is disabled until a user is selected, then sends to the selected user and clears the input", () => {
  const bot = new BrowserBot("123:TOKEN");
  const spy = jest.spyOn(bot, "sendMessage");
  renderWithProviders(<ChatPage bot={bot} />, { store: convoStore() });

  // No user selected yet -> Send disabled.
  expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();

  fireEvent.click(screen.getByRole("button", { name: /alice/ }));

  const textbox = screen.getByRole("textbox");
  fireEvent.change(textbox, { target: { value: "nice!" } });
  fireEvent.click(screen.getByRole("button", { name: "Send" }));

  expect(spy).toHaveBeenCalledWith(42, "nice!");
  expect(screen.getByRole("textbox")).toHaveValue("");
});

test("sending a message dispatches a fromBot response for the selected user into the store", () => {
  const store = convoStore();
  renderWithProviders(<ChatPage bot={new BrowserBot("123:TOKEN")} />, { store });

  fireEvent.click(screen.getByRole("button", { name: /alice/ }));

  const textbox = screen.getByRole("textbox");
  fireEvent.change(textbox, { target: { value: "hello" } });
  fireEvent.click(screen.getByRole("button", { name: "Send" }));

  const responses = store.getState().bot.response;
  expect(
    responses.some(
      (r) =>
        r.Message === "hello" &&
        r.fromBot === true &&
        r.UserID === 42 &&
        r.FromUser === "Bot"
    )
  ).toBe(true);
});

test("a manually sent message appears in the conversation feed as a Bot bubble", () => {
  renderWithProviders(<ChatPage bot={new BrowserBot("123:TOKEN")} />, {
    store: convoStore(),
  });

  fireEvent.click(screen.getByRole("button", { name: /alice/ }));

  const textbox = screen.getByRole("textbox");
  fireEvent.change(textbox, { target: { value: "hello" } });
  fireEvent.click(screen.getByRole("button", { name: "Send" }));

  expect(screen.getByText("hello")).toBeTruthy();
});

test("composer does nothing when no bot is provided", () => {
  const store = convoStore();
  renderWithProviders(<ChatPage />, { store });

  fireEvent.click(screen.getByRole("button", { name: /alice/ }));
  expect(() => {
    const textbox = screen.getByRole("textbox");
    fireEvent.change(textbox, { target: { value: "no bot" } });
  }).not.toThrow();
});

test("chat panel fills the available page height", () => {
  const store = convoStore();
  renderWithProviders(<ChatPage bot={new BrowserBot("TOKEN")} />, { store });

  const panel = screen.getByTestId("chat-panel");
  expect(panel).toHaveStyle({ flexGrow: "1" });
});

const greetStore = () =>
  setupStore({
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
              value: "Welcome!",
              value2: "",
              fallback: "",
            },
          ],
        },
      ],
      response: [{ FromUser: "alice", UserID: 42, Message: "hi", TimeStamp: 1000 }],
      users: [{ Username: "alice", UserID: 42 }],
    },
  });

test("renders a Test User conversation in the sidebar like any other user", () => {
  const store = greetStore();
  renderWithProviders(<ChatPage bot={new BrowserBot("TOKEN")} />, { store });

  expect(screen.getByRole("button", { name: /alice/ })).toBeTruthy();
  expect(screen.getByRole("button", { name: /Test User/ })).toBeTruthy();
});

test("selecting the Test User simulates replies as bubbles without sending to Telegram", () => {
  const store = greetStore();
  const bot = new BrowserBot("123:TOKEN");
  const spy = jest.spyOn(bot, "sendMessage");
  renderWithProviders(<ChatPage bot={bot} />, { store });

  fireEvent.click(screen.getByRole("button", { name: /Test User/ }));

  const textbox = screen.getByRole("textbox");
  expect(textbox).not.toBeDisabled();
  fireEvent.change(textbox, { target: { value: "/start" } });
  fireEvent.click(screen.getByRole("button", { name: "Simulate" }));

  // Nothing is sent to Telegram, but the reply shows in the feed.
  expect(spy).not.toHaveBeenCalled();
  expect(screen.getByText("Welcome!")).toBeTruthy();
  expect(screen.getByText(/Matched program: Greet/)).toBeTruthy();
  expect(screen.getByText("/start")).toBeTruthy();
  expect(screen.getByText(/Test User ·/)).toBeTruthy();
});

test("Test User with no matching program shows the silent note", () => {
  const store = convoStore();
  renderWithProviders(<ChatPage bot={new BrowserBot("TOKEN")} />, { store });

  fireEvent.click(screen.getByRole("button", { name: /Test User/ }));

  const textbox = screen.getByRole("textbox");
  fireEvent.change(textbox, { target: { value: "nope" } });
  fireEvent.click(screen.getByRole("button", { name: "Simulate" }));

  expect(screen.getByText(/No program matched/)).toBeTruthy();
});

test("Test User simulated messages do not touch the store", () => {
  const store = convoStore();
  renderWithProviders(<ChatPage bot={new BrowserBot("123:TOKEN")} />, { store });

  fireEvent.click(screen.getByRole("button", { name: /Test User/ }));
  const before = store.getState().bot.response.length;

  const textbox = screen.getByRole("textbox");
  fireEvent.change(textbox, { target: { value: "/start" } });
  fireEvent.click(screen.getByRole("button", { name: "Simulate" }));

  expect(store.getState().bot.response.length).toBe(before);
});

test("Test User works with no real users and never sends to Telegram", () => {
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
              value: "Welcome!",
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
  const bot = new BrowserBot("123:TOKEN");
  const spy = jest.spyOn(bot, "sendMessage");
  renderWithProviders(<ChatPage bot={bot} />, { store });

  // The composer starts disabled until a conversation is selected.
  expect(screen.getByRole("textbox")).toBeDisabled();

  fireEvent.click(screen.getByRole("button", { name: /Test User/ }));

  const textbox = screen.getByRole("textbox");
  expect(textbox).not.toBeDisabled();
  fireEvent.change(textbox, { target: { value: "/start" } });
  fireEvent.click(screen.getByRole("button", { name: "Simulate" }));

  expect(screen.getByText("Welcome!")).toBeTruthy();
  expect(spy).not.toHaveBeenCalled();
});

test("selecting a real user sends for real again", () => {
  const store = convoStore();
  const bot = new BrowserBot("123:TOKEN");
  const spy = jest.spyOn(bot, "sendMessage");
  renderWithProviders(<ChatPage bot={bot} />, { store });

  fireEvent.click(screen.getByRole("button", { name: /alice/ }));

  const textbox = screen.getByRole("textbox");
  fireEvent.change(textbox, { target: { value: "hi" } });
  fireEvent.click(screen.getByRole("button", { name: "Send" }));

  expect(spy).toHaveBeenCalledWith(42, "hi");
});
