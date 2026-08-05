import {
  generateDefaultState,
  renderWithProviders,
  setupStore,
} from "./redux/testUtils.tsx";
import App from "./App.tsx";
import { test, expect, vi } from "vitest";
import React from "react";
import { fireEvent, screen, waitFor } from "@testing-library/react";

// Warm up the code-split Flow editor chunk before the tests run. Its module
// graph (React Flow editor, palette, inspector, samples) takes ~4s to
// transform on first dynamic import; preloading once here makes every lazy
// `import()` in the tests resolve from the module cache in a microtask. The
// Suspense fallback still renders synchronously on first render, so the
// skeleton-fallback test remains valid.
await import("./pages/FlowsPage.tsx");

beforeEach(() => {
  localStorage.clear();
  // Deterministic ids for the App snapshot: generateId falls back to
  // `${Date.now()}-${Math.random()}` in jsdom 16 (no crypto.randomUUID), so
  // pin both to a fixed seed + monotonic sequence. This keeps the seeded
  // flow's data-testid (flow-item-<id>) stable across runs.
  vi.spyOn(Date, "now").mockReturnValue(1700000000000);
  let seq = 0;
  vi.spyOn(Math, "random").mockImplementation(() => {
    seq += 1;
    return (seq * 0.123456789) % 1;
  });
});

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

// Pages are code-split (React.lazy), so the real page DOM only appears once
// its chunk resolves. Tests that assert page content must await the lazy
// import; the shell (navbar/footer) is available synchronously.

test("renders app correctly", async () => {
  const store = setupStore(generateDefaultState());
  const component = renderWithProviders(<App />, { store });
  await screen.findByTestId("flow-editor");
  expect(component).toMatchSnapshot();
});

test("hydrates store from localStorage token on mount", () => {
  localStorage.setItem("token", "hydrated-token");

  const store = setupStore(generateDefaultState());
  renderWithProviders(<App />, { store });

  expect(store.getState().bot.token).toBe("hydrated-token");
  // Hydration completed whether or not localStorage had values.
  expect(store.getState().bot.hydrated).toBe(true);
});

test("leaves the default state when localStorage is empty", () => {
  const store = setupStore(generateDefaultState());
  renderWithProviders(<App />, { store });

  expect(store.getState().bot.token).toBe("");
  expect(store.getState().bot.autoStart).toBe(false);
  // Hydration completed even with no localStorage values.
  expect(store.getState().bot.hydrated).toBe(true);
});

test("hydrates token when only token is stored", () => {
  localStorage.setItem("token", "only-token");

  const store = setupStore(generateDefaultState());
  renderWithProviders(<App />, { store });

  expect(store.getState().bot.token).toBe("only-token");
});

test("renders the lazy-loaded page and removes the skeleton once the chunk arrives", async () => {
  const store = setupStore(generateDefaultState());
  renderWithProviders(<App />, { store });

  // The shell (navbar) paints immediately — it is part of the initial bundle.
  expect(screen.getByRole("tab", { name: "Flow" })).toBeTruthy();

  // Once the chunk arrives, the real page replaces the skeleton.
  expect(await screen.findByTestId("flow-editor")).toBeTruthy();
  expect(screen.queryByTestId("page-skeleton")).toBeNull();
});

test("switching tabs shows the right page", async () => {
  const store = setupStore(generateDefaultState());
  renderWithProviders(<App />, { store });

  // The Flow editor replaced the old block-based Programs page and is the
  // default landing page.
  expect(await screen.findByTestId("flow-editor")).toBeTruthy();

  fireEvent.click(screen.getByRole("tab", { name: "Chat" }));
  expect(await screen.findByRole("heading", { name: "Chat" })).toBeTruthy();

  fireEvent.click(screen.getByRole("tab", { name: "Settings" }));
  expect(
    await screen.findByPlaceholderText("Enter your API token")
  ).toBeTruthy();

  fireEvent.click(screen.getByRole("tab", { name: "Docs" }));
  expect(await screen.findByRole("heading", { name: "Docs" })).toBeTruthy();
  expect(screen.getAllByText("Getting Started").length).toBeGreaterThan(0);

  fireEvent.click(screen.getByRole("tab", { name: "Flow" }));
  expect(await screen.findByTestId("flow-editor")).toBeTruthy();
});

test("seeds a Dice Bot sample flow on first visit so the graph is never empty", async () => {
  const store = setupStore(generateDefaultState());
  renderWithProviders(<App />, { store });

  // The sample is fetched lazily on a true first visit.
  await waitFor(() => expect(store.getState().bot.flows).toHaveLength(1));
  const flows = store.getState().bot.flows;
  expect(flows[0].name).toBe("Dice Bot");
  expect(flows[0].nodes.length).toBeGreaterThan(0);
  expect(flows[0].startNodeId).not.toBe("");
  // The single flow is edited directly on the canvas — no rail, no name field.
  expect(await screen.findByTestId("flow-canvas-stage")).toBeTruthy();
  expect(screen.queryByLabelText("Flow name")).toBeNull();
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

test("does not re-seed after all flows were deleted (empty array persisted)", () => {
  // The user deliberately emptied their flows: the localStorage key exists
  // with an empty array. The graph should stay truly empty — no resurrection.
  localStorage.setItem("flows", "[]");

  const store = setupStore(generateDefaultState());
  renderWithProviders(<App />, { store });

  expect(store.getState().bot.flows).toEqual([]);
});

test("seeds exactly one sample under StrictMode double-mount", async () => {
  const store = setupStore(generateDefaultState());
  renderWithProviders(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
    { store }
  );

  await waitFor(() => expect(store.getState().bot.flows).toHaveLength(1));
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

test("hydrates pollRate from localStorage on mount", () => {
  localStorage.setItem("pollRate", "2");

  const store = setupStore(generateDefaultState());
  renderWithProviders(<App />, { store });

  expect(store.getState().bot.pollRate).toBe(2);
});

test("ignores a corrupt pollRate in localStorage and keeps the default", () => {
  localStorage.setItem("pollRate", "not-a-number");

  const store = setupStore(generateDefaultState());
  renderWithProviders(<App />, { store });

  expect(store.getState().bot.pollRate).toBe(5);
});

test("ignores a non-positive pollRate in localStorage and keeps the default", () => {
  localStorage.setItem("pollRate", "0");

  const store = setupStore(generateDefaultState());
  renderWithProviders(<App />, { store });

  expect(store.getState().bot.pollRate).toBe(5);
});

test("does not crash and keeps flows empty when flows JSON is corrupt", () => {
  localStorage.setItem("flows", "{bad json");

  const store = setupStore(generateDefaultState());
  renderWithProviders(<App />, { store });

  // The app renders (no startup crash) and flows stay at the default empty.
  expect(screen.getByTestId("app-root")).toBeTruthy();
  expect(store.getState().bot.flows).toEqual([]);
});

test("does not crash and does not seed when flows JSON is valid but the wrong shape", () => {
  // Valid JSON, but not an array of flows (e.g. a plain object).
  localStorage.setItem("flows", "{}");

  const store = setupStore(generateDefaultState());
  renderWithProviders(<App />, { store });

  // No crash; flows stay empty.
  expect(screen.getByTestId("app-root")).toBeTruthy();
  expect(store.getState().bot.flows).toEqual([]);
});

test("does not seed a sample when flows key exists with invalid shape", () => {
  // The key exists (so the user is not a true first-time visitor) but holds
  // invalid content: the app must not crash AND must not re-seed a sample.
  localStorage.setItem("flows", "{bad json");

  const store = setupStore(generateDefaultState());
  renderWithProviders(<App />, { store });

  expect(store.getState().bot.flows).toEqual([]);
});
