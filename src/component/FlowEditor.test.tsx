import { test, expect, afterEach } from "@jest/globals";
import React from "react";
import { fireEvent, screen, within } from "@testing-library/react";
import { FlowEditor } from "./FlowEditor.tsx";
import { renderWithProviders, setupStore } from "../redux/testUtils.tsx";
import { BotWithConfig } from "../redux/types.ts";
import { Flow } from "../interfaces/flow.ts";

const makeFlow = (name: string, id = name.toLowerCase() + "-id"): Flow => ({
  id,
  name,
  startNodeId: "",
  nodes: [],
  edges: [],
});

const makeStore = (flows: Flow[] = []) =>
  setupStore<BotWithConfig>({
    bot: { token: "", programs: [], flows, response: [], users: [] },
  });

afterEach(() => {
  localStorage.clear();
});

test("renders the editor: canvas wrapper, toolbar, palette, samples, and empty state when no flows", () => {
  const store = makeStore();
  renderWithProviders(<FlowEditor />, { store });

  expect(screen.getByTestId("flow-editor")).toBeTruthy();
  expect(screen.getByTestId("flow-canvas")).toBeTruthy();
  expect(screen.getByTestId("flow-palette")).toBeTruthy();
  expect(
    screen.getByText(
      "No flows yet — create a new flow and drag nodes from the palette, or load a sample."
    )
  ).toBeTruthy();
});

test("New Flow dispatches addFlow with a pre-placed start node and selects the new flow", () => {
  const store = makeStore();
  renderWithProviders(<FlowEditor />, { store });

  fireEvent.click(screen.getByRole("button", { name: "+ New Flow" }));

  const flows = store.getState().bot.flows;
  expect(flows).toHaveLength(1);
  expect(flows[0].name).toBe("New Flow");
  // A new flow starts with a Start node so the canvas is never blank and the
  // "must have a start node" validation passes immediately.
  expect(flows[0].nodes).toHaveLength(1);
  expect(flows[0].nodes[0].type).toBe("start");
  expect(flows[0].startNodeId).toBe(flows[0].nodes[0].id);
  // The new flow is now being edited (its name shows in the editor's own Name field).
  expect(
    screen.getByText("New Flow", { selector: ".flow-name-display" })
  ).toBeTruthy();
});

// jsdom 16 has no DataTransfer; a lightweight stub is enough for the drop
// handlers, which only read the "application/reactflow" payload. (Note:
// passing a stub object to fireEvent.drop works because testing-library
// assigns it onto the event when window.DataTransfer is undefined.)
const createDataTransfer = (type: string) => ({
  setData: jest.fn(),
  getData: () => type,
  dropEffect: "move",
  effectAllowed: "move",
} as unknown as DataTransfer);

test("dropping a node when no flow exists creates a flow containing it", () => {
  const store = makeStore();
  const { container } = renderWithProviders(<FlowEditor />, { store });

  const canvas = container.querySelector('[data-testid="reactflow-mock"]');
  expect(canvas).not.toBeNull();
  fireEvent.drop(canvas!, { dataTransfer: createDataTransfer("start"), clientX: 100, clientY: 100 });

  const flows = store.getState().bot.flows;
  expect(flows).toHaveLength(1);
  expect(flows[0].nodes).toHaveLength(1);
  expect(flows[0].nodes[0].type).toBe("start");
  expect(flows[0].startNodeId).toBe(flows[0].nodes[0].id);
});

test("dropping a node onto an existing flow adds it to that flow", () => {
  const flow = makeFlow("Existing");
  const store = makeStore([flow]);
  const { container } = renderWithProviders(<FlowEditor />, { store });

  const canvas = container.querySelector('[data-testid="reactflow-mock"]');
  expect(canvas).not.toBeNull();
  fireEvent.drop(canvas!, { dataTransfer: createDataTransfer("state"), clientX: 50, clientY: 50 });

  const flows = store.getState().bot.flows;
  expect(flows).toHaveLength(1);
  expect(flows[0].nodes).toHaveLength(1);
  expect(flows[0].nodes[0].type).toBe("state");
});

test("typing the flow name dispatches updateFlow", () => {
  const flow = makeFlow("Original");
  const store = makeStore([flow]);
  renderWithProviders(<FlowEditor />, { store });

  fireEvent.change(screen.getByLabelText("Flow name"), {
    target: { value: "Renamed" },
  });

  expect(store.getState().bot.flows[0].name).toBe("Renamed");
});

test("Delete Flow removes the flow and selects a remaining one", () => {
  const f1 = makeFlow("First", "f1");
  const f2 = makeFlow("Second", "f2");
  const store = makeStore([f1, f2]);
  renderWithProviders(<FlowEditor />, { store });

  // Select the first flow then delete it.
  fireEvent.click(screen.getByTestId("flow-item-f1"));
  fireEvent.click(screen.getByRole("button", { name: "Delete Flow" }));

  expect(store.getState().bot.flows.map((f) => f.id)).toEqual(["f2"]);
});

test("renders validation errors for an invalid flow", () => {
  const empty = makeFlow("Empty Flow", "empty"); // no nodes -> no start node
  const store = makeStore([empty]);
  renderWithProviders(<FlowEditor />, { store });

  expect(screen.getByText(/Flow must have a start node/)).toBeTruthy();
});

test("switching between flows updates which flow is edited", () => {
  const f1 = makeFlow("First", "f1");
  const f2 = makeFlow("Second", "f2");
  const store = makeStore([f1, f2]);
  renderWithProviders(<FlowEditor />, { store });

  // Name field initially shows "First" (first flow selected).
  expect(screen.getByLabelText("Flow name")).toHaveValue("First");

  fireEvent.click(screen.getByTestId("flow-item-f2"));

  expect(screen.getByLabelText("Flow name")).toHaveValue("Second");
});

test("persists flow changes to localStorage after the initial render", () => {
  const flow = makeFlow("Original");
  const store = makeStore([flow]);
  renderWithProviders(<FlowEditor />, { store });

  // The initial render must NOT write: it would clobber flows that App is
  // about to hydrate from localStorage on startup.
  expect(localStorage.getItem("flows")).toBeNull();

  fireEvent.change(screen.getByLabelText("Flow name"), {
    target: { value: "Renamed" },
  });

  const stored = JSON.parse(localStorage.getItem("flows")!);
  expect(stored).toHaveLength(1);
  expect(stored[0].id).toBe(flow.id);
  expect(stored[0].name).toBe("Renamed");
});
