import {
  generateDefaultState,
  renderWithProviders,
  setupStore,
} from "./redux/testUtils.tsx";
import App from "./App.tsx";
import { test, expect } from "@jest/globals";
import React from "react";

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

test("hydrates store from localStorage token and programs on mount", () => {
  localStorage.setItem("token", "hydrated-token");
  localStorage.setItem(
    "programs",
    JSON.stringify([
      {
        id: "p1",
        name: "Greet",
        trigger: { type: "equals", value: "/start" },
        actions: [{ id: "a1", type: "reply", value: "hi" }],
      },
    ])
  );

  const store = setupStore(generateDefaultState());
  renderWithProviders(<App />, { store });

  expect(store.getState().bot.token).toBe("hydrated-token");
  expect(store.getState().bot.programs).toEqual([
    {
      id: "p1",
      name: "Greet",
      trigger: { type: "equals", value: "/start" },
      actions: [{ id: "a1", type: "reply", value: "hi" }],
    },
  ]);
});

test("leaves the default state when localStorage is empty", () => {
  const store = setupStore(generateDefaultState());
  renderWithProviders(<App />, { store });

  expect(store.getState().bot.token).toBe("");
  expect(store.getState().bot.programs).toEqual([]);
});

test("hydrates token when only token is stored (no programs key)", () => {
  localStorage.setItem("token", "only-token");

  const store = setupStore(generateDefaultState());
  renderWithProviders(<App />, { store });

  expect(store.getState().bot.token).toBe("only-token");
  expect(store.getState().bot.programs).toEqual([]);
});
