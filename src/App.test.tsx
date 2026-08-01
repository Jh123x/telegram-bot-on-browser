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
  // Deterministic ids for the App snapshot: generateId falls back to
  // `${Date.now()}-${Math.random()}` in jsdom 16 (no crypto.randomUUID), so
  // pin both to a fixed seed + monotonic sequence. This keeps the seeded
  // flow's data-testid (flow-item-<id>) stable across runs.
  jest.spyOn(Date, "now").mockReturnValue(1700000000000);
  let seq = 0;
  jest.spyOn(Math, "random").mockImplementation(() => {
    seq += 1;
    return (seq * 0.123456789) % 1;
  });
});

afterEach(() => {
  localStorage.clear();
  jest.restoreAllMocks();
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
  // Hydration completed whether or not localStorage had values.
  expect(store.getState().bot.hydrated).toBe(true);
});

test("leaves the default state when localStorage is empty", () => {
  const store = setupStore(generateDefaultState());
  renderWithProviders(<App />, { store });

  expect(store.getState().bot.token).toBe("");
  expect(store.getState().bot.programs).toEqual([]);
  expect(store.getState().bot.autoStart).toBe(false);
  // Hydration completed even with no localStorage values.
  expect(store.getState().bot.hydrated).toBe(true);
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

  // The Flow editor replaced the old block-based Programs page and is the
  // default landing page.
  expect(screen.getByTestId("flow-editor")).toBeTruthy();

  fireEvent.click(screen.getByRole("tab", { name: "Chat" }));
  expect(screen.getByRole("heading", { name: "Chat" })).toBeTruthy();

  fireEvent.click(screen.getByRole("tab", { name: "Settings" }));
  expect(screen.getByPlaceholderText("Enter your API token")).toBeTruthy();

  fireEvent.click(screen.getByRole("tab", { name: "Docs" }));
  expect(screen.getByRole("heading", { name: "Docs" })).toBeTruthy();
  expect(screen.getAllByText("Getting Started").length).toBeGreaterThan(0);

  fireEvent.click(screen.getByRole("tab", { name: "Flow" }));
  expect(screen.getByTestId("flow-editor")).toBeTruthy();
});

test("seeds a Welcome sample flow on first visit so the graph is never empty", () => {
  const store = setupStore(generateDefaultState());
  renderWithProviders(<App />, { store });

  const flows = store.getState().bot.flows;
  expect(flows).toHaveLength(1);
  expect(flows[0].name).toBe("Welcome Flow");
  expect(flows[0].nodes.length).toBeGreaterThan(0);
  expect(flows[0].startNodeId).not.toBe("");
  // The starter flow shows up in the editor's flow rail.
  expect(screen.getByText("Welcome Flow", { selector: ".flow-name-display" })).toBeTruthy();
});

test("does not seed a sample when flows already exist", () => {
  localStorage.setItem(
    "flows",
    JSON.stringify([
      { id: "existing", name: "Existing Flow", startNodeId: "", nodes: [], edges: [] },
    ])
  );

  const store = setupStore(generateDefaultState());
  renderWithProviders(<App />, { store });

  const flows = store.getState().bot.flows;
  expect(flows).toHaveLength(1);
  expect(flows[0].name).toBe("Existing Flow");
});

test("seeds exactly one sample under StrictMode double-mount", () => {
  const store = setupStore(generateDefaultState());
  renderWithProviders(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
    { store }
  );

  expect(store.getState().bot.flows).toHaveLength(1);
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
