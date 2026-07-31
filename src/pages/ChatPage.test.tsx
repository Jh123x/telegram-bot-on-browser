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

test("shows an empty state when there are no users", () => {
  const store = setupStore(generateDefaultState());
  renderWithProviders(<ChatPage bot={new BrowserBot("TOKEN")} />, { store });

  expect(
    screen.getByText("No users yet — start the bot and wait for users to message you.")
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

test("composer does nothing when no bot is provided", () => {
  const store = convoStore();
  renderWithProviders(<ChatPage />, { store });

  fireEvent.click(screen.getByRole("button", { name: /alice/ }));
  expect(() => {
    const textbox = screen.getByRole("textbox");
    fireEvent.change(textbox, { target: { value: "no bot" } });
  }).not.toThrow();
});
