import { test, expect, vi } from "vitest";
import React from "react";
import { fireEvent, screen } from "@testing-library/react";
import { act } from "@testing-library/react";
import { generateDefaultState, renderWithProviders, setupStore } from "../redux/testUtils.tsx";
import { ChatPage } from "./ChatPage.tsx";
import { BrowserBot } from "../interfaces/bot";
import { SAMPLE_FLOWS } from "../logic/flowSamples.ts";
import { createFlow, createFlowNode } from "../logic/flow.ts";

beforeEach(() => {
  (global as any).Worker = class {
    postMessage() {}
    terminate() {}
  };
});

afterEach(() => {
  delete (global as any).Worker;
  (URL as any).createObjectURL = undefined;
  (URL as any).revokeObjectURL = undefined;
  vi.restoreAllMocks();
});

const convoStore = () =>
  setupStore({
    bot: {
      token: "TOKEN",
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
      response: [],
      users: [{ Username: "alice", UserID: 42 }],
    },
  });
  renderWithProviders(<ChatPage bot={new BrowserBot("TOKEN")} />, { store });

  fireEvent.click(screen.getByRole("button", { name: /alice/ }));
  expect(screen.getByText("No messages yet.")).toBeTruthy();
});

test("composer starts enabled with the Test User simulated, then sends to a selected real user and clears the input", () => {
  const bot = new BrowserBot("123:TOKEN");
  const spy = vi.spyOn(bot, "sendMessage");
  renderWithProviders(<ChatPage bot={bot} />, { store: convoStore() });

  // Nothing selected yet -> Test User is auto-selected, so the composer is
  // enabled with a Simulate button (nothing is sent to Telegram).
  expect(screen.getByRole("button", { name: "Simulate" })).not.toBeDisabled();

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

const welcomeFlowStore = () =>
  setupStore({
    bot: {
      token: "TOKEN",
      flows: [SAMPLE_FLOWS[0].flow], // Welcome Flow
      response: [{ FromUser: "alice", UserID: 42, Message: "hi", TimeStamp: 1000 }],
      users: [{ Username: "alice", UserID: 42 }],
    },
  });

test("renders a Test User conversation in the sidebar like any other user", () => {
  const store = welcomeFlowStore();
  renderWithProviders(<ChatPage bot={new BrowserBot("TOKEN")} />, { store });

  expect(screen.getByRole("button", { name: /alice/ })).toBeTruthy();
  expect(screen.getByRole("button", { name: /Test User/ })).toBeTruthy();
});

test("selecting the Test User simulates replies as bubbles without sending to Telegram", () => {
  const store = welcomeFlowStore();
  const bot = new BrowserBot("123:TOKEN");
  const spy = vi.spyOn(bot, "sendMessage");
  renderWithProviders(<ChatPage bot={bot} />, { store });

  fireEvent.click(screen.getByRole("button", { name: /Test User/ }));

  const textbox = screen.getByRole("textbox");
  expect(textbox).not.toBeDisabled();
  fireEvent.change(textbox, { target: { value: "/start" } });
  fireEvent.click(screen.getByRole("button", { name: "Simulate" }));

  // Nothing is sent to Telegram, but the flow's replies show in the feed.
  expect(spy).not.toHaveBeenCalled();
  expect(screen.getByText("Welcome! I'm a browser bot 🤖")).toBeTruthy();
  expect(screen.getByText("Try /echo or say hi.")).toBeTruthy();
  expect(screen.getByText(/Matched flow: Welcome Flow/)).toBeTruthy();
  expect(screen.getByText("/start")).toBeTruthy();
  expect(screen.getByText(/Test User ·/)).toBeTruthy();
});

test("Test User with no matching flow shows the silent note", () => {
  const store = convoStore();
  renderWithProviders(<ChatPage bot={new BrowserBot("TOKEN")} />, { store });

  fireEvent.click(screen.getByRole("button", { name: /Test User/ }));

  const textbox = screen.getByRole("textbox");
  fireEvent.change(textbox, { target: { value: "nope" } });
  fireEvent.click(screen.getByRole("button", { name: "Simulate" }));

  expect(screen.getByText(/No flow matched/)).toBeTruthy();
});

const flowStore = () =>
  setupStore({
    bot: {
      token: "TOKEN",
      flows: [SAMPLE_FLOWS[2].flow], // Greeting Check
      response: [],
      users: [],
    },
  });

test("Test User preview responds to flows, sharing the production per-user path", () => {
  const store = flowStore();
  renderWithProviders(<ChatPage bot={new BrowserBot("TOKEN")} />, { store });

  fireEvent.click(screen.getByRole("button", { name: /Test User/ }));

  const textbox = screen.getByRole("textbox");

  // "hi" contains "hi", so the condition takes the if branch → greeting.
  fireEvent.change(textbox, { target: { value: "hi" } });
  fireEvent.click(screen.getByRole("button", { name: "Simulate" }));
  expect(screen.getByText("Hello! 👋")).toBeTruthy();
  // One simulation → one matched-flow note.
  expect(screen.getAllByText(/Matched flow: Greeting Check/)).toHaveLength(1);

  // The runtime is stateless, so a non-matching message re-runs from the
  // start node and takes the else branch.
  fireEvent.change(textbox, { target: { value: "hey" } });
  fireEvent.click(screen.getByRole("button", { name: "Simulate" }));
  expect(screen.getByText("Say hi!")).toBeTruthy();
  // Two simulations → two matched-flow notes (one per message).
  expect(screen.getAllByText(/Matched flow: Greeting Check/)).toHaveLength(2);
});

test("Test User preview with no flow response shows the silent note", () => {
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
  renderWithProviders(<ChatPage bot={new BrowserBot("TOKEN")} />, { store });

  fireEvent.click(screen.getByRole("button", { name: /Test User/ }));

  const textbox = screen.getByRole("textbox");
  // "hello" does not equal "/secret" and there is no else edge → silent.
  fireEvent.change(textbox, { target: { value: "hello" } });
  fireEvent.click(screen.getByRole("button", { name: "Simulate" }));
  expect(screen.getByText(/No flow matched/)).toBeTruthy();
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
      flows: [SAMPLE_FLOWS[0].flow], // Welcome Flow
      response: [],
      users: [],
    },
  });
  const bot = new BrowserBot("123:TOKEN");
  const spy = vi.spyOn(bot, "sendMessage");
  renderWithProviders(<ChatPage bot={bot} />, { store });

  // With no real users, the Test User is auto-selected so the composer starts
  // enabled (nothing is ever sent to Telegram).
  expect(screen.getByRole("textbox")).not.toBeDisabled();
  expect(screen.getByRole("button", { name: "Simulate" })).not.toBeDisabled();

  fireEvent.click(screen.getByRole("button", { name: /Test User/ }));

  const textbox = screen.getByRole("textbox");
  expect(textbox).not.toBeDisabled();
  fireEvent.change(textbox, { target: { value: "/start" } });
  fireEvent.click(screen.getByRole("button", { name: "Simulate" }));

  expect(screen.getByText("Welcome! I'm a browser bot 🤖")).toBeTruthy();
  expect(spy).not.toHaveBeenCalled();
});

test("selecting a real user sends for real again", () => {
  const store = convoStore();
  const bot = new BrowserBot("123:TOKEN");
  const spy = vi.spyOn(bot, "sendMessage");
  renderWithProviders(<ChatPage bot={bot} />, { store });

  fireEvent.click(screen.getByRole("button", { name: /alice/ }));

  const textbox = screen.getByRole("textbox");
  fireEvent.change(textbox, { target: { value: "hi" } });
  fireEvent.click(screen.getByRole("button", { name: "Send" }));

  expect(spy).toHaveBeenCalledWith(42, "hi");
});

test("selects the Test User by default when nothing is selected", () => {
  const store = convoStore();
  renderWithProviders(<ChatPage bot={new BrowserBot("TOKEN")} />, { store });

  // No selectedUserId in state (defaults to null) -> Test User conversation
  // is auto-selected.
  expect(store.getState().bot.selectedUserId).toBeNull();
  const testUserButton = screen.getByRole("button", { name: /Test User/ });
  expect(
    testUserButton.classList.contains("Mui-selected") ||
      testUserButton.getAttribute("aria-selected") === "true"
  ).toBe(true);

  // Composer is enabled and shows the Simulate action for the Test User.
  expect(screen.getByRole("textbox")).not.toBeDisabled();
  expect(screen.getByRole("button", { name: "Simulate" })).not.toBeDisabled();
});

test("remembers the selected user when navigating back to Chat", () => {
  const store = convoStore();
  const { unmount } = renderWithProviders(
    <ChatPage bot={new BrowserBot("TOKEN")} />,
    { store }
  );

  fireEvent.click(screen.getByRole("button", { name: /alice/ }));
  expect(screen.getByText("again")).toBeTruthy();

  // Simulate a tab switch: ChatPage unmounts entirely.
  unmount();

  // Remount with the SAME store — the selection should be restored.
  renderWithProviders(<ChatPage bot={new BrowserBot("TOKEN")} />, { store });

  expect(screen.getByRole("textbox")).not.toBeDisabled();
  expect(screen.getByRole("button", { name: "Send" })).not.toBeDisabled();
  expect(screen.getByText("again")).toBeTruthy();
});

test("falls back to the Test User when the remembered user no longer exists", () => {
  const store = setupStore({
    bot: {
      token: "TOKEN",
      response: [],
      users: [{ Username: "alice", UserID: 42 }],
      selectedUserId: 999,
    },
  });
  renderWithProviders(<ChatPage bot={new BrowserBot("TOKEN")} />, { store });

  const testUserButton = screen.getByRole("button", { name: /Test User/ });
  expect(
    testUserButton.classList.contains("Mui-selected") ||
      testUserButton.getAttribute("aria-selected") === "true"
  ).toBe(true);
  expect(screen.getByRole("button", { name: "Simulate" })).not.toBeDisabled();
});

const readBlob = (blob: Blob) =>
  new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.readAsText(blob);
  });

test("renders Export chat and Import chat buttons", () => {
  renderWithProviders(<ChatPage bot={new BrowserBot("TOKEN")} />, {
    store: convoStore(),
  });

  expect(screen.getByRole("button", { name: "Export chat" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Import chat" })).toBeTruthy();
  expect(screen.getByTestId("import-chat-input")).toBeTruthy();
  expect(screen.queryByTestId("chat-import-status")).toBeNull();
});

test("export chat downloads a JSON file with users and responses", async () => {
  (URL as any).createObjectURL = vi.fn(() => "blob:mock");
  (URL as any).revokeObjectURL = vi.fn();
  const clickSpy = vi
    .spyOn(HTMLAnchorElement.prototype, "click")
    .mockImplementation(() => {});
  let createdAnchor: HTMLAnchorElement | null = null;
  const originalCreateElement = document.createElement.bind(document);
  vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
    const el = originalCreateElement(tag);
    if (tag === "a") createdAnchor = el as HTMLAnchorElement;
    return el;
  });

  renderWithProviders(<ChatPage bot={new BrowserBot("TOKEN")} />, {
    store: convoStore(),
  });

  fireEvent.click(screen.getByRole("button", { name: "Export chat" }));

  expect((URL as any).createObjectURL).toHaveBeenCalledTimes(1);
  const blob: Blob = (URL as any).createObjectURL.mock.calls[0][0];
  const parsed = JSON.parse(await readBlob(blob));

  expect(parsed).toEqual({
    version: 1,
    users: [
      { Username: "alice", UserID: 42 },
      { Username: "bob", UserID: 7 },
    ],
    response: [
      { FromUser: "alice", UserID: 42, Message: "hi", TimeStamp: 2000 },
      {
        FromUser: "Bot",
        UserID: 42,
        Message: "hello there!",
        TimeStamp: 3000,
        fromBot: true,
      },
      { FromUser: "alice", UserID: 42, Message: "again", TimeStamp: 1000 },
      { FromUser: "bob", UserID: 7, Message: "yo", TimeStamp: 1500 },
    ],
  });
  expect(clickSpy).toHaveBeenCalledTimes(1);
  expect((URL as any).revokeObjectURL).toHaveBeenCalledWith("blob:mock");
  expect(createdAnchor?.download).toBe("browserbot-chat.json");
});

test("import chat replaces the store's users and responses", async () => {
  const store = setupStore({
    bot: {
      token: "TOKEN",
      response: [],
      users: [],
    },
  });
  renderWithProviders(<ChatPage bot={new BrowserBot("TOKEN")} />, { store });

  const file = new File(
    [
      JSON.stringify({
        version: 1,
        users: [{ Username: "carol", UserID: 9 }],
        response: [
          { FromUser: "carol", UserID: 9, Message: "hey", TimeStamp: 1000 },
        ],
      }),
    ],
    "chat.json",
    { type: "application/json" }
  );

  fireEvent.change(screen.getByTestId("import-chat-input"), {
    target: { files: [file] },
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 10));
  });

  expect(store.getState().bot.users).toEqual([
    { Username: "carol", UserID: 9 },
  ]);
  expect(store.getState().bot.response).toEqual([
    { FromUser: "carol", UserID: 9, Message: "hey", TimeStamp: 1000 },
  ]);
  expect(screen.getByTestId("chat-import-status").textContent).toContain(
    "Chat imported."
  );
});

test("import chat with a non-JSON file shows an error and changes nothing", async () => {
  const store = convoStore();
  renderWithProviders(<ChatPage bot={new BrowserBot("TOKEN")} />, { store });
  const usersBefore = store.getState().bot.users;
  const responseBefore = store.getState().bot.response;

  const file = new File(["not json"], "bad.json", {
    type: "application/json",
  });
  fireEvent.change(screen.getByTestId("import-chat-input"), {
    target: { files: [file] },
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 10));
  });

  expect(screen.getByTestId("chat-import-status").textContent).toContain(
    "Could not import chat: invalid file."
  );
  expect(store.getState().bot.users).toEqual(usersBefore);
  expect(store.getState().bot.response).toEqual(responseBefore);
});

test("import chat with a wrong-shape file shows an error and changes nothing", async () => {
  const store = convoStore();
  renderWithProviders(<ChatPage bot={new BrowserBot("TOKEN")} />, { store });
  const usersBefore = store.getState().bot.users;
  const responseBefore = store.getState().bot.response;

  const file = new File([JSON.stringify({ users: "nope" })], "bad.json", {
    type: "application/json",
  });
  fireEvent.change(screen.getByTestId("import-chat-input"), {
    target: { files: [file] },
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 10));
  });

  expect(screen.getByTestId("chat-import-status").textContent).toContain(
    "Could not import chat: invalid file."
  );
  expect(store.getState().bot.users).toEqual(usersBefore);
  expect(store.getState().bot.response).toEqual(responseBefore);
});

test("Import chat button opens the hidden file input", () => {
  const clickSpy = vi
    .spyOn(HTMLInputElement.prototype, "click")
    .mockImplementation(() => {});
  renderWithProviders(<ChatPage bot={new BrowserBot("TOKEN")} />, {
    store: convoStore(),
  });

  fireEvent.click(screen.getByRole("button", { name: "Import chat" }));

  expect(clickSpy).toHaveBeenCalledTimes(1);
});

test("Enter key in the composer triggers a simulated reply in Test User mode", () => {
  const store = welcomeFlowStore();
  renderWithProviders(<ChatPage bot={new BrowserBot("TOKEN")} />, { store });

  // Test User is auto-selected by default -> composer uses Simulate.
  const textbox = screen.getByRole("textbox");
  fireEvent.change(textbox, { target: { value: "/start" } });
  fireEvent.keyDown(textbox, { key: "Enter" });

  // The flow matched and produced replies in the feed.
  expect(screen.getByText("Welcome! I'm a browser bot 🤖")).toBeTruthy();
  expect(screen.getByText(/Matched flow: Welcome Flow/)).toBeTruthy();
});

test("non-Enter keys in the composer do not trigger a reply", () => {
  const store = welcomeFlowStore();
  renderWithProviders(<ChatPage bot={new BrowserBot("TOKEN")} />, { store });

  const textbox = screen.getByRole("textbox");
  fireEvent.change(textbox, { target: { value: "/start" } });
  fireEvent.keyDown(textbox, { key: "A" });

  // No simulate happened because the key is not Enter.
  expect(screen.queryByText(/Matched flow: Welcome Flow/)).toBeNull();
});

test("a flow that matches but produces no replies shows the silent note", () => {
  // start -> send node with no replies. The flow consumes the message and
  // runs to completion but yields [].
  const emptyFlow = (() => {
    const f = createFlow("Empty");
    const start = createFlowNode("start", { x: 0, y: 0 });
    const send = createFlowNode("send", { x: 120, y: 0 });
    send.data.replies = [];
    f.startNodeId = start.id;
    f.nodes = [start, send];
    f.edges = [{ id: "e1", source: start.id, target: send.id }];
    return f;
  })();
  const store = setupStore({
    bot: {
      token: "TOKEN",
      flows: [emptyFlow],
      response: [],
      users: [],
    },
  });
  renderWithProviders(<ChatPage bot={new BrowserBot("TOKEN")} />, { store });

  fireEvent.click(screen.getByRole("button", { name: /Test User/ }));

  const textbox = screen.getByRole("textbox");
  fireEvent.change(textbox, { target: { value: "hello" } });
  fireEvent.click(screen.getByRole("button", { name: "Simulate" }));

  // Matched-flow note + the "no reply" silent note.
  expect(screen.getByText(/Matched flow: Empty/)).toBeTruthy();
  expect(screen.getByText("The flow matched but produced no reply.")).toBeTruthy();
});
