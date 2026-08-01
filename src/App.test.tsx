import {
  generateDefaultState,
  renderWithProviders,
  setupStore,
} from "./redux/testUtils.tsx";
import App from "./App.tsx";
import { test, expect } from "@jest/globals";
import React from "react";
import { fireEvent, screen } from "@testing-library/react";

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
  ]);
});

test("leaves the default state when localStorage is empty", () => {
  const store = setupStore(generateDefaultState());
  renderWithProviders(<App />, { store });

  expect(store.getState().bot.token).toBe("");
  expect(store.getState().bot.programs).toEqual([]);
  expect(store.getState().bot.autoStart).toBe(false);
});

test("hydrates token when only token is stored (no programs key)", () => {
  localStorage.setItem("token", "only-token");

  const store = setupStore(generateDefaultState());
  renderWithProviders(<App />, { store });

  expect(store.getState().bot.token).toBe("only-token");
  expect(store.getState().bot.programs).toEqual([]);
});

test("hydrates saved programs under StrictMode without clobbering localStorage", () => {
  const savedPrograms = [
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
  ];
  const saved = JSON.stringify(savedPrograms);
  localStorage.setItem("programs", saved);

  const store = setupStore(generateDefaultState());
  renderWithProviders(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
    { store }
  );

  // The editor's persistence effect must not overwrite saved programs with
  // an empty array during StrictMode's double mount, so App hydration
  // still sees them and the store is populated.
  expect(localStorage.getItem("programs")).toBe(saved);
  expect(store.getState().bot.programs).toEqual(savedPrograms);
});

test("switching tabs shows the right page", () => {
  const store = setupStore(generateDefaultState());
  renderWithProviders(<App />, { store });

  // Default page is Programs.
  expect(screen.getByText("Blocks")).toBeTruthy();

  fireEvent.click(screen.getByRole("tab", { name: "Chat" }));
  expect(screen.getByRole("heading", { name: "Chat" })).toBeTruthy();

  fireEvent.click(screen.getByRole("tab", { name: "Settings" }));
  expect(screen.getByPlaceholderText("Enter your API token")).toBeTruthy();

  fireEvent.click(screen.getByRole("tab", { name: "Docs" }));
  expect(screen.getByRole("heading", { name: "Docs" })).toBeTruthy();
  expect(screen.getAllByText("Getting Started").length).toBeGreaterThan(0);

  fireEvent.click(screen.getByRole("tab", { name: "Programs" }));
  expect(screen.getByText("Blocks")).toBeTruthy();
});

test("uses the full viewport as a flex column with a scrollable content area", () => {
  const store = setupStore(generateDefaultState());
  renderWithProviders(<App />, { store });

  const root = screen.getByTestId("app-root");
  expect(root).toHaveStyle({ display: "flex", flexDirection: "column" });
  expect(root).toHaveStyle({ height: "100%" });

  const content = screen.getByTestId("app-content");
  expect(content).toHaveStyle({ flexGrow: "1" });
  expect(content).toHaveStyle({ overflowY: "auto" });
});

test("hydrates autoStart from localStorage on mount", () => {
  localStorage.setItem("autoStart", "true");

  const store = setupStore(generateDefaultState());
  renderWithProviders(<App />, { store });

  expect(store.getState().bot.autoStart).toBe(true);
});
