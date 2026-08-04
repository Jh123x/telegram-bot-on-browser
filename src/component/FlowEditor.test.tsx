import { test, expect, afterEach, vi } from "vitest";
import React from "react";
import { fireEvent, screen } from "@testing-library/react";
import { FlowEditor } from "./FlowEditor.tsx";
import { renderWithProviders, setupStore } from "../redux/testUtils.tsx";
import { BotWithConfig } from "../redux/types.ts";
import { Flow } from "../interfaces/flow.ts";

// Node types the editor now understands, one per category (the palette shows
// every node type at once in a flat, grouped list).
const TYPES = ["start", "lowercase", "equals", "send", "poll"] as const;

// The palette shows every node type at once (flat, grouped list), so an item
// is clicked directly — no category selection step is needed.
const openPaletteItem = (type: string) => {
  fireEvent.click(screen.getByTestId(`palette-item-${type}`));
};

const makeFlow = (name: string, id = name.toLowerCase() + "-id"): Flow => ({
  id,
  name,
  startNodeId: "",
  nodes: [],
  edges: [],
});

const makeStore = (flows: Flow[] = []) =>
  setupStore<BotWithConfig>({
    bot: { token: "", flows, response: [], users: [] },
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
      "No flow yet — add a node from the palette or load a sample."
    )
  ).toBeTruthy();
});

test("does not render flow management controls (single-flow app)", () => {
  const store = makeStore([makeFlow("Existing")]);
  renderWithProviders(<FlowEditor />, { store });

  // No "+ New Flow", no "Delete Flow", no rename field, no flow rail.
  expect(screen.queryByRole("button", { name: "+ New Flow" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Delete Flow" })).toBeNull();
  expect(screen.queryByLabelText("Flow name")).toBeNull();
  expect(screen.queryByTestId("flow-name-display")).toBeNull();
  expect(screen.queryByTestId(/flow-item-/)).toBeNull();
});

const createDataTransfer = (type: string) => ({
  setData: vi.fn(),
  getData: () => type,
  dropEffect: "move",
  effectAllowed: "move",
} as unknown as DataTransfer);

test("dropping each node type when no flow exists creates a flow containing it", () => {
  TYPES.forEach((type) => {
    const store = makeStore();
    const { container, unmount } = renderWithProviders(<FlowEditor />, {
      store,
    });

    const canvas = container.querySelector('[data-testid="reactflow-mock"]');
    expect(canvas).not.toBeNull();
    fireEvent.drop(canvas!, {
      dataTransfer: createDataTransfer(type),
      clientX: 100,
      clientY: 100,
    });

    const flows = store.getState().bot.flows;
    expect(flows).toHaveLength(1);
    expect(flows[0].nodes).toHaveLength(1);
    expect(flows[0].nodes[0].type).toBe(type);
    if (type === "start") {
      expect(flows[0].startNodeId).toBe(flows[0].nodes[0].id);
    }
    unmount();
  });
});

test("dropping a node onto an existing flow adds it to that flow", () => {
  const flow = makeFlow("Existing");
  const store = makeStore([flow]);
  const { container } = renderWithProviders(<FlowEditor />, { store });

  const canvas = container.querySelector('[data-testid="reactflow-mock"]');
  expect(canvas).not.toBeNull();
  fireEvent.drop(canvas!, {
    dataTransfer: createDataTransfer("send"),
    clientX: 50,
    clientY: 50,
  });

  const flows = store.getState().bot.flows;
  expect(flows).toHaveLength(1);
  expect(flows[0].nodes).toHaveLength(1);
  expect(flows[0].nodes[0].type).toBe("send");
});

test("renders validation errors for an invalid flow", () => {
  const empty = makeFlow("Empty Flow", "empty");
  const store = makeStore([empty]);
  renderWithProviders(<FlowEditor />, { store });

  expect(screen.getByText(/Flow must have a start node/)).toBeTruthy();
});

test("loading a sample replaces the current flow (never appends)", () => {
  const flow = makeFlow("Existing", "existing");
  const store = makeStore([flow]);
  renderWithProviders(<FlowEditor />, { store });

  fireEvent.click(screen.getByTestId("flow-sample-Dice Bot"));

  const flows = store.getState().bot.flows;
  expect(flows).toHaveLength(1);
  expect(flows[0].name).toBe("Dice Bot");
  expect(flows[0].id).not.toBe("existing");
  expect(flows[0].nodes.length).toBeGreaterThan(0);
});

test("loading a sample when no flow exists creates the single flow", () => {
  const store = makeStore();
  renderWithProviders(<FlowEditor />, { store });

  fireEvent.click(screen.getByTestId("flow-sample-Dice Bot"));

  const flows = store.getState().bot.flows;
  expect(flows).toHaveLength(1);
  expect(flows[0].name).toBe("Dice Bot");
});

test("clicking each palette item adds the right node type to the selected flow", () => {
  TYPES.forEach((type) => {
    const flow = makeFlow("Existing", "existing");
    const store = makeStore([flow]);
    const { unmount } = renderWithProviders(<FlowEditor />, { store });

    expect(store.getState().bot.flows[0].nodes).toHaveLength(0);

    openPaletteItem(type);

    const nodes = store.getState().bot.flows[0].nodes;
    expect(nodes).toHaveLength(1);
    expect(nodes[0].type).toBe(type);
    expect(nodes[0].position).toEqual({ x: 120, y: 80 });
    unmount();
  });
});

test("clicking a palette item with no flow creates a flow containing the node", () => {
  const store = makeStore();
  renderWithProviders(<FlowEditor />, { store });

  fireEvent.click(screen.getByTestId("palette-item-send"));

  const storeFlows = store.getState().bot.flows;
  expect(storeFlows).toHaveLength(1);
  expect(storeFlows[0].nodes).toHaveLength(1);
  expect(storeFlows[0].nodes[0].type).toBe("send");
  expect(storeFlows[0].startNodeId).toBe("");
  expect(storeFlows[0].nodes[0].position).toEqual({ x: 120, y: 80 });
});

test("clicking a palette start item with no flow sets the start node", () => {
  const store = makeStore();
  renderWithProviders(<FlowEditor />, { store });

  fireEvent.click(screen.getByTestId("palette-item-start"));

  const storeFlows = store.getState().bot.flows;
  expect(storeFlows).toHaveLength(1);
  expect(storeFlows[0].nodes[0].type).toBe("start");
  expect(storeFlows[0].startNodeId).toBe(storeFlows[0].nodes[0].id);
});

test("picking a node from the palette selects it in the inspector", () => {
  const flow = makeFlow("Existing");
  const store = makeStore([flow]);
  renderWithProviders(<FlowEditor />, { store });

  openPaletteItem("lowercase");

  // The inspector's label field shows the freshly added node's default label,
  // proving the pick auto-selected it.
  expect(screen.getByDisplayValue("Lowercase")).toBeTruthy();
});

test("picking another node from the palette switches the inspector to it", () => {
  const flow = makeFlow("Existing");
  const store = makeStore([flow]);
  renderWithProviders(<FlowEditor />, { store });

  openPaletteItem("lowercase");
  expect(screen.getByDisplayValue("Lowercase")).toBeTruthy();

  openPaletteItem("send");
  expect(screen.getByDisplayValue("New Send")).toBeTruthy();
});

// NOTE: We cannot exercise onConnect directly from a test. The setupTests
// @xyflow/react mock forwards handler props onto a plain <div>, but React
// ignores unknown `on*` props on host elements ("Unknown event handler
// property `onConnect`. It will be ignored."), so the handler never lands on
// the node. onConnect's sourceHandle capture is therefore covered implicitly
// by the non-exhaustive-satisfies editor wiring and the flow inspector/editor
// integration validated by the full suite; to test it directly the setupTests
// mock would need to expose the handler another way (out of scope here).

test("persists flow changes to localStorage after the initial render", () => {
  const flow = makeFlow("Original");
  const store = makeStore([flow]);
  renderWithProviders(<FlowEditor />, { store });

  expect(localStorage.getItem("flows")).toBeNull();

  fireEvent.click(screen.getByTestId("palette-item-lowercase"));

  const stored = JSON.parse(localStorage.getItem("flows")!);
  expect(stored).toHaveLength(1);
  expect(stored[0].id).toBe(flow.id);
  expect(stored[0].nodes).toHaveLength(1);
  expect(stored[0].nodes[0].type).toBe("lowercase");
});

test("renders the inspector as a side panel beside the graph canvas", () => {
  const flow = makeFlow("Existing");
  const store = makeStore([flow]);
  const { container } = renderWithProviders(<FlowEditor />, { store });

  const canvas = screen.getByTestId("flow-canvas");
  const panel = screen.getByTestId("flow-inspector-panel");
  const mock = container.querySelector('[data-testid="reactflow-mock"]');

  expect(canvas).toBeTruthy();
  expect(panel).toBeTruthy();
  expect(mock).not.toBeNull();
  // The inspector is a separate side panel, not a sibling of the canvas
  // viewport (i.e. it sits beside the graph, not below it).
  expect(panel.parentElement).not.toBe(mock!.parentElement);
});

test("dragOver sets the drop effect to move on the canvas", () => {
  const store = makeStore([makeFlow("Existing")]);
  const { container } = renderWithProviders(<FlowEditor />, { store });

  const canvas = container.querySelector('[data-testid="reactflow-mock"]');
  expect(canvas).not.toBeNull();

  const dataTransfer = { dropEffect: "", setData: vi.fn() };
  fireEvent.dragOver(canvas!, { dataTransfer });
  expect(dataTransfer.dropEffect).toBe("move");
});

test("dropping an unknown node type adds no node", () => {
  const flow = makeFlow("Existing");
  const store = makeStore([flow]);
  const { container } = renderWithProviders(<FlowEditor />, { store });

  const canvas = container.querySelector('[data-testid="reactflow-mock"]');
  expect(canvas).not.toBeNull();
  fireEvent.drop(canvas!, {
    dataTransfer: createDataTransfer("bogus"),
    clientX: 100,
    clientY: 100,
  });

  expect(store.getState().bot.flows[0].nodes).toHaveLength(0);
});

test("dropping a node when an empty flow placeholder is shown creates the flow", () => {
  // A flow with id "" is the EmptyFlow placeholder. Dropping a node onto it
  // must create a real flow containing that node via addFlow.
  const store = makeStore([{ id: "", name: "", startNodeId: "", nodes: [], edges: [] }]);
  const { container } = renderWithProviders(<FlowEditor />, { store });

  const canvas = container.querySelector('[data-testid="reactflow-mock"]');
  expect(canvas).not.toBeNull();
  fireEvent.drop(canvas!, {
    dataTransfer: createDataTransfer("send"),
    clientX: 60,
    clientY: 60,
  });

  const flows = store.getState().bot.flows;
  // addFlow appends the created flow next to the placeholder.
  expect(flows).toHaveLength(2);
  const created = flows[1];
  expect(created.id).not.toBe("");
  expect(created.nodes).toHaveLength(1);
  expect(created.nodes[0].type).toBe("send");
});
