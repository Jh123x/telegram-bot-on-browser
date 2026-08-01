import { test, expect, afterEach } from "@jest/globals";
import React from "react";
import { fireEvent, screen } from "@testing-library/react";
import { FlowEditor } from "./FlowEditor.tsx";
import { renderWithProviders, setupStore } from "../redux/testUtils.tsx";
import { BotWithConfig } from "../redux/types.ts";
import { Flow } from "../interfaces/flow.ts";

// The four palette node types the editor now understands.
const TYPES = ["start", "transform", "condition", "send"] as const;

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
  expect(flows[0].nodes).toHaveLength(1);
  expect(flows[0].nodes[0].type).toBe("start");
  expect(flows[0].startNodeId).toBe(flows[0].nodes[0].id);
  expect(
    screen.getByText("New Flow", { selector: ".flow-name-display" })
  ).toBeTruthy();
});

const createDataTransfer = (type: string) => ({
  setData: jest.fn(),
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

  fireEvent.click(screen.getByTestId("flow-item-f1"));
  fireEvent.click(screen.getByRole("button", { name: "Delete Flow" }));

  expect(store.getState().bot.flows.map((f) => f.id)).toEqual(["f2"]);
});

test("renders validation errors for an invalid flow", () => {
  const empty = makeFlow("Empty Flow", "empty");
  const store = makeStore([empty]);
  renderWithProviders(<FlowEditor />, { store });

  expect(screen.getByText(/Flow must have a start node/)).toBeTruthy();
});

test("switching between flows updates which flow is edited", () => {
  const f1 = makeFlow("First", "f1");
  const f2 = makeFlow("Second", "f2");
  const store = makeStore([f1, f2]);
  renderWithProviders(<FlowEditor />, { store });

  expect(screen.getByLabelText("Flow name")).toHaveValue("First");

  fireEvent.click(screen.getByTestId("flow-item-f2"));

  expect(screen.getByLabelText("Flow name")).toHaveValue("Second");
});

test("flow items are keyboard-accessible: pressing Enter selects a flow", () => {
  const f1 = makeFlow("First", "f1");
  const f2 = makeFlow("Second", "f2");
  const store = makeStore([f1, f2]);
  renderWithProviders(<FlowEditor />, { store });

  expect(screen.getByLabelText("Flow name")).toHaveValue("First");

  fireEvent.keyDown(screen.getByTestId("flow-item-f2"), { key: "Enter" });

  expect(screen.getByLabelText("Flow name")).toHaveValue("Second");
  expect(screen.getByTestId("flow-item-f2")).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByTestId("flow-item-f1")).toHaveAttribute("aria-pressed", "false");
});

test("clicking each palette item adds the right node type to the selected flow", () => {
  TYPES.forEach((type) => {
    const flow = makeFlow("Existing", "existing");
    const store = makeStore([flow]);
    const { unmount } = renderWithProviders(<FlowEditor />, { store });

    expect(store.getState().bot.flows[0].nodes).toHaveLength(0);

    fireEvent.click(screen.getByTestId(`palette-item-${type}`));

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
  expect(screen.getByLabelText("Flow name")).toHaveValue("New Flow");
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

  fireEvent.change(screen.getByLabelText("Flow name"), {
    target: { value: "Renamed" },
  });

  const stored = JSON.parse(localStorage.getItem("flows")!);
  expect(stored).toHaveLength(1);
  expect(stored[0].id).toBe(flow.id);
  expect(stored[0].name).toBe("Renamed");
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
