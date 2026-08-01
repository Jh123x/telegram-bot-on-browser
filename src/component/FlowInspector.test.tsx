import { test, expect } from "@jest/globals";
import React from "react";
import { fireEvent, screen } from "@testing-library/react";
import { FlowInspector } from "./FlowInspector.tsx";
import { renderWithProviders } from "../redux/testUtils.tsx";
import { Flow } from "../interfaces/flow.ts";

const makeFlow = (overrides: Partial<Flow> = {}): Flow => ({
  id: "f1",
  name: "Flow",
  startNodeId: "start",
  nodes: [
    {
      id: "start",
      type: "start",
      position: { x: 0, y: 0 },
      data: { label: "Start" },
    },
    {
      id: "transform1",
      type: "transform",
      position: { x: 120, y: 0 },
      data: {
        label: "Upper",
        transform: { type: "uppercase", find: "", replacement: "", pattern: "" },
      },
    },
    {
      id: "condition1",
      type: "condition",
      position: { x: 240, y: 0 },
      data: { label: "Has hi", trigger: { type: "contains", value: "hi" } },
    },
    {
      id: "send1",
      type: "send",
      position: { x: 360, y: 0 },
      data: { label: "Hello", replies: ["Hi there", "Welcome"] },
    },
  ],
  edges: [
    { id: "e_if", source: "condition1", target: "send1", sourceHandle: "if" },
    { id: "e_else", source: "condition1", target: "start", sourceHandle: "else" },
    { id: "e_plain", source: "start", target: "transform1" },
  ],
  ...overrides,
});

const renderInspector = (
  flow: Flow,
  selectedNodeId: string | null,
  selectedEdgeId: string | null,
  onUpdate = () => {}
) =>
  renderWithProviders(
    <FlowInspector
      flow={flow}
      selectedNodeId={selectedNodeId}
      selectedEdgeId={selectedEdgeId}
      onUpdate={onUpdate}
    />
  );

test("shows a hint when nothing is selected", () => {
  renderInspector(makeFlow(), null, null);
  expect(screen.getByText("Select a node or edge to edit it.")).toBeTruthy();
});

// ----- Start node -----

test("start panel shows only the label field and no replies/edit fields", () => {
  renderInspector(makeFlow(), "start", null);
  expect(screen.getByText("Start Node")).toBeTruthy();
  expect(screen.getByLabelText("Node label")).toBeTruthy();
  expect(screen.queryByLabelText(/replies/i)).toBeNull();
  expect(screen.queryByLabelText(/transform type/i)).toBeNull();
  expect(screen.queryByLabelText(/trigger type/i)).toBeNull();
});

test("editing the start label dispatches onUpdate", () => {
  const onUpdate = jest.fn();
  renderInspector(makeFlow(), "start", null, onUpdate);

  fireEvent.change(screen.getByLabelText("Node label"), {
    target: { value: "Renamed" },
  });

  expect(onUpdate).toHaveBeenCalledWith(
    expect.objectContaining({
      nodes: expect.arrayContaining([
        expect.objectContaining({
          id: "start",
          data: expect.objectContaining({ label: "Renamed" }),
        }),
      ]),
    })
  );
});

// ----- Transform node -----

test("transform panel shows the label and transform type select", () => {
  renderInspector(makeFlow(), "transform1", null);
  expect(screen.getByText("Transform Node")).toBeTruthy();
  expect(screen.getByLabelText("Node label")).toBeTruthy();
  // Default transform type for the fixture is uppercase, which is selected.
  expect(screen.getByLabelText("Transform type")).toBeTruthy();
});

test("selecting a replace transform reveals Find and Replacement fields", async () => {
  const Harness = () => {
    const [flow, setFlow] = React.useState(makeFlow());
    return (
      <FlowInspector
        flow={flow}
        selectedNodeId="transform1"
        selectedEdgeId={null}
        onUpdate={setFlow}
      />
    );
  };
  renderWithProviders(<Harness />);

  fireEvent.mouseDown(screen.getByRole("combobox"));
  fireEvent.click(await screen.findByRole("option", { name: "replace text" }));

  expect(screen.getByLabelText("Find")).toBeTruthy();
  expect(screen.getByLabelText("Replacement")).toBeTruthy();
  expect(screen.queryByLabelText("Pattern")).toBeNull();
});

test("selecting extract regex reveals the Pattern field", async () => {
  const Harness = () => {
    const [flow, setFlow] = React.useState(makeFlow());
    return (
      <FlowInspector
        flow={flow}
        selectedNodeId="transform1"
        selectedEdgeId={null}
        onUpdate={setFlow}
      />
    );
  };
  renderWithProviders(<Harness />);

  fireEvent.mouseDown(screen.getByRole("combobox"));
  fireEvent.click(await screen.findByRole("option", { name: "extract regex" }));

  expect(screen.getByLabelText("Pattern")).toBeTruthy();
  expect(screen.queryByLabelText("Find")).toBeNull();
  expect(screen.queryByLabelText("Replacement")).toBeNull();
});

test("typing in a replace Find field dispatches onUpdate with the transform data", async () => {
  const flow = makeFlow({
    nodes: [
      {
        id: "transform1",
        type: "transform",
        position: { x: 120, y: 0 },
        data: {
          label: "Swap",
          transform: { type: "replace", find: "a", replacement: "b" },
        },
      },
    ],
  });
  const onUpdate = jest.fn();
  renderInspector(flow, "transform1", null, onUpdate);

  fireEvent.change(screen.getByLabelText("Find"), {
    target: { value: "x" },
  });

  expect(onUpdate).toHaveBeenCalledWith(
    expect.objectContaining({
      nodes: expect.arrayContaining([
        expect.objectContaining({
          id: "transform1",
          data: expect.objectContaining({
            transform: expect.objectContaining({
              type: "replace",
              find: "x",
              replacement: "b",
            }),
          }),
        }),
      ]),
    })
  );
});

// ----- Condition node -----

test("condition panel shows label, trigger type select, and trigger value field", () => {
  renderInspector(makeFlow(), "condition1", null);
  expect(screen.getByText("Condition Node")).toBeTruthy();
  expect(screen.getByLabelText("Trigger type")).toBeTruthy();
  expect(screen.getByLabelText("Trigger value")).toBeTruthy();
});

test("editing the condition trigger value dispatches onUpdate", () => {
  const onUpdate = jest.fn();
  renderInspector(makeFlow(), "condition1", null, onUpdate);

  fireEvent.change(screen.getByLabelText("Trigger value"), {
    target: { value: "hello" },
  });

  expect(onUpdate).toHaveBeenCalledWith(
    expect.objectContaining({
      nodes: expect.arrayContaining([
        expect.objectContaining({
          id: "condition1",
          data: expect.objectContaining({
            trigger: expect.objectContaining({ type: "contains", value: "hello" }),
          }),
        }),
      ]),
    })
  );
});

test("condition panel has no fallback trigger option", async () => {
  renderInspector(makeFlow(), "condition1", null);

  fireEvent.mouseDown(screen.getByRole("combobox"));
  // The trigger select is the trigger-type select (first combobox).
  const options = await screen.findAllByRole("option");
  const labels = options.map((o) => o.textContent);
  expect(labels).not.toContain("any other message");
  expect(labels).toContain("message contains");
});

// ----- Send node -----

test("send panel shows the label and replies multiline", () => {
  renderInspector(makeFlow(), "send1", null);
  expect(screen.getByText("Send Node")).toBeTruthy();
  expect(screen.getByLabelText("Replies (one per line)")).toBeTruthy();
});

test("editing replies splits the textarea on newlines", () => {
  const onUpdate = jest.fn();
  renderInspector(makeFlow(), "send1", null, onUpdate);

  fireEvent.change(screen.getByLabelText("Replies (one per line)"), {
    target: { value: "First\nSecond\nThird" },
  });

  expect(onUpdate).toHaveBeenCalledWith(
    expect.objectContaining({
      nodes: expect.arrayContaining([
        expect.objectContaining({
          id: "send1",
          data: expect.objectContaining({ replies: ["First", "Second", "Third"] }),
        }),
      ]),
    })
  );
});

// ----- Edge panel (read-only) -----

test("edge panel shows the read-only If branch caption", () => {
  renderInspector(makeFlow(), null, "e_if");
  expect(screen.getByText("Edge")).toBeTruthy();
  expect(screen.getByText("If branch (condition true)")).toBeTruthy();
  expect(screen.queryByLabelText(/trigger/i)).toBeNull();
  expect(screen.queryByRole("combobox")).toBeNull();
});

test("edge panel shows the read-only Else branch caption", () => {
  renderInspector(makeFlow(), null, "e_else");
  expect(screen.getByText("Else branch (condition false)")).toBeTruthy();
});

test("edge panel shows the generic Connection caption for plain edges", () => {
  renderInspector(makeFlow(), null, "e_plain");
  expect(screen.getByText("Connection")).toBeTruthy();
});

// ----- Auto-scroll -----

test("scrolls the panel into view when a node is selected", () => {
  const scrollSpy = jest.fn();
  Element.prototype.scrollIntoView = scrollSpy;
  const { rerender } = renderInspector(makeFlow(), null, null);

  expect(scrollSpy).not.toHaveBeenCalled();

  rerender(
    <FlowInspector
      flow={makeFlow()}
      selectedNodeId="condition1"
      selectedEdgeId={null}
      onUpdate={() => {}}
    />
  );

  expect(scrollSpy).toHaveBeenCalledTimes(1);
});

test("does not scroll the panel when selection is cleared", () => {
  const scrollSpy = jest.fn();
  Element.prototype.scrollIntoView = scrollSpy;
  const { rerender } = renderInspector(makeFlow(), "condition1", null);

  expect(scrollSpy).toHaveBeenCalledTimes(1);

  rerender(
    <FlowInspector
      flow={makeFlow()}
      selectedNodeId={null}
      selectedEdgeId={null}
      onUpdate={() => {}}
    />
  );

  expect(scrollSpy).toHaveBeenCalledTimes(1);
});
