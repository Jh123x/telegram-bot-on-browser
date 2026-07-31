import {
  generateDefaultState,
  renderWithProviders,
  setupStore,
} from "./redux/testUtils.tsx";
import App from "./App.tsx";
import { test, expect } from "@jest/globals";
import React from "react";
import { BrowserBot } from "./interfaces/bot";

// Test shim: BotOperation registers its stored commands via `bot.addCommand(...)`,
// but BrowserBot currently has no such method. This shim provides it so the App can
// render and the hydration behavior can be characterized.
(BrowserBot.prototype as any).addCommand = function (
  this: BrowserBot,
  command: string,
  callback: (message: string) => string | string[]
) {
  this.addRule((m) => m === command, callback);
};

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

test("renders app correctly", () => {
  const store = setupStore(generateDefaultState());
  const component = renderWithProviders(<App />, { store: store });
  expect(component).toMatchSnapshot();
});

test("hydrates store from localStorage token and commands on mount", () => {
  localStorage.setItem("token", "hydrated-token");
  localStorage.setItem(
    "commands",
    JSON.stringify([
      { command: "/start", response: "hi" },
      { command: "/bye", response: "bye" },
    ])
  );

  const store = setupStore(generateDefaultState());
  renderWithProviders(<App />, { store });

  expect(store.getState().bot.token).toBe("hydrated-token");
  expect(store.getState().bot.commands).toEqual([
    { command: "/start", response: "hi" },
    { command: "/bye", response: "bye" },
  ]);
});

test("leaves the default state when localStorage is empty", () => {
  const store = setupStore(generateDefaultState());
  renderWithProviders(<App />, { store });

  expect(store.getState().bot.token).toBe("");
  expect(store.getState().bot.commands).toEqual([]);
});

test("hydrates token when only token is stored (no commands key)", () => {
  localStorage.setItem("token", "only-token");

  const store = setupStore(generateDefaultState());
  renderWithProviders(<App />, { store });

  expect(store.getState().bot.token).toBe("only-token");
  expect(store.getState().bot.commands).toEqual([]);
});
